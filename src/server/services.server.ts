import { randomBytes, randomUUID } from 'node:crypto';
import prisma from '../lib/db.js';
import { getKafkaProducer, TOPICS, type WebhookEnvelope } from '../lib/kafka.js';
import { ingestEvent } from './ingest.js';
import type { EndpointMetrics } from './endpoints.js';

export async function listEndpoints(): Promise<EndpointMetrics[]> {
  const endpoints = await prisma.endpoint.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          deliveryLogs: true,
          dlqEvents: { where: { replayed: false } },
        },
      },
    },
  });

  const metricsPromises = endpoints.map(async (ep) => {
    const successCount = await prisma.deliveryLog.count({
      where: { endpointId: ep.id, status: 'SUCCESS' },
    });
    const totalDeliveries = ep._count.deliveryLogs;
    const failureCount = totalDeliveries - successCount;
    const successRate = totalDeliveries > 0 ? Math.round((successCount / totalDeliveries) * 100) : 100;

    return {
      id: ep.id,
      name: ep.name,
      url: ep.url,
      secret: ep.secret,
      isActive: ep.isActive,
      createdAt: ep.createdAt.toISOString(),
      totalDeliveries,
      successCount,
      failureCount,
      activeDlqCount: ep._count.dlqEvents,
      successRate,
    };
  });

  return Promise.all(metricsPromises);
}

export async function registerEndpoint(data: { name: string; url: string; secret?: string }) {
  const secret = data.secret?.trim() || `whsec_${randomBytes(16).toString('hex')}`;
  return prisma.endpoint.create({
    data: {
      name: data.name,
      url: data.url,
      secret,
    },
  });
}

export async function toggleEndpointStatus(id: string, isActive: boolean) {
  return prisma.endpoint.update({
    where: { id },
    data: { isActive },
  });
}

export async function fetchEndpointMonitorData(endpointId: string) {
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint) {
    throw new Error('Endpoint not found');
  }

  const logs = await prisma.deliveryLog.findMany({
    where: { endpointId },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  const dlqEvents = await prisma.dlqEvent.findMany({
    where: { endpointId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return {
    endpoint: {
      ...endpoint,
      createdAt: endpoint.createdAt.toISOString(),
    },
    logs: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
    dlqEvents: dlqEvents.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

export async function performDlqReplay(dlqId: string) {
  const dlqItem = await prisma.dlqEvent.findUnique({
    where: { id: dlqId },
  });

  if (!dlqItem) {
    throw new Error('DLQ record not found');
  }

  // Mark as replayed
  await prisma.dlqEvent.update({
    where: { id: dlqId },
    data: { replayed: true },
  });

  // Re-publish to webhook.events as attempt = 1
  const newEventId = `evt_replay_${randomUUID().replace(/-/g, '')}`;
  const envelope: WebhookEnvelope = {
    eventId: newEventId,
    endpointId: dlqItem.endpointId,
    eventType: dlqItem.eventType,
    sourceOrigin: (dlqItem as any).sourceOrigin || 'internal-service',
    payload: dlqItem.payload as Record<string, unknown>,
    attempt: 1,
    queuedAt: new Date().toISOString(),
  };

  const producer = await getKafkaProducer();
  await producer.send({
    topic: TOPICS.EVENTS,
    messages: [
      {
        key: dlqItem.endpointId,
        value: JSON.stringify(envelope),
        timestamp: Date.now().toString(),
      },
    ],
  });

  return { success: true, replayedEventId: newEventId };
}

export async function runBurst(endpointId: string, count = 50) {
  const eventTypes = [
    'payment.captured',
    'order.created',
    'customer.updated',
    'invoice.paid',
    'subscription.renewed',
  ];

  const promises = Array.from({ length: count }).map((_, index) => {
    const type = eventTypes[index % eventTypes.length];
    return ingestEvent({
      endpointId,
      eventType: type,
      sourceOrigin: 'traffic-simulator',
      payload: {
        index: index + 1,
        batchTotal: count,
        timestamp: Date.now(),
        metadata: { env: 'burst-simulator', burstId: `burst_${Date.now()}` },
      },
    });
  });

  const results = await Promise.all(promises);
  return {
    dispatched: results.length,
    sampleEventId: results[0]?.eventId,
  };
}
