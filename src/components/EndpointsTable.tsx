import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { EndpointMetrics } from '../server/endpoints.js';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './ui/table.js';
import { Button } from './ui/button.js';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu.js';
import { Copy, Check, Radio, MoreHorizontal, ExternalLink, KeyRound, Power } from 'lucide-react';

interface EndpointsTableProps {
  endpoints: EndpointMetrics[];
  onToggleActive: (id: string, current: boolean) => Promise<void>;
  onOpenCreateModal: () => void;
}

export function EndpointsTable({
  endpoints,
  onToggleActive,
  onOpenCreateModal,
}: EndpointsTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (endpoints.length === 0) {
    return (
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#27272a] flex items-center justify-center text-zinc-400">
          <Radio className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-[#f4f4f5]">No Webhook Endpoints Configured</h3>
        <p className="text-xs text-[#a1a1aa] max-w-sm">
          Register your first webhook endpoint to start routing events through Kafka partition keys.
        </p>
        <Button
          onClick={onOpenCreateModal}
          size="sm"
          className="mt-2 bg-[#f4f4f5] text-[#09090b] hover:bg-[#e4e4e7] text-xs font-semibold shadow-xs"
        >
          + Add First Endpoint
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto w-full">
        <Table className="min-w-[1010px] w-full text-left text-xs table-fixed">
          <TableHeader>
            <TableRow className="border-b border-[#27272a] hover:bg-transparent text-[11px] uppercase tracking-wider text-[#71717a] bg-[#121214]">
              <TableHead className="py-3 px-3 font-medium w-[50px] min-w-[50px] text-center text-[#71717a]">#</TableHead>
              <TableHead className="py-3 px-4 font-medium w-[220px] min-w-[220px] text-[#71717a]">Endpoint</TableHead>
              <TableHead className="py-3 px-4 font-medium w-[320px] min-w-[320px] text-[#71717a]">Target Destination</TableHead>
              <TableHead className="py-3 px-4 font-medium w-[170px] min-w-[170px] text-[#71717a]">Signing Secret</TableHead>
              <TableHead className="py-3 px-4 font-medium w-[90px] min-w-[90px] text-center text-[#71717a]">Status</TableHead>
              <TableHead className="py-3 px-4 font-medium w-[90px] min-w-[90px] text-right text-[#71717a]">Success</TableHead>
              <TableHead className="py-3 px-4 font-medium w-[70px] min-w-[70px] text-center text-[#71717a]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#27272a] text-[#d4d4d8]">
            {endpoints.map((ep, idx) => (
              <TableRow key={ep.id} className="border-b border-[#27272a] hover:bg-[#202023] transition-colors group">
                {/* S.No */}
                <TableCell className="py-3.5 px-3 text-center text-[#71717a] text-[10px] w-[50px] min-w-[50px]">
                  {idx + 1}
                </TableCell>

                {/* Name & ID */}
                <TableCell className="py-3.5 px-4 w-[220px] min-w-[220px]">
                  <div className="flex flex-col truncate">
                    <Link
                      to="/endpoints/$endpointId"
                      params={{ endpointId: ep.id }}
                      className="font-medium text-[#f4f4f5] hover:underline truncate"
                      title={ep.name}
                    >
                      {ep.name}
                    </Link>
                    <span className="text-[10px] font-mono text-[#71717a] truncate" title={ep.id}>
                      {ep.id}
                    </span>
                  </div>
                </TableCell>

                {/* Target URL */}
                <TableCell className="py-3.5 px-4 font-mono text-[11px] w-[320px] min-w-[320px]">
                  <div className="flex items-center gap-1.5 max-w-full">
                    <span className="truncate text-[#a1a1aa]" title={ep.url}>
                      {ep.url}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ep.url, `url_${ep.id}`)}
                      className="text-[#71717a] hover:text-[#f4f4f5] p-1 rounded hover:bg-[#27272a] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy URL"
                    >
                      {copiedId === `url_${ep.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </TableCell>

                {/* Signing Secret */}
                <TableCell className="py-3.5 px-4 font-mono text-[11px] w-[170px] min-w-[170px]">
                  <div className="flex items-center gap-1.5 max-w-full">
                    <span className="truncate text-[#71717a]" title={ep.secret}>
                      {ep.secret.slice(0, 10)}•••
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ep.secret, `sec_${ep.id}`)}
                      className="text-[#71717a] hover:text-[#f4f4f5] p-1 rounded hover:bg-[#27272a] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy secret"
                    >
                      {copiedId === `sec_${ep.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="py-3.5 px-4 text-center w-[90px] min-w-[90px]">
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                      ep.isActive
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {ep.isActive ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </TableCell>

                {/* Success Rate & Deliveries */}
                <TableCell className="py-3.5 px-4 text-right font-mono text-[11px] w-[90px] min-w-[90px]">
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-semibold ${
                        ep.totalDeliveries === 0
                          ? 'text-[#71717a]'
                          : ep.successRate >= 90
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {ep.totalDeliveries > 0 ? `${ep.successRate}%` : '—'}
                    </span>
                    <span className="text-[10px] text-[#71717a]">
                      {ep.totalDeliveries} pkts
                    </span>
                  </div>
                </TableCell>

                {/* Ellipsis Actions Dropdown */}
                <TableCell className="py-3.5 px-4 text-center w-[70px] min-w-[70px]">
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
                      <DropdownMenuItem asChild className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5">
                        <Link to="/endpoints/$endpointId" params={{ endpointId: ep.id }}>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Monitor Telemetry</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCopy(ep.url, `url_${ep.id}`)}
                        className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5"
                      >
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copy URL</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCopy(ep.secret, `sec_${ep.id}`)}
                        className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copy Secret</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#27272a]" />
                      <DropdownMenuItem
                        onClick={() => onToggleActive(ep.id, ep.isActive)}
                        className="cursor-pointer hover:bg-[#27272a] gap-2 py-1.5"
                      >
                        <Power className="w-3.5 h-3.5 text-amber-400" />
                        <span>{ep.isActive ? 'Pause Endpoint' : 'Resume Endpoint'}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
