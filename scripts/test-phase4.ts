import prisma from '../src/lib/db.js';
import { listEndpoints, registerEndpoint, runBurst, performDlqReplay } from '../src/server/services.server.js';
import telemetryEmitter from '../src/lib/telemetry.js';
import { getKafkaProducer } from '../src/lib/kafka.js';
import type { DeliveryLogRecord } from '../src/lib/types.js';
import 'dotenv/config';

async function main() {
  console.log('=== Starting Phase 4 End-to-End Verification ===\n');

  // 1. Test Endpoint Creation & Metrics
  console.log('1. Testing registerEndpoint function...');
  const newEp = await registerEndpoint({
    name: 'Phase 4 Observability Test Endpoint',
    url: 'http://localhost:3000/api/mock-receiver/healthy',
  });

  console.log(`   Created endpoint: ${newEp.id}`);
  console.log(`   Generated secret: ${newEp.secret}`);

  if (!newEp.secret.startsWith('whsec_')) {
    throw new Error('Endpoint secret does not have whsec_ prefix!');
  }

  // 2. Test getEndpoints with aggregate metrics
  console.log('\n2. Testing listEndpoints with metrics...');
  const endpoints = await listEndpoints();
  const found = endpoints.find((e) => e.id === newEp.id);
  if (!found) {
    throw new Error('Created endpoint not returned in listEndpoints!');
  }
  console.log(`   Found endpoint in list: ${found.name}`);
  console.log(`   Initial deliveries: ${found.totalDeliveries}, Active DLQ: ${found.activeDlqCount}`);

  // 3. Test In-Memory SSE Telemetry Hub
  console.log('\n3. Testing Telemetry Emitter (SSE backplane)...');
  let receivedBroadcast: DeliveryLogRecord | null = null;
  const broadcastPromise = new Promise<void>((resolve) => {
    telemetryEmitter.once('delivery_log', (log: DeliveryLogRecord) => {
      receivedBroadcast = log;
      resolve();
    });
  });

  const testLog: DeliveryLogRecord = {
    eventId: 'evt_test_telemetry_123',
    endpointId: newEp.id,
    eventType: 'payment.captured',
    payload: { amount: 5000 },
    status: 'SUCCESS',
    httpStatus: 200,
    latencyMs: 42,
    attempt: 1,
    createdAt: new Date().toISOString(),
  };

  telemetryEmitter.broadcastLog(testLog);
  await broadcastPromise;

  if (!receivedBroadcast || (receivedBroadcast as DeliveryLogRecord).eventId !== testLog.eventId) {
    throw new Error('Telemetry broadcast event was not received!');
  }
  console.log('   ✅ Real-time telemetry broadcast verified:', (receivedBroadcast as DeliveryLogRecord).eventId);

  // 4. Test Traffic Burst Simulator (10 events)
  console.log('\n4. Testing runBurst function (10 events)...');
  const burstResult = await runBurst(newEp.id, 10);
  console.log(`   Burst result: ${burstResult.dispatched} events dispatched to Kafka.`);
  console.log(`   Sample eventId: ${burstResult.sampleEventId}`);

  if (burstResult.dispatched !== 10) {
    throw new Error(`Expected 10 dispatched events, got ${burstResult.dispatched}`);
  }

  // 5. Test DLQ Replay Function
  console.log('\n5. Testing performDlqReplay function...');
  const dummyDlq = await prisma.dlqEvent.create({
    data: {
      eventId: 'evt_failed_dlq_sample',
      endpointId: newEp.id,
      eventType: 'order.cancelled',
      payload: { reason: 'card_declined' },
      errorReason: 'HTTP 503 Service Unavailable',
      replayed: false,
    },
  });

  const replayResult = await performDlqReplay(dummyDlq.id);
  console.log('   Replay response:', replayResult);

  const updatedDlq = await prisma.dlqEvent.findUnique({
    where: { id: dummyDlq.id },
  });

  if (!updatedDlq?.replayed) {
    throw new Error('DLQ record was not marked as replayed!');
  }
  console.log('   ✅ DLQ event re-published to Kafka and marked replayed = true.');

  // 6. Cleanup
  console.log('\n6. Cleaning up test data & connections...');
  const producer = await getKafkaProducer();
  await producer.disconnect();

  await prisma.endpoint.delete({ where: { id: newEp.id } });
  await prisma.$disconnect();

  console.log('\n=== Phase 4 Verification PASSED 100% ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Phase 4 Verification FAILED:', err);
  process.exit(1);
});
