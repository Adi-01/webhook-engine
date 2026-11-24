import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getKafkaProducer, TOPICS, type WebhookEnvelope } from '../lib/kafka.js';
import prisma from '../lib/db.js';

export const IngestEventSchema = z.object({
  endpointId: z.string().uuid('Invalid endpointId UUID'),
  eventType: z.string().min(1, 'eventType is required'),
  sourceOrigin: z.string().min(1).optional().default('internal-service'),
  payload: z.record(z.unknown()),
});

export type IngestEventInput = z.input<typeof IngestEventSchema>;

export interface IngestResponse {
  accepted: boolean;
  eventId: string;
}

export async function ingestEvent(input: IngestEventInput): Promise<IngestResponse> {
  const validated = IngestEventSchema.parse(input);

  // Quick verify endpoint exists and is active
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: validated.endpointId },
    select: { id: true, isActive: true },
  });

  if (!endpoint) {
    throw new Error(`Endpoint not found: ${validated.endpointId}`);
  }

  if (!endpoint.isActive) {
    throw new Error(`Endpoint is disabled: ${validated.endpointId}`);
  }

  const eventId = `evt_${randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();

  const envelope: WebhookEnvelope = {
    eventId,
    endpointId: validated.endpointId,
    eventType: validated.eventType,
    sourceOrigin: validated.sourceOrigin || 'internal-service',
    payload: validated.payload,
    attempt: 1,
    queuedAt: now,
  };

  const producer = await getKafkaProducer();

  // Send to Kafka with key = endpointId for per-endpoint partition affinity (FIFO)
  await producer.send({
    topic: TOPICS.EVENTS,
    messages: [
      {
        key: validated.endpointId,
        value: JSON.stringify(envelope),
        timestamp: Date.now().toString(),
      },
    ],
  });

  return {
    accepted: true,
    eventId,
  };
}

export const ingestWebhookEvent = createServerFn({ method: 'POST' })
  .validator((d: IngestEventInput) => IngestEventSchema.parse(d))
  .handler(async ({ data }) => {
    return ingestEvent(data);
  });
