import type { EndpointMetrics } from '../server/endpoints.js';
import { Card, CardContent } from './ui/card.js';
import { Server, Radio, CheckCircle2, AlertOctagon } from 'lucide-react';

interface MetricsCardsProps {
  endpoints: EndpointMetrics[];
}

export function MetricsCards({ endpoints }: MetricsCardsProps) {
  const totalDeliveries = endpoints.reduce((acc, ep) => acc + ep.totalDeliveries, 0);
  const totalSuccess = endpoints.reduce((acc, ep) => acc + ep.successCount, 0);
  const totalDlq = endpoints.reduce((acc, ep) => acc + ep.activeDlqCount, 0);
  const activeCount = endpoints.filter((e) => e.isActive).length;
  const aggregateSuccessRate = totalDeliveries > 0 ? Math.round((totalSuccess / totalDeliveries) * 100) : 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Endpoints Card */}
      <Card className="bg-[#18181b] border-[#27272a] hover:border-[#3f3f46] transition-colors py-4">
        <CardContent className="flex flex-col justify-between p-4 pt-0 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#a1a1aa] tracking-wide uppercase">
              Endpoints
            </span>
            <Server className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#f4f4f5]">{endpoints.length}</span>
            <span className="text-[11px] text-[#71717a] font-mono">({activeCount} active)</span>
          </div>
          <div className="text-[11px] text-[#71717a] flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Partitions allocated</span>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Card */}
      <Card className="bg-[#18181b] border-[#27272a] hover:border-[#3f3f46] transition-colors py-4">
        <CardContent className="flex flex-col justify-between p-4 pt-0 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#a1a1aa] tracking-wide uppercase">
              Deliveries
            </span>
            <Radio className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#f4f4f5]">{totalDeliveries}</span>
            <span className="text-[11px] text-[#71717a] font-mono">({totalSuccess} ok)</span>
          </div>
          <div className="text-[11px] text-[#71717a] flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
            <span>Kafka message stream</span>
          </div>
        </CardContent>
      </Card>

      {/* Success Rate Card */}
      <Card className="bg-[#18181b] border-[#27272a] hover:border-[#3f3f46] transition-colors py-4">
        <CardContent className="flex flex-col justify-between p-4 pt-0 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#a1a1aa] tracking-wide uppercase">
              Success Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{aggregateSuccessRate}%</span>
          </div>
          <div className="text-[11px] text-[#71717a] flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Across all retries</span>
          </div>
        </CardContent>
      </Card>

      {/* Dead Letters Card */}
      <Card className="bg-[#18181b] border-[#27272a] hover:border-[#3f3f46] transition-colors py-4">
        <CardContent className="flex flex-col justify-between p-4 pt-0 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#a1a1aa] tracking-wide uppercase">
              Dead Letters
            </span>
            <AlertOctagon className={`w-4 h-4 ${totalDlq > 0 ? 'text-rose-500' : 'text-zinc-600'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                totalDlq > 0 ? 'text-rose-400' : 'text-[#71717a]'
              }`}
            >
              {totalDlq}
            </span>
            <span className="text-[11px] text-[#71717a]">awaiting replay</span>
          </div>
          <div className="text-[11px] text-[#71717a] flex items-center gap-1.5 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${totalDlq > 0 ? 'bg-rose-500' : 'bg-zinc-600'}`} />
            <span>Poison-pill isolation</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
