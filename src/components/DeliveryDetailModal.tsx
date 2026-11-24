import { useState } from 'react';
import type { DeliveryLogRecord } from '../lib/types.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { Copy, Check, FileJson, AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react';

interface DeliveryDetailModalProps {
  log: DeliveryLogRecord | null;
  onClose: () => void;
}

export function DeliveryDetailModal({ log, onClose }: DeliveryDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = () => {
    if (log.status === 'SUCCESS') {
      return (
        <Badge variant="outline" className="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border-emerald-800/50 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>SUCCESS (200 OK)</span>
        </Badge>
      );
    }
    if (log.status === 'FAILED') {
      return (
        <Badge variant="outline" className="text-[10px] font-mono font-bold bg-amber-950/80 text-amber-400 border-amber-800/50 gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>FAILED (Attempt {log.attempt}/3)</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] font-mono font-bold bg-rose-950/80 text-rose-400 border-rose-800/50 gap-1">
        <AlertOctagon className="w-3 h-3" />
        <span>DEAD LETTER QUEUE</span>
      </Badge>
    );
  };

  return (
    <Dialog open={!!log} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#18181b] border-[#27272a] text-[#f4f4f5] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[#27272a] pb-4">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-base font-semibold text-[#f4f4f5]">
              Delivery Event Details
            </DialogTitle>
            {statusBadge()}
          </div>
        </DialogHeader>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#09090b] border border-[#27272a] rounded-lg p-3 text-xs font-mono my-2">
          <div>
            <span className="text-[#71717a] text-[10px] uppercase block">Event ID</span>
            <span className="text-[#f4f4f5] text-[11px] truncate block" title={log.eventId}>
              {log.eventId}
            </span>
          </div>
          <div>
            <span className="text-[#71717a] text-[10px] uppercase block">Source Origin</span>
            <span className="text-sky-400 text-[11px] font-semibold truncate block" title={log.sourceOrigin || 'internal-service'}>
              {log.sourceOrigin || 'internal-service'}
            </span>
          </div>
          <div>
            <span className="text-[#71717a] text-[10px] uppercase block">Event Type</span>
            <span className="text-emerald-400 text-[11px] font-semibold truncate block">
              {log.eventType}
            </span>
          </div>
          <div>
            <span className="text-[#71717a] text-[10px] uppercase block">HTTP Status</span>
            <span className="text-[#f4f4f5] text-[11px] block">
              {log.httpStatus ?? 'None (Timeout/Net)'}
            </span>
          </div>
          <div>
            <span className="text-[#71717a] text-[10px] uppercase block">Latency</span>
            <span className="text-[#f4f4f5] text-[11px] block">{log.latencyMs}ms</span>
          </div>
        </div>

        {/* Error reason alert if failure */}
        {log.errorReason && (
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/40 text-xs flex flex-col gap-1 mb-2">
            <span className="text-rose-400 font-semibold font-mono text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Delivery Failure Reason:</span>
            </span>
            <p className="text-rose-300 font-mono text-[11px]">{log.errorReason}</p>
          </div>
        )}

        {/* JSON Payload Viewer */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#d4d4d8] flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-sky-400" />
              <span>Dispatched Webhook Payload</span>
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={handleCopyPayload}
              className="bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-[#f4f4f5] border-[#3f3f46]/50 text-[11px] font-mono h-6 gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy JSON</span>
                </>
              )}
            </Button>
          </div>
          <pre className="p-3.5 rounded-lg bg-[#09090b] border border-[#27272a] font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-64 leading-relaxed">
            {JSON.stringify(log.payload, null, 2)}
          </pre>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between text-[11px] text-[#71717a] border-t border-[#27272a] pt-4 mt-2">
          <span>Recorded: {new Date(log.createdAt).toLocaleString()}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="bg-[#27272a] text-[#f4f4f5] hover:bg-[#3f3f46] text-xs h-8"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
