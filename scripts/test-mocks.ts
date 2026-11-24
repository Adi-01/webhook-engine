import { handleMockHealthy, handleMockFlaky } from '../src/server/mock-handlers';

function testMock(handler: (req: any, res: any) => void): Promise<{ statusCode: number; duration: number }> {
  return new Promise((resolve) => {
    const start = performance.now();
    const req: any = { method: 'POST' };
    const res: any = {
      statusCode: 200,
      headers: {},
      setHeader(k: string, v: string) {
        this.headers[k] = v;
      },
      end(_data?: string) {
        const duration = performance.now() - start;
        resolve({ statusCode: this.statusCode, duration });
      },
    };
    handler(req, res);
  });
}

async function main() {
  console.log('=== Testing Mock Receivers ===\n');

  // 1. Test Healthy Mock
  console.log('Testing handleMockHealthy (10 samples)...');
  const healthyResults = await Promise.all(
    Array.from({ length: 10 }).map(() => testMock(handleMockHealthy))
  );

  const allHealthyOk = healthyResults.every((r) => r.statusCode === 200);
  const avgHealthyLatency = healthyResults.reduce((acc, r) => acc + r.duration, 0) / 10;
  console.log(`   All 200 OK: ${allHealthyOk}`);
  console.log(`   Avg simulated latency: ${avgHealthyLatency.toFixed(2)}ms (expected 50-150ms)`);

  if (!allHealthyOk) {
    throw new Error('Healthy mock failed to return 200!');
  }

  // 2. Test Flaky Mock
  console.log('\nTesting handleMockFlaky (50 samples)...');
  const flakyResults = await Promise.all(
    Array.from({ length: 50 }).map(() => testMock(handleMockFlaky))
  );

  const errorCount = flakyResults.filter((r) => r.statusCode === 503).length;
  const okCount = flakyResults.filter((r) => r.statusCode === 200).length;
  const errorRate = (errorCount / 50) * 100;
  const avgFlakyLatency = flakyResults.reduce((acc, r) => acc + r.duration, 0) / 50;

  console.log(`   200 OK count: ${okCount}`);
  console.log(`   503 Service Unavailable count: ${errorCount} (${errorRate.toFixed(1)}%, expected ~60%)`);
  console.log(`   Avg simulated latency: ${avgFlakyLatency.toFixed(2)}ms (expected 100-400ms)`);

  if (errorCount === 0 || okCount === 0) {
    throw new Error('Flaky mock did not produce both 200 and 503 responses!');
  }

  console.log('\n=== Mock Receivers PASSED 100% ===');
}

main().catch((err) => {
  console.error('❌ Mock tests failed:', err);
  process.exit(1);
});
