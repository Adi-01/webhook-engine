import { defineConfig, type Plugin } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleMockHealthy, handleMockFlaky } from './src/server/mock-handlers.ts';

let workersBooted = false;

function apiEndpointsPlugin(): Plugin {
  return {
    name: 'api-endpoints-middleware',
    async configureServer(server) {
      // Auto-boot background Kafka workers inside dev server
      if (!workersBooted && process.env.NODE_ENV !== 'test') {
        workersBooted = true;
        try {
          const { startDeliveryWorker } = await import('./src/workers/delivery.ts');
          const { startPersisterWorker } = await import('./src/workers/persister.ts');
          await startDeliveryWorker();
          await startPersisterWorker();
          console.log('⚡ [Engine] Kafka delivery and persister workers active.');
        } catch (e) {
          console.error('[Engine] Could not auto-boot Kafka workers:', e);
        }
      }

      server.middlewares.use(async (req, res, next) => {
        const parsedUrl = new URL(req.url || '/', 'http://localhost');
        const pathname = parsedUrl.pathname;

        // Mock receivers
        if (req.method === 'POST' && pathname === '/api/mock-receiver/healthy') {
          return handleMockHealthy(req, res);
        }
        if (req.method === 'POST' && pathname === '/api/mock-receiver/flaky') {
          return handleMockFlaky(req, res);
        }

        // Raw HTTP Ingestion endpoint
        if (req.method === 'POST' && pathname === '/api/ingest') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const { ingestEvent } = await import('./src/server/ingest.ts');
              const json = JSON.parse(body);
              const result = await ingestEvent(json);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Real-Time Telemetry Stream (Server-Sent Events)
        if (req.method === 'GET' && pathname === '/api/stream') {
          const filterEndpointId = parsedUrl.searchParams.get('endpointId');

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          });

          res.write(': connected\n\n');

          const { default: telemetryEmitter } = await import('./src/lib/telemetry.ts');

          const listener = (log: any) => {
            if (!filterEndpointId || log.endpointId === filterEndpointId) {
              res.write(`data: ${JSON.stringify(log)}\n\n`);
            }
          };

          telemetryEmitter.on('delivery_log', listener);

          const pingInterval = setInterval(() => {
            res.write(': ping\n\n');
          }, 15000);

          req.on('close', () => {
            clearInterval(pingInterval);
            telemetryEmitter.off('delivery_log', listener);
          });

          return;
        }

        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (req.method === 'POST' && pathname === '/api/mock-receiver/healthy') {
          return handleMockHealthy(req, res);
        }
        if (req.method === 'POST' && pathname === '/api/mock-receiver/flaky') {
          return handleMockFlaky(req, res);
        }
        next();
      });
    },
  };
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    apiEndpointsPlugin(),
  ],
});
