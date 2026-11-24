import { kafka, getKafkaProducer, TOPICS, type WebhookEnvelope } from '../lib/kafka.js';
import { signPayload } from '../lib/crypto.js';
import prisma from '../lib/db.js';
import type { DeliveryLogRecord, DlqRecord } from '../lib/types.js';

// Cache endpoints in-memory for 5 seconds to reduce DB pressure during bursts
const endpointCache = new Map<string, { url: string; secret: string; isActive: boolean; cachedAt: number }>();

async function getCachedEndpoint(endpointId: string) {
  const now = Date.now();
  const cached = endpointCache.get(endpointId);
  if (cached && now - cached.cachedAt < 5000) {
    return cached;
  }

  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    select: { url: true, secret: true, isActive: true },
  });

  if (endpoint) {
    endpointCache.set(endpointId, { ...endpoint, cachedAt: now });
  }
  return endpoint;
}

export async function processWebhookDelivery(
  envelope: WebhookEnvelope,
  currentTopic: string
) {
  const now = new Date().toISOString();

  // If coming from a retry topic, respect the tiered delay window
  if (currentTopic === TOPICS.RETRY_1S || currentTopic === TOPICS.RETRY_3S) {
    const requiredDelay = currentTopic === TOPICS.RETRY_1S ? 1000 : 3000;
    if (envelope.lastAttemptAt) {
      const elapsed = Date.now() - new Date(envelope.lastAttemptAt).getTime();
      const remaining = requiredDelay - elapsed;
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, remaining));
      }
    }
  }

  const producer = await getKafkaProducer();
  const endpoint = await getCachedEndpoint(envelope.endpointId);

  if (!endpoint || !endpoint.isActive) {
    const errorReason = !endpoint ? 'Endpoint not found' : 'Endpoint is inactive';
    console.warn(`[Worker] ${envelope.eventId} skipped: ${errorReason}`);

    // Emit terminal failure log and DLQ entry
    const dlqLog: DeliveryLogRecord = {
      eventId: envelope.eventId,
      endpointId: envelope.endpointId,
      eventType: envelope.eventType,
      sourceOrigin: envelope.sourceOrigin || 'internal-service',
      payload: envelope.payload,
      status: 'DLQ',
      httpStatus: null,
      latencyMs: 0,
      attempt: envelope.attempt,
      createdAt: now,
      errorReason,
    };

    const dlqRecord: DlqRecord = {
      eventId: envelope.eventId,
      endpointId: envelope.endpointId,
      eventType: envelope.eventType,
      sourceOrigin: envelope.sourceOrigin || 'internal-service',
      payload: envelope.payload,
      errorReason,
      createdAt: now,
    };

    await producer.sendBatch({
      topicMessages: [
        { topic: TOPICS.LOGS, messages: [{ key: envelope.endpointId, value: JSON.stringify(dlqLog) }] },
        { topic: TOPICS.DLQ, messages: [{ key: envelope.endpointId, value: JSON.stringify(dlqRecord) }] },
      ],
    });
    return;
  }

  const signature = signPayload(envelope.payload, endpoint.secret);
  const startTime = performance.now();
  let httpStatus: number | null = null;
  let errorReason: string | undefined;
  let isSuccess = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Id': envelope.eventId,
        'X-Webhook-Signature': signature,
        'User-Agent': 'WebhookEngine-Worker/1.0',
      },
      body: JSON.stringify(envelope.payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    httpStatus = response.status;
    isSuccess = response.ok;

    if (!isSuccess) {
      errorReason = `HTTP ${response.status} ${response.statusText}`;
    }
  } catch (err: any) {
    isSuccess = false;
    errorReason = err.name === 'AbortError' ? 'HTTP request timed out after 5000ms' : err.message;
  }

  const latencyMs = Math.round(performance.now() - startTime);
  const attemptTime = new Date().toISOString();

  if (isSuccess) {
    console.log(`[Worker] ${envelope.eventId} -> ${endpoint.url} SUCCESS (${httpStatus}, ${latencyMs}ms)`);
    const successLog: DeliveryLogRecord = {
      eventId: envelope.eventId,
      endpointId: envelope.endpointId,
      eventType: envelope.eventType,
      sourceOrigin: envelope.sourceOrigin || 'internal-service',
      payload: envelope.payload,
      status: 'SUCCESS',
      httpStatus,
      latencyMs,
      attempt: envelope.attempt,
      createdAt: attemptTime,
    };

    await producer.send({
      topic: TOPICS.LOGS,
      messages: [{ key: envelope.endpointId, value: JSON.stringify(successLog) }],
    });
  } else {
    // Delivery failed
    console.warn(`[Worker] ${envelope.eventId} attempt ${envelope.attempt}/3 FAILED: ${errorReason} (${latencyMs}ms)`);

    if (envelope.attempt < 3) {
      // Non-blocking retry: route to tiered delay topic
      const nextAttempt = envelope.attempt + 1;
      const nextTopic = envelope.attempt === 1 ? TOPICS.RETRY_1S : TOPICS.RETRY_3S;

      const failedLog: DeliveryLogRecord = {
        eventId: envelope.eventId,
        endpointId: envelope.endpointId,
        eventType: envelope.eventType,
        sourceOrigin: envelope.sourceOrigin || 'internal-service',
        payload: envelope.payload,
        status: 'FAILED',
        httpStatus,
        latencyMs,
        attempt: envelope.attempt,
        createdAt: attemptTime,
        errorReason,
      };

      const retryEnvelope: WebhookEnvelope = {
        ...envelope,
        attempt: nextAttempt,
        lastAttemptAt: attemptTime,
        lastError: errorReason,
      };

      await producer.sendBatch({
        topicMessages: [
          { topic: TOPICS.LOGS, messages: [{ key: envelope.endpointId, value: JSON.stringify(failedLog) }] },
          { topic: nextTopic, messages: [{ key: envelope.endpointId, value: JSON.stringify(retryEnvelope) }] },
        ],
      });
    } else {
      // Terminal failure after 3 attempts -> Route to DLQ
      console.error(`[Worker] ${envelope.eventId} EXHAUSTED after 3 attempts -> Routing to DLQ`);
      const terminalLog: DeliveryLogRecord = {
        eventId: envelope.eventId,
        endpointId: envelope.endpointId,
        eventType: envelope.eventType,
        sourceOrigin: envelope.sourceOrigin || 'internal-service',
        payload: envelope.payload,
        status: 'DLQ',
        httpStatus,
        latencyMs,
        attempt: envelope.attempt,
        createdAt: attemptTime,
        errorReason,
      };

      const dlqRecord: DlqRecord = {
        eventId: envelope.eventId,
        endpointId: envelope.endpointId,
        eventType: envelope.eventType,
        sourceOrigin: envelope.sourceOrigin || 'internal-service',
        payload: envelope.payload,
        errorReason: errorReason || 'Exhausted retry attempts',
        createdAt: attemptTime,
      };

      await producer.sendBatch({
        topicMessages: [
          { topic: TOPICS.LOGS, messages: [{ key: envelope.endpointId, value: JSON.stringify(terminalLog) }] },
          { topic: TOPICS.DLQ, messages: [{ key: envelope.endpointId, value: JSON.stringify(dlqRecord) }] },
        ],
      });
    }
  }
}

export async function startDeliveryWorker() {
  const consumer = kafka.consumer({ groupId: 'delivery-workers' });
  await consumer.connect();
  console.log('[Worker:Delivery] Consumer connected to Kafka');

  await consumer.subscribe({
    topics: [TOPICS.EVENTS, TOPICS.RETRY_1S, TOPICS.RETRY_3S],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      try {
        const envelope = JSON.parse(message.value.toString()) as WebhookEnvelope;
        await processWebhookDelivery(envelope, topic);
      } catch (err) {
        console.error('[Worker:Delivery] Error processing message:', err);
      }
    },
  });

  return consumer;
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('delivery.ts')) {
  startDeliveryWorker().catch((err) => {
    console.error('Fatal error in delivery worker:', err);
    process.exit(1);
  });
}
