export type DeliveryStatus = 'SUCCESS' | 'FAILED' | 'DLQ' | string;

export interface DeliveryLogRecord {
  id?: string;
  eventId: string;
  endpointId: string;
  eventType: string;
  sourceOrigin?: string;
  payload: any;
  status: DeliveryStatus;
  httpStatus: number | null;
  latencyMs: number;
  attempt: number;
  createdAt: string;
  errorReason?: string;
}

export interface DlqRecord {
  id?: string;
  eventId: string;
  endpointId: string;
  eventType: string;
  sourceOrigin?: string;
  payload: any;
  errorReason: string;
  createdAt: string;
}
