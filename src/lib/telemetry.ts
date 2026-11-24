import { EventEmitter } from 'node:events';
import type { DeliveryLogRecord } from './types.js';

class TelemetryEmitter extends EventEmitter {
  constructor() {
    super();
    // Allow high concurrent SSE client connections without warning
    this.setMaxListeners(1000);
  }

  broadcastLog(log: DeliveryLogRecord) {
    this.emit('delivery_log', log);
  }
}

// Global singleton to survive HMR in dev mode
declare const globalThis: {
  telemetryEmitterInstance?: TelemetryEmitter;
} & typeof global;

export const telemetryEmitter = globalThis.telemetryEmitterInstance ?? new TelemetryEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalThis.telemetryEmitterInstance = telemetryEmitter;
}

export default telemetryEmitter;
