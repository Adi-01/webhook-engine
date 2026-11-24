import { kafka, TOPICS } from '../lib/kafka.js';
import prisma from '../lib/db.js';
import telemetryEmitter from '../lib/telemetry.js';
import type { DeliveryLogRecord, DlqRecord } from '../lib/types.js';

export async function processLogRecord(record: DeliveryLogRecord) {
  try {
    await prisma.deliveryLog.create({
      data: {
        eventId: record.eventId,
        endpointId: record.endpointId,
        eventType: record.eventType,
        sourceOrigin: record.sourceOrigin ?? 'internal-service',
        payload: record.payload as any,
        status: record.status,
        httpStatus: record.httpStatus,
        latencyMs: record.latencyMs,
        attempt: record.attempt,
        createdAt: new Date(record.createdAt),
      },
    });

    // Broadcast in real-time to connected SSE browser streams
    telemetryEmitter.broadcastLog(record);
  } catch (err: any) {
    // P2003: Foreign key constraint failed (e.g. test endpoint was deleted during Kafka flush)
    if (err.code === 'P2003') {
      return;
    }
    console.error(`[Worker:Persister] Error saving delivery log for ${record.eventId}:`, err);
  }
}

export async function processDlqRecord(record: DlqRecord) {
  try {
    await prisma.dlqEvent.create({
      data: {
        eventId: record.eventId,
        endpointId: record.endpointId,
        eventType: record.eventType,
        sourceOrigin: record.sourceOrigin ?? 'internal-service',
        payload: record.payload as any,
        errorReason: record.errorReason,
        createdAt: new Date(record.createdAt),
      },
    });
    console.log(`[Worker:Persister] Saved DLQ event ${record.eventId} to database.`);
  } catch (err: any) {
    if (err.code === 'P2003') {
      return;
    }
    console.error(`[Worker:Persister] Error saving DLQ record for ${record.eventId}:`, err);
  }
}

export async function startPersisterWorker() {
  const consumer = kafka.consumer({ groupId: 'db-log-persisters' });
  await consumer.connect();
  console.log('[Worker:Persister] Connected to Kafka');

  await consumer.subscribe({
    topics: [TOPICS.LOGS, TOPICS.DLQ],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      try {
        const raw = message.value.toString();
        if (topic === TOPICS.LOGS) {
          const logRecord = JSON.parse(raw) as DeliveryLogRecord;
          await processLogRecord(logRecord);
        } else if (topic === TOPICS.DLQ) {
          const dlqRecord = JSON.parse(raw) as DlqRecord;
          await processDlqRecord(dlqRecord);
        }
      } catch (err) {
        console.error('[Worker:Persister] Error processing message:', err);
      }
    },
  });

  return consumer;
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('persister.ts')) {
  startPersisterWorker().catch((err) => {
    console.error('Fatal error in persister worker:', err);
    process.exit(1);
  });
}
