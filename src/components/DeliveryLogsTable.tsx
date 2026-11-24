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
import { Radio, Eye, CheckCircle2, AlertTriangle, AlertOctagon, MoreHorizontal, Copy, FileCode } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryLogsTableProps {
  logs: DeliveryLogRecord[];
  onSelectLog: (log: DeliveryLogRecord) => void;
}

export function DeliveryLogsTable({ logs, onSelectLog }: DeliveryLogsTableProps) {
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  if (logs.length === 0) {
    return (
      <div className="p-12 text-center text-xs text-[#71717a] flex flex-col items-center justify-center gap-2">
        <Radio className="w-6 h-6 text-zinc-500 animate-pulse" />
        <span className="text-[#a1a1aa] font-medium">No delivery attempts recorded yet</span>
        <span>Select an event type above and click "Send Event" or "50 Burst".</span>
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
            <TableHead className="py-2.5 px-3 font-medium w-[210px] min-w-[210px] text-[#71717a]">Event Type</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[85px] min-w-[85px] text-center text-[#71717a]">Attempt</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[85px] min-w-[85px] text-center text-[#71717a]">HTTP</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[95px] min-w-[95px] text-right text-[#71717a]">Latency</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[105px] min-w-[105px] text-right text-[#71717a]">Time</TableHead>
            <TableHead className="py-2.5 px-3 font-medium w-[70px] min-w-[70px] text-center text-[#71717a]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#27272a] font-mono text-[11px] text-[#d4d4d8]">
          {logs.map((log, idx) => (
            <TableRow
              key={`${log.id || log.eventId}-${idx}`}
              onClick={() => onSelectLog(log)}
              className="border-b border-[#27272a] hover:bg-[#202023] transition-colors cursor-pointer group"
            >
              {/* S.No */}
              <TableCell className="py-2.5 px-3 text-center text-[#71717a] text-[10px] w-[50px] min-w-[50px]">
                {idx + 1}
              </TableCell>

              {/* Status Badge */}
              <TableCell className="py-2.5 px-3 w-[110px] min-w-[110px]">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40'
                      : log.status === 'FAILED'
                      ? 'bg-amber-950/80 text-amber-400 border-amber-800/40'
                      : 'bg-rose-950/80 text-rose-400 border-rose-800/40'
                  }`}
                >
                  {log.status === 'SUCCESS' && <CheckCircle2 className="w-2.5 h-2.5" />}
                  {log.status === 'FAILED' && <AlertTriangle className="w-2.5 h-2.5" />}
                  {log.status === 'DLQ' && <AlertOctagon className="w-2.5 h-2.5" />}
                  <span>{log.status}</span>
                </Badge>
              </TableCell>

              {/* Event ID */}
              <TableCell className="py-2.5 px-3 text-[#a1a1aa] truncate w-[180px] min-w-[180px]" title={log.eventId}>
                {log.eventId}
              </TableCell>

              {/* Event Type & Source Origin */}
              <TableCell className="py-2.5 px-3 truncate w-[210px] min-w-[210px]">
                <div className="font-semibold text-[#f4f4f5] truncate" title={log.eventType}>
                  {log.eventType}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono truncate flex items-center gap-1">
                  <span>from:</span>
                  <span className="text-zinc-400 font-medium">{log.sourceOrigin || 'internal-service'}</span>
                </div>
              </TableCell>

              {/* Attempt */}
              <TableCell className="py-2.5 px-3 text-center text-[#a1a1aa] w-[85px] min-w-[85px]">
                <span className="text-[#f4f4f5] font-semibold">{log.attempt}</span>/3
              </TableCell>

              {/* HTTP Code */}
              <TableCell className="py-2.5 px-3 text-center w-[85px] min-w-[85px]">
                {log.httpStatus ? (
                  <span
                    className={
                      log.httpStatus === 200
                        ? 'text-emerald-400 font-semibold'
                        : 'text-amber-400 font-semibold'
                    }
                  >
                    {log.httpStatus}
                  </span>
                ) : (
                  <span className="text-[#71717a]">—</span>
                )}
              </TableCell>

              {/* Latency */}
              <TableCell className="py-2.5 px-3 text-right text-[#a1a1aa] w-[95px] min-w-[95px]">
                {log.latencyMs}ms
              </TableCell>

              {/* Time */}
              <TableCell className="py-2.5 px-3 text-right text-[#71717a] text-[10px] w-[105px] min-w-[105px]">
                {new Date(log.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
                    <DropdownMenuItem
                      onClick={() => onSelectLog(log)}
                      className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Inspect Details</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleCopy(log.eventId, 'Event ID')}
                      className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Event ID</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#27272a]" />
                    <DropdownMenuItem
                      onClick={() => handleCopy(JSON.stringify(log.payload, null, 2), 'JSON Payload')}
                      className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5"
                    >
                      <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Payload JSON</span>
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
