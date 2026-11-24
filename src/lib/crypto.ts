import { createHmac } from 'node:crypto';

/**
 * Computes an HMAC-SHA256 signature over the serialized JSON payload.
 * Standard format: sha256=<hex_digest>
 */
export function signPayload(payload: unknown, secret: string): string {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const digest = createHmac('sha256', secret).update(content).digest('hex');
  return `sha256=${digest}`;
}

export function verifySignature(payload: unknown, secret: string, signatureHeader: string): boolean {
  const expected = signPayload(payload, secret);
  return expected === signatureHeader;
}
