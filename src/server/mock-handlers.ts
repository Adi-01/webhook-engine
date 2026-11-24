import type { IncomingMessage, ServerResponse } from 'node:http';

export function handleMockHealthy(_req: IncomingMessage, res: ServerResponse) {
  const latency = Math.floor(Math.random() * 101) + 50; // 50ms - 150ms
  setTimeout(() => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', received: true, simulatedLatencyMs: latency }));
  }, latency);
}

export function handleMockFlaky(_req: IncomingMessage, res: ServerResponse) {
  const latency = Math.floor(Math.random() * 301) + 100; // 100ms - 400ms
  const isError = Math.random() < 0.6; // 60% failure rate

  setTimeout(() => {
    if (isError) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Service Unavailable', simulatedLatencyMs: latency }));
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok', received: true, simulatedLatencyMs: latency }));
    }
  }, latency);
}
