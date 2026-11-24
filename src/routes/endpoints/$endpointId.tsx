import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  getEndpointMonitorData,
  replayDlqEvent,
  triggerBurst,
  sendSingleEvent,
} from '../../server/endpoints.js';
import type { DeliveryLogRecord } from '../../lib/types.js';
import { TrafficSimulator } from '../../components/TrafficSimulator.js';
import { DeliveryLogsTable } from '../../components/DeliveryLogsTable.js';
import { DlqTable, type DlqItem } from '../../components/DlqTable.js';
import { DeliveryDetailModal } from '../../components/DeliveryDetailModal.js';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs.js';
import { Badge } from '../../components/ui/badge.js';
import { ArrowLeft, AlertOctagon, ListFilter } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/endpoints/$endpointId')({
  loader: async ({ params }) => {
    return getEndpointMonitorData({ data: { endpointId: params.endpointId } });
  },
  component: EndpointMonitorPage,
});

function EndpointMonitorPage() {
  const { endpoint, logs: initialLogs, dlqEvents: initialDlq } = Route.useLoaderData();

  const [activeTab, setActiveTab] = useState<'logs' | 'dlq'>('logs');
  const [logs, setLogs] = useState<DeliveryLogRecord[]>(initialLogs as DeliveryLogRecord[]);
  const [dlqEvents, setDlqEvents] = useState<DlqItem[]>(initialDlq as DlqItem[]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSingleSending, setIsSingleSending] = useState(false);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedLog, setSelectedLog] = useState<DeliveryLogRecord | null>(null);

  // Synchronize state when initialLoaderData changes (e.g. initial mount)
  useEffect(() => {
    setLogs(initialLogs as DeliveryLogRecord[]);
    setDlqEvents(initialDlq as DlqItem[]);
  }, [initialLogs, initialDlq]);

  // Connect to real-time Server-Sent Events (SSE) telemetry stream
  useEffect(() => {
    const sseUrl = `/api/stream?endpointId=${encodeURIComponent(endpoint.id)}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const newLog: DeliveryLogRecord = JSON.parse(event.data);

        // Append log smoothly to local state with zero page reloads/flashing
        setLogs((prev) => [newLog, ...prev.slice(0, 99)]);

        // If the event exhausted into DLQ, smoothly append to DLQ state
        if (newLog.status === 'DLQ') {
          setDlqEvents((prev) => {
            if (prev.some((d) => d.eventId === newLog.eventId)) return prev;
            return [
              {
                id: newLog.id || `dlq_${newLog.eventId}`,
                eventId: newLog.eventId,
                endpointId: newLog.endpointId,
                eventType: newLog.eventType,
                sourceOrigin: newLog.sourceOrigin || 'internal-service',
                payload: newLog.payload,
                errorReason: newLog.errorReason || 'Exhausted retry attempts',
                replayed: false,
                createdAt: newLog.createdAt,
              },
              ...prev,
            ];
          });
        }
      } catch (e) {
        // Ping or malformed payload
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [endpoint.id]);

  // Trigger Realistic Webhook Event with smooth 600ms debounce
  const handleSendEvent = async (eventType: string, payload: Record<string, any>, sourceOrigin?: string) => {
    setIsSingleSending(true);
    const startTime = Date.now();
    try {
      const res = await sendSingleEvent({
        data: {
          endpointId: endpoint.id,
          eventType,
          sourceOrigin: sourceOrigin || 'billing-service',
          payload,
        },
      });
      toast.success('Event Dispatched to Kafka', {
        description: `${res.eventId} • ${eventType} (from ${sourceOrigin || 'internal-service'})`,
      });
    } catch (err: any) {
      toast.error('Dispatch Failed', {
        description: err.message,
      });
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed));
      }
      setIsSingleSending(false);
    }
  };

  // Trigger 50-Event Concurrent Burst Simulation with smooth 600ms debounce
  const handleTriggerBurst = async () => {
    setIsSimulating(true);
    const startTime = Date.now();
    try {
      await triggerBurst({
        data: { endpointId: endpoint.id, count: 50 },
      });
      toast.success('50-Event Burst Dispatched', {
        description: '50 concurrent events queued into Kafka topic [webhook.events]',
      });
    } catch (err: any) {
      toast.error('Burst Failed', {
        description: err.message,
      });
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed));
      }
      setIsSimulating(false);
    }
  };

  // DLQ Replay Action with smooth in-place state update
  const handleReplay = async (dlqId: string) => {
    setReplayingId(dlqId);
    const startTime = Date.now();
    try {
      const res = await replayDlqEvent({ data: { dlqId } });
      toast.info('Event Replayed into Kafka', {
        description: `Re-injected: ${res.replayedEventId}`,
      });
      // In-place smooth update without reloading route or flashing screen
      setDlqEvents((prev) =>
        prev.map((d) => (d.id === dlqId ? { ...d, replayed: true } : d))
      );
    } catch (err: any) {
      toast.error('Replay Failed', {
        description: err.message,
      });
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed));
      }
      setReplayingId(null);
    }
  };

  const unplayedDlqCount = dlqEvents.filter((d) => !d.replayed).length;

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 min-w-0">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-2 border-b border-[#27272a] pb-5 min-w-0">
        <Link
          to="/"
          className="text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors inline-flex items-center gap-1.5 w-fit font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Endpoints</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1 min-w-0">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[#f4f4f5] truncate">
                {endpoint.name}
              </h1>
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 ${
                  endpoint.isActive
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {endpoint.isActive ? 'ACTIVE' : 'PAUSED'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
              <span className="font-mono text-[#a1a1aa] truncate max-w-[280px] sm:max-w-md" title={endpoint.url}>
                {endpoint.url}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs bg-[#18181b] border border-[#27272a] px-3 py-1.5 rounded-lg">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-[11px] font-mono text-[#d4d4d8]">
                {isConnected ? 'SSE Live' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Control Panel */}
      <TrafficSimulator
        endpointId={endpoint.id}
        isActive={endpoint.isActive}
        onSendEvent={handleSendEvent}
        onTriggerBurst={handleTriggerBurst}
        isSending={isSingleSending}
        isBursting={isSimulating}
      />

      {/* Tabs Section Outside Table */}
      <div className="flex flex-col gap-3 min-w-0">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'logs' | 'dlq')}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            {/* shadcn TabsList */}
            <TabsList className="bg-[#18181b] border border-[#27272a] p-1 h-9">
              <TabsTrigger
                value="logs"
                className="text-xs font-medium gap-2 data-[state=active]:bg-[#27272a] data-[state=active]:text-[#f4f4f5]"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Live Delivery Logs</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#09090b] text-[#a1a1aa]">
                  {logs.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="dlq"
                className="text-xs font-medium gap-2 data-[state=active]:bg-[#27272a] data-[state=active]:text-[#f4f4f5]"
              >
                <AlertOctagon className={`w-3.5 h-3.5 ${unplayedDlqCount > 0 ? 'text-rose-400' : 'text-zinc-500'}`} />
                <span>Dead Letter Queue</span>
                {unplayedDlqCount > 0 && (
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0.2 bg-rose-950/80 text-rose-300 border-rose-900/50">
                    {unplayedDlqCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {/* Clean Data Table Container (Header is outside) */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden min-w-0">
          {activeTab === 'logs' ? (
            <DeliveryLogsTable
              logs={logs}
              onSelectLog={(log) => setSelectedLog(log)}
            />
          ) : (
            <DlqTable
              dlqEvents={dlqEvents}
              onReplay={handleReplay}
              onInspectPayload={(log) => setSelectedLog(log)}
              replayingId={replayingId}
            />
          )}
        </div>
      </div>

      {/* Delivery Inspection Modal */}
      <DeliveryDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
