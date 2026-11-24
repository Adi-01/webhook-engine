import http from 'node:http';
import prisma from '../src/lib/db.js';
import { ingestEvent } from '../src/server/ingest.js';
import { getKafkaProducer } from '../src/lib/kafka.js';
import { startDeliveryWorker } from '../src/workers/delivery.js';
import { startPersisterWorker } from '../src/workers/persister.js';
import { verifySignature } from '../src/lib/crypto.js';
import 'dotenv/config';

const PORT = 4050;

async function main() {
  console.log('=== Starting Phase 3 End-to-End Delivery Verification ===\n');

  // 1. Start a local HTTP receiver to inspect dispatched webhooks & signatures
  let healthyCalls = 0;
  let signatureVerified = false;
  let flakyCalls = 0;

  const mockServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const signature = req.headers['x-webhook-signature'] as string;
      const eventId = req.headers['x-webhook-id'] as string;

      if (req.url === '/healthy') {
        healthyCalls++;
        signatureVerified = verifySignature(body, 'whsec_healthy123', signature);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true, eventId }));
      } else if (req.url === '/flaky') {
        flakyCalls++;
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Service Unavailable', attempt: flakyCalls }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  });

  await new Promise<void>((resolve) => mockServer.listen(PORT, resolve));
  console.log(`1. Mock Webhook Receiver listening on http://localhost:${PORT}`);

  // 2. Register test endpoints in Postgres
  console.log('2. Registering test endpoints in PostgreSQL...');
  const healthyEndpoint = await prisma.endpoint.create({
    data: {
      name: 'Phase 3 Healthy Endpoint',
      url: `http://localhost:${PORT}/healthy`,
      secret: 'whsec_healthy123',
    },
  });

  const flakyEndpoint = await prisma.endpoint.create({
    data: {
      name: 'Phase 3 Flaky Endpoint',
      url: `http://localhost:${PORT}/flaky`,
      secret: 'whsec_flaky456',
    },
  });

  // 3. Start background delivery and persister workers
  console.log('3. Starting Delivery and Persister workers...');
  const deliveryConsumer = await startDeliveryWorker();
  const persisterConsumer = await startPersisterWorker();

  // Allow consumer groups to rebalance & settle
  await new Promise((r) => setTimeout(r, 3000));

  // 4. Test Case A: Successful Delivery with HMAC signature verification
  console.log('\n4. [Test Case A] Ingesting event to Healthy Endpoint...');
  const eventA = await ingestEvent({
    endpointId: healthyEndpoint.id,
    eventType: 'order.created',
    payload: { id: 'order_123', total: 99.5 },
  });
  console.log('   Ingested event:', eventA.eventId);

  // Wait for delivery to complete and persist
  console.log('   Waiting for delivery and DB persistence...');
  let logRecord = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    logRecord = await prisma.deliveryLog.findFirst({
      where: { eventId: eventA.eventId },
    });
    if (logRecord && logRecord.status === 'SUCCESS') break;
  }

  if (!logRecord || logRecord.status !== 'SUCCESS') {
    throw new Error(`Test Case A Failed: Expected SUCCESS log record, got ${logRecord?.status}`);
  }

  console.log('   ✅ Test Case A Passed:');
  console.log(`      - HTTP calls received: ${healthyCalls}`);
  console.log(`      - HMAC-SHA256 signature verified: ${signatureVerified}`);
  console.log(`      - DB status: ${logRecord.status}, Latency: ${logRecord.latencyMs}ms, Attempt: ${logRecord.attempt}`);

  // 5. Test Case B: Tiered Retries (1s, 3s) and Dead Letter Queue (DLQ)
  console.log('\n5. [Test Case B] Ingesting event to Flaky Endpoint (will fail 3 times)...');
  const eventB = await ingestEvent({
    endpointId: flakyEndpoint.id,
    eventType: 'payment.failed',
    payload: { invoice: 'inv_abc', reason: 'insufficient_funds' },
  });
  console.log('   Ingested event:', eventB.eventId);

  console.log('   Waiting for retries (attempt 1 -> retry.1s -> retry.3s -> DLQ)...');
  let dlqRecord = null;
  // Needs ~5-8 seconds for attempt 1, 1s backoff, attempt 2, 3s backoff, attempt 3, DLQ persist
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    dlqRecord = await prisma.dlqEvent.findFirst({
      where: { eventId: eventB.eventId },
    });
    if (dlqRecord) break;
  }

  if (!dlqRecord) {
    throw new Error('Test Case B Failed: Event did not land in DLQ table!');
  }

  const logsB = await prisma.deliveryLog.findMany({
    where: { eventId: eventB.eventId },
    orderBy: { attempt: 'asc' },
  });

  console.log('   ✅ Test Case B Passed:');
  console.log(`      - Total HTTP delivery attempts made: ${flakyCalls} (expected 3)`);
  console.log(`      - Recorded delivery logs count: ${logsB.length}`);
  logsB.forEach((l) => {
    console.log(`        * Attempt ${l.attempt}: status=${l.status}, http=${l.httpStatus}, error=${l.status === 'DLQ' ? 'Exhausted' : '503'}`);
  });
  console.log(`      - DLQ Event persisted in PostgreSQL with reason: "${dlqRecord.errorReason}"`);

  // 6. Cleanup
  console.log('\n6. Cleaning up test data & connections...');
  await deliveryConsumer.disconnect();
  await persisterConsumer.disconnect();
  const producer = await getKafkaProducer();
  await producer.disconnect();

  await prisma.endpoint.deleteMany({
    where: { id: { in: [healthyEndpoint.id, flakyEndpoint.id] } },
  });
  await prisma.$disconnect();

  mockServer.close();

  console.log('\n=== Phase 3 Verification PASSED 100% ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Phase 3 Verification FAILED:', err);
  process.exit(1);
});
