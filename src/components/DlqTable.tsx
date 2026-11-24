import type { DeliveryLogRecord } from '../lib/types.js';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './ui/table.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu.js';
import { RotateCcw, AlertOctagon, CheckCircle2, MoreHorizontal, Eye, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export interface DlqItem {
  id: string;
  eventId: string;
  endpointId: string;
  eventType: string;
  sourceOrigin?: string;
  payload: any;
  errorReason: string;
  replayed: boolean;
  createdAt: string;
}

interface DlqTableProps {
  dlqEvents: DlqItem[];
  onReplay: (id: string) => Promise<void>;
  onInspectPayload: (log: DeliveryLogRecord) => void;
  replayingId: string | null;
}

export function DlqTable({
  dlqEvents,
  onReplay,
  onInspectPayload,
  replayingId,
}: DlqTableProps) {
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  if (dlqEvents.length === 0) {
    return (
      <div className="p-12 text-center text-xs text-[#71717a] flex flex-col items-center justify-center gap-2">
        <AlertOctagon className="w-6 h-6 text-zinc-600" />
        <span className="text-[#a1a1aa] font-medium">Zero dead letter events</span>
        <span>Events that exhaust all 3 retry attempts will appear here for investigation and replay.</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <Table className="min-w-[990px] w-full text-left text-xs table-fixed">
        <TableHeader>
          <TableRow className="border-b border-[#27272a] hover:bg-transparent text-[10px] uppercase tracking-wider text-[#71717a] bg-[#121214]">
            <TableHead className="py-2.5 px-3 font-medium w-[50px] min-w-[50px] text-center text-[#71717a]">#</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[110px] min-w-[110px] text-[#71717a]">Status</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[180px] min-w-[180px] text-[#71717a]">Event ID</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[190px] min-w-[190px] text-[#71717a]">Event Type</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[280px] min-w-[280px] text-[#71717a]">Failure Reason</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[100px] min-w-[100px] text-right text-[#71717a]">Time</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[70px] min-w-[70px] text-center text-[#71717a]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#27272a] font-mono text-[11px] text-[#d4d4d8]">
          {dlqEvents.map((dlq, idx) => (
            <TableRow
              key={dlq.id}
              className="border-b border-[#27272a] hover:bg-[#202023] transition-colors group cursor-pointer"
              onClick={() =>
                onInspectPayload({
                  id: dlq.id,
                  eventId: dlq.eventId,
                  endpointId: dlq.endpointId,
                  eventType: dlq.eventType,
                  payload: dlq.payload,
                  status: 'DLQ',
                  httpStatus: null,
                  latencyMs: 0,
                  attempt: 3,
                  createdAt: dlq.createdAt,
                  errorReason: dlq.errorReason,
                })
              }
            >
              {/* S.No */}
              <TableCell className="py-2.5 px-3 text-center text-[#71717a] text-[10px] w-[50px] min-w-[50px]">
                {idx + 1}
              </TableCell>

              {/* Status */}
              <TableCell className="py-2.5 px-3 w-[110px] min-w-[110px]">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                    dlq.replayed
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      : 'bg-rose-950/80 text-rose-300 border-rose-900/50'
                  }`}
                >
                  {dlq.replayed ? (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>REPLAYED</span>
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-2.5 h-2.5" />
                      <span>EXHAUSTED</span>
                    </>
                  )}
                </Badge>
              </TableCell>

              {/* Event ID */}
              <TableCell className="py-2.5 px-3 text-[#a1a1aa] truncate w-[180px] min-w-[180px]" title={dlq.eventId}>
                {dlq.eventId}
              </TableCell>

              {/* Event Type & Source Origin */}
              <TableCell className="py-2.5 px-3 truncate w-[190px] min-w-[190px]">
                <div className="font-semibold text-[#f4f4f5] truncate" title={dlq.eventType}>
                  {dlq.eventType}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono truncate flex items-center gap-1">
                  <span>from:</span>
                  <span className="text-zinc-400 font-medium">{dlq.sourceOrigin || 'internal-service'}</span>
                </div>
              </TableCell>

              {/* Error Reason */}
              <TableCell className="py-2.5 px-3 text-amber-400/90 truncate w-[280px] min-w-[280px]" title={dlq.errorReason}>
                {dlq.errorReason}
              </TableCell>

              {/* Time */}
              <TableCell className="py-2.5 px-3 text-right text-[#71717a] text-[10px] w-[100px] min-w-[100px]">
                {new Date(dlq.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </TableCell>

              {/* Ellipsis Actions Submenu */}
              <TableCell className="py-2.5 px-3 text-center w-[70px] min-w-[70px]" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-7 w-7 text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#18181b] border-[#27272a] text-[#f4f4f5] text-xs min-w-[160px]">
                    {!dlq.replayed ? (
                      <DropdownMenuItem
                        onClick={() => onReplay(dlq.id)}
                        disabled={replayingId === dlq.id}
                        className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5 font-medium text-emerald-400"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${replayingId === dlq.id ? 'animate-spin' : ''}`} />
                        <span>{replayingId === dlq.id ? 'Replaying...' : 'Replay to Kafka'}</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled className="gap-2 py-1.5 opacity-50 text-zinc-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Already Replayed</span>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() =>
                        onInspectPayload({
                          id: dlq.id,
                          eventId: dlq.eventId,
                          endpointId: dlq.endpointId,
                          eventType: dlq.eventType,
                          sourceOrigin: dlq.sourceOrigin || 'internal-service',
                          payload: dlq.payload,
                          status: 'DLQ',
                          httpStatus: null,
                          latencyMs: 0,
                          attempt: 3,
                          createdAt: dlq.createdAt,
                          errorReason: dlq.errorReason,
                        })
                      }
                      className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Inspect Payload</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-[#27272a]" />

                    <DropdownMenuItem
                      onClick={() => handleCopy(dlq.eventId, 'Event ID')}
                      className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Event ID</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleCopy(dlq.errorReason, 'Error Reason')}
                      className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Error Reason</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
