import { Kafka, logLevel, Partitioners, type Producer, type Consumer } from 'kafkajs';
import 'dotenv/config';

export const TOPICS = {
  EVENTS: 'webhook.events',
  RETRY_1S: 'webhook.retry.1s',
  RETRY_3S: 'webhook.retry.3s',
  LOGS: 'webhook.logs',
  DLQ: 'webhook.dlq',
} as const;

export interface WebhookEnvelope {
  eventId: string;
  endpointId: string;
  eventType: string;
  sourceOrigin?: string;
  payload: Record<string, unknown>;
  attempt: number;
  queuedAt: string;
  lastAttemptAt?: string;
  lastError?: string;
}

const broker = process.env.KAFKA_BROKER || 'localhost:9092';

export const kafka = new Kafka({
  clientId: 'webhook-engine',
  brokers: [broker],
  logLevel: logLevel.WARN,
});

let producerInstance: Producer | null = null;
let isProducerConnected = false;

export async function getKafkaProducer(): Promise<Producer> {
  if (!producerInstance) {
    producerInstance = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
    producerInstance.on('producer.disconnect', () => {
      isProducerConnected = false;
      producerInstance = null;
    });
  }

  if (!isProducerConnected) {
    await producerInstance.connect();
    isProducerConnected = true;
    console.log('[Kafka] Producer connected to broker:', broker);
  }

  return producerInstance;
}

export function createKafkaConsumer(groupId: string): Consumer {
  return kafka.consumer({ groupId });
}
