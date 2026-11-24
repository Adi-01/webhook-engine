import { Kafka, logLevel } from 'kafkajs';
import 'dotenv/config';

const kafka = new Kafka({
  clientId: 'test-client',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.NOTHING,
});

async function main() {
  console.log('Testing Kafka connection & topic metadata...');
  const admin = kafka.admin();
  await admin.connect();

  const topics = await admin.listTopics();
  console.log('Available topics on broker:', topics);

  const requiredTopics = [
    'webhook.events',
    'webhook.retry.1s',
    'webhook.retry.3s',
    'webhook.logs',
    'webhook.dlq',
  ];

  for (const topic of requiredTopics) {
    if (!topics.includes(topic)) {
      throw new Error(`Missing expected topic: ${topic}`);
    }
  }

  const metadata = await admin.fetchTopicMetadata({ topics: ['webhook.events'] });
  const partitionCount = metadata.topics[0]?.partitions.length;
  console.log(`Topic 'webhook.events' has ${partitionCount} partitions.`);

  if (partitionCount !== 3) {
    throw new Error(`Expected 3 partitions for webhook.events, found ${partitionCount}`);
  }

  await admin.disconnect();
  console.log('Kafka broker & topics are 100% verified!');
}

main().catch((e) => {
  console.error('Kafka test failed:', e);
  process.exit(1);
});
