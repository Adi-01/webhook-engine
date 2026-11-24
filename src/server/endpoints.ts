import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  listEndpoints,
  registerEndpoint,
  toggleEndpointStatus,
  fetchEndpointMonitorData,
  performDlqReplay,
  runBurst,
} from './services.server.js';
import { ingestEvent, IngestEventSchema, type IngestEventInput } from './ingest.js';

export interface EndpointMetrics {
  id: string;
  name: string;
  url: string;
  secret: string;
  isActive: boolean;
  createdAt: string;
  totalDeliveries: number;
  successCount: number;
  failureCount: number;
  activeDlqCount: number;
  successRate: number;
}

export const getEndpoints = createServerFn({ method: 'GET' }).handler(async () => {
  return listEndpoints();
});

export const createEndpoint = createServerFn({ method: 'POST' })
  .validator((d: { name: string; url: string; secret?: string }) => {
    return z
      .object({
        name: z.string().min(1, 'Name is required'),
        url: z.string().url('Must be a valid URL'),
        secret: z.string().optional(),
      })
      .parse(d);
  })
  .handler(async ({ data }) => {
    return registerEndpoint(data);
  });

export const toggleEndpoint = createServerFn({ method: 'POST' })
  .validator((d: { id: string; isActive: boolean }) => z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    return toggleEndpointStatus(data.id, data.isActive);
  });

export const getEndpointMonitorData = createServerFn({ method: 'GET' })
  .validator((d: { endpointId: string }) => z.object({ endpointId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    return fetchEndpointMonitorData(data.endpointId);
  });

export const sendSingleEvent = createServerFn({ method: 'POST' })
  .validator((d: IngestEventInput) => IngestEventSchema.parse(d))
  .handler(async ({ data }) => {
    return ingestEvent(data);
  });

export const replayDlqEvent = createServerFn({ method: 'POST' })
  .validator((d: { dlqId: string }) => z.object({ dlqId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    return performDlqReplay(data.dlqId);
  });

export const triggerBurst = createServerFn({ method: 'POST' })
  .validator((d: { endpointId: string; count?: number }) => {
    return z.object({ endpointId: z.string().uuid(), count: z.number().min(1).max(100).default(50) }).parse(d);
  })
  .handler(async ({ data }) => {
    return runBurst(data.endpointId, data.count);
  });
