# Distributed Webhook Delivery Engine

A production-grade, fault-tolerant webhook ingestion and reliable delivery platform built with **Apache Kafka**, **TypeScript**, **PostgreSQL**, and **TanStack Start**.

Inspired by enterprise webhook systems at Stripe and Svix, this engine decouples high-volume internal business events from slow, unreliable third-party HTTP endpoints using asynchronous queuing, tiered non-blocking retries, automated Dead Letter Queuing (DLQ), cryptographic HMAC-SHA256 signing, and real-time Server-Sent Events (SSE) telemetry.

---

## Architecture Overview

```
                                      [ Internal Microservices ]
                                  (Billing, Orders, Auth Services)
                                                 │
                                                 ▼ POST /api/ingest (sub-5ms)
                                  ┌──────────────────────────────┐
                                  │   Ingest API & Zod Schema    │
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼ Partition Key: endpointId (FIFO)
                                  ┌──────────────────────────────┐
                                  │   Kafka: webhook.events      │
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │       Delivery Worker        │
                                  │   (HMAC-SHA256 Signing)      │
                                  └──────┬───────────────┬───────┘
                                         │               │
                     HTTP 200 OK         │               │ HTTP 4xx / 5xx / Timeout
           ┌─────────────────────────────┘               └─────────────────────────────┐
           ▼                                                                           ▼
┌──────────────────────┐                                                   ┌──────────────────────┐
│  Customer Webhook    │                                                   │ Tiered Delay Topics  │
│  Destination Server  │                                                   │ 1s -> 3s Retries     │
└──────────────────────┘                                                   └──────────┬───────────┘
           │                                                                          │ Exhausted
           │                                                                          ▼
           │                                                               ┌──────────────────────┐
           │                                                               │     webhook.dlq      │
           │                                                               └──────────┬───────────┘
           │                                                                          │
           ▼                                                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Kafka: webhook.logs                                      │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Persister Worker                                     │
│            ┌─────────────────────────────┴─────────────────────────────┐               │
│            ▼                                                           ▼               │
│   PostgreSQL (Prisma)                                         Telemetry Emitter        │
│   (Historical Delivery & DLQ Audit Logs)                      (Server-Sent Events)     │
└────────────────────────────────────────────────────────────────────────┬───────────────┘
                                                                         │ GET /api/stream
                                                                         ▼
                                                       ┌─────────────────────────────────┐
                                                       │     Real-Time UI Dashboard      │
                                                       │ (Live Logs, DLQ Replay, Status) │
                                                       └─────────────────────────────────┘
```

---

## Key Engineering Highlights

* **Sub-5ms Asynchronous Ingestion:** Microservices publish events to `POST /api/ingest` and receive an immediate `200 Accepted` receipt. Internal services never block waiting for external endpoints.
* **FIFO Ordering via Partition Affinity:** Events use `endpointId` as their Kafka message key, guaranteeing strict chronological delivery order per destination endpoint across Kafka partitions.
* **Tiered Non-Blocking Retries:** Failed deliveries are routed through tiered delay topics (`webhook.retry.1s`, `webhook.retry.3s`) with exponential backoff and jitter, preventing slow or failing endpoints from causing head-of-line blocking for healthy endpoints.
* **Dead Letter Queue (DLQ) with Manual Replay:** Deliveries failing all 3 attempts are quarantined in `webhook.dlq` and persisted to PostgreSQL. Operators can inspect the failed payload and click **"Replay to Kafka"** for lossless recovery.
* **Cryptographic Security (HMAC-SHA256):** Every outgoing webhook payload is signed with a per-endpoint signing secret (`whsec_...`) and transmitted in the `X-Webhook-Signature` header to prevent payload tampering and spoofing.
* **Real-Time Telemetry Stream (SSE):** The delivery worker emits execution telemetry (HTTP status, round-trip latency, error reasons) to a reactive browser dashboard over Server-Sent Events (`/api/stream`) without polling overhead.
* **Built-in Traffic Simulator:** Test the pipeline instantly with single realistic business events (`payment.captured`, `order.fulfilled`, `invoice.created`), service origin tagging (`billing-service`, `orders-service`), or 50-event concurrent stress bursts.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Message Broker** | Apache Kafka (via KafkaJS) |
| **Database & ORM** | PostgreSQL (Dockerized), Prisma ORM |
| **Backend & Ingestion** | Node.js (ESM), TypeScript, TanStack Start Server Functions |
| **Real-Time Streaming** | Server-Sent Events (SSE) via Node.js HTTP event-stream |
| **Frontend Framework** | React 19, TanStack Start (SSR), TanStack Router |
| **UI Components** | Tailwind CSS v4, shadcn/ui, Radix UI Primitives, Lucide Icons, Sonner |
| **Infrastructure** | Docker, Docker Compose |

---

## Getting Started

### 1. Prerequisites
* **Node.js** `>= 20.0.0`
* **Docker & Docker Compose** (for Kafka and PostgreSQL)
* **npm** or **pnpm**

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/Adi-01/webhook-engine.git
cd webhook-engine
npm install
```

### 3. Configure Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env
```

Default contents of `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/webhook_engine?schema=public"
KAFKA_BROKER="localhost:9092"
PORT=3000
```

### 4. Start Infrastructure (PostgreSQL & Kafka)
Launch PostgreSQL and Apache Kafka in the background:
```bash
docker compose up -d
```

Verify containers are running:
```bash
docker compose ps
```

### 5. Initialize the Database
Push the Prisma schema to PostgreSQL:
```bash
npm run db:push
```

### 6. Start the Background Workers
Run the delivery worker and persister worker in separate terminal sessions:

**Terminal 1 — Delivery Worker:**
```bash
npm run worker:delivery
```

**Terminal 2 — Persister Worker:**
```bash
npm run worker:persister
```

### 7. Start the Web Dashboard
In a third terminal, start the TanStack Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running the Verification Test Suite

The project includes an end-to-end integration test suite verifying database connectivity, Kafka topic topology, mock receivers, ingestion throughput, tiered retries, and DLQ replay:

```bash
npm run test:all
```

Individual test targets:
* `npm run test:db`: Verifies PostgreSQL and Prisma connection.
* `npm run test:kafka`: Verifies Kafka broker connection and topic partition metadata.
* `npm run test:mocks`: Validates mock healthy and flaky receivers with artificial jitter.
* `npm run test:phase2`: Tests raw event ingestion and Kafka envelope receipt.
* `npm run test:phase3`: Tests end-to-end delivery, retries, and DLQ exhaust routing.
* `npm run test:phase4`: Tests registration, telemetry SSE backplane, and DLQ manual replay.

---

## API Reference

### 1. Ingest Event
Dispatches a new event into the delivery pipeline.

* **Endpoint:** `POST /api/ingest`
* **Content-Type:** `application/json`

**Request Body:**
```json
{
  "endpointId": "8f8b8a5e-9988-466d-8bc4-1736b04e6c38",
  "eventType": "payment.captured",
  "sourceOrigin": "billing-service",
  "payload": {
    "paymentId": "pay_98234",
    "amount": 4999,
    "currency": "usd",
    "customer": {
      "id": "cus_123",
      "email": "customer@example.com"
    }
  }
}
```

**Response (HTTP 200 OK):**
```json
{
  "accepted": true,
  "eventId": "evt_7f16acb879c940c2834bfa293418"
}
```

---

### 2. Live Telemetry Stream
Subscribes to live Server-Sent Events (SSE) for real-time delivery logs.

* **Endpoint:** `GET /api/stream?endpointId=<uuid>`
* **Content-Type:** `text/event-stream`

**Stream Chunk Format:**
```
data: {"eventId":"evt_7f16...","endpointId":"...","eventType":"payment.captured","sourceOrigin":"billing-service","status":"SUCCESS","httpStatus":200,"latencyMs":48,"attempt":1,"createdAt":"2026-11-25T01:45:00.000Z"}
```

---

## Webhook Signature Verification

Receivers can verify payload authenticity using HMAC-SHA256:

```javascript
import crypto from 'node:crypto';

function verifyWebhookSignature(payloadString, receivedSignature, secret) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(computedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}
```

---

## License

MIT
