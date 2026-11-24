import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { getEndpoints, toggleEndpoint } from '../server/endpoints.js';
import { MetricsCards } from '../components/MetricsCards.js';
import { EndpointsTable } from '../components/EndpointsTable.js';
import { CreateEndpointModal } from '../components/CreateEndpointModal.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import { Plus, Radio } from 'lucide-react';

export const Route = createFileRoute('/')({
  loader: async () => {
    return getEndpoints();
  },
  component: EndpointsDashboard,
});

function EndpointsDashboard() {
  const endpoints = Route.useLoaderData();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToggle = async (id: string, current: boolean) => {
    await toggleEndpoint({ data: { id, isActive: !current } });
    router.invalidate();
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f4f4f5]">
              Distributed Webhook Engine
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-950/70 text-emerald-400 border-emerald-800/50 text-[10px] font-mono gap-1 py-0.5"
            >
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              <span>Kafka KRaft 9092</span>
            </Badge>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1">
            Strict FIFO per-tenant partitioning • Tiered 1s/3s non-blocking retries • Real-time telemetry
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="bg-[#f4f4f5] text-[#09090b] hover:bg-[#e4e4e7] text-xs font-semibold shadow-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Endpoint</span>
          </Button>
        </div>
      </div>

      {/* Aggregate Metrics Cards */}
      <MetricsCards endpoints={endpoints} />

      {/* Endpoints Table (Strict Fixed Column Widths across devices) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
            Registered Webhook Destinations
          </h2>
          <span className="text-[11px] font-mono text-[#71717a]">
            {endpoints.length} endpoints
          </span>
        </div>

        <EndpointsTable
          endpoints={endpoints}
          onToggleActive={handleToggle}
          onOpenCreateModal={() => setIsModalOpen(true)}
        />
      </div>

      {/* Clean Modal for Endpoint Creation */}
      <CreateEndpointModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => router.invalidate()}
      />
    </div>
  );
}
