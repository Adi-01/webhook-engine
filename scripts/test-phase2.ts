import prisma from '../src/lib/db';
import { ingestEvent } from '../src/server/ingest';
import { kafka, TOPICS, getKafkaProducer, type WebhookEnvelope } from '../src/lib/kafka';
import 'dotenv/config';

async function main() {
  console.log('=== Starting Phase 2 Verification ===\n');

  // 1. Setup a test endpoint in Postgres
  console.log('1. Creating test endpoint in PostgreSQL...');
  const endpoint = await prisma.endpoint.create({
    data: {
      name: 'Phase 2 Test Endpoint',
      url: 'http://localhost:3000/api/mock-receiver/healthy',
      secret: 'whsec_phase2testsecret1234567890',
      isActive: true,
    },
  });
  console.log(`   Endpoint created: ${endpoint.id}`);

  // 2. Prepare Kafka consumer to listen for the ingested event
  console.log('\n2. Setting up test Kafka consumer for topic:', TOPICS.EVENTS);
  const consumer = kafka.consumer({ groupId: `test-phase2-verifier-${Date.now()}` });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.EVENTS, fromBeginning: false });

  let receivedEnvelope: WebhookEnvelope | null = null;
  let receivedKey: string | null = null;

  const messagePromise = new Promise<void>((resolve) => {
    consumer.run({
      eachMessage: async ({ message }) => {
        receivedKey = message.key?.toString() || null;
        if (message.value) {
          receivedEnvelope = JSON.parse(message.value.toString()) as WebhookEnvelope;
          resolve();
        }
      },
    });
  });

  // Give consumer a moment to join group
  await new Promise((r) => setTimeout(r, 1500));

  // 3. Test Ingestion API
  console.log('\n3. Testing ingestEvent function...');
  const start = performance.now();
  const ingestResult = await ingestEvent({
    endpointId: endpoint.id,
    eventType: 'payment.captured',
    payload: { orderId: 'ord_98765', amount: 4999, currency: 'USD' },
  });
  const elapsed = performance.now() - start;

  console.log(`   Ingest response in ${elapsed.toFixed(2)}ms:`, ingestResult);

  if (!ingestResult.accepted || !ingestResult.eventId.startsWith('evt_')) {
    throw new Error('Ingest response validation failed!');
  }

  // 4. Wait for Kafka message to arrive
  console.log('\n4. Verifying Kafka delivery...');
  await Promise.race([
    messagePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for Kafka message')), 5000)),
  ]);

  if (!receivedEnvelope || !receivedKey) {
    throw new Error('Did not receive envelope from Kafka!');
  }

  console.log('   Received envelope from Kafka:');
  console.log('   - Key (endpointId):', receivedKey);
  console.log('   - EventId:', (receivedEnvelope as WebhookEnvelope).eventId);
  console.log('   - EventType:', (receivedEnvelope as WebhookEnvelope).eventType);
  console.log('   - Attempt:', (receivedEnvelope as WebhookEnvelope).attempt);

  if (receivedKey !== endpoint.id) {
    throw new Error(`Expected Kafka key ${endpoint.id}, but got ${receivedKey}`);
  }

  // 5. Cleanup
  console.log('\n5. Cleaning up test data & consumer...');
  await consumer.disconnect();
  const producer = await getKafkaProducer();
  await producer.disconnect();
  await prisma.endpoint.delete({ where: { id: endpoint.id } });
  await prisma.$disconnect();

  console.log('\n=== Phase 2 Verification PASSED 100% ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Phase 2 Verification FAILED:', err);
  process.exit(1);
});
