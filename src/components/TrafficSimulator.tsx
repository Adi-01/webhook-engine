import { useState } from 'react';
import { EVENT_TEMPLATES, DEFAULT_EVENT_TYPE } from '../lib/event-templates.js';
import { Card, CardContent } from './ui/card.js';
import { Button } from './ui/button.js';
import { Badge } from './ui/badge.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select.js';
import { Send, Zap, Eye, EyeOff, Layers, FileCode } from 'lucide-react';

interface TrafficSimulatorProps {
  endpointId?: string;
  isActive: boolean;
  onSendEvent: (eventType: string, payload: Record<string, any>, sourceOrigin?: string) => Promise<void>;
  onTriggerBurst: () => Promise<void>;
  isSending: boolean;
  isBursting: boolean;
}

const DEFAULT_SERVICE_FOR_EVENT: Record<string, string> = {
  'payment.captured': 'billing-service',
  'invoice.created': 'billing-service',
  'subscription.renewed': 'subscription-service',
  'customer.created': 'auth-service',
  'order.fulfilled': 'orders-service',
};

const SERVICE_OPTIONS = [
  'billing-service',
  'orders-service',
  'auth-service',
  'subscription-service',
  'inventory-service',
];

export function TrafficSimulator({
  isActive,
  onSendEvent,
  onTriggerBurst,
  isSending,
  isBursting,
}: TrafficSimulatorProps) {
  const [selectedType, setSelectedType] = useState<string>(DEFAULT_EVENT_TYPE);
  const [selectedSource, setSelectedSource] = useState<string>(
    DEFAULT_SERVICE_FOR_EVENT[DEFAULT_EVENT_TYPE] || 'billing-service'
  );
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);

  const currentTemplate = EVENT_TEMPLATES[selectedType] || EVENT_TEMPLATES[DEFAULT_EVENT_TYPE];

  const handleEventTypeChange = (newType: string) => {
    setSelectedType(newType);
    if (DEFAULT_SERVICE_FOR_EVENT[newType]) {
      setSelectedSource(DEFAULT_SERVICE_FOR_EVENT[newType]);
    }
  };

  const handleSend = () => {
    const freshPayload = {
      ...currentTemplate.payload,
      _simulatedAt: new Date().toISOString(),
    };
    onSendEvent(currentTemplate.type, freshPayload, selectedSource);
  };

  return (
    <Card className="bg-[#18181b] border-[#27272a] py-4 min-w-0 w-full shadow-xs">
      <CardContent className="flex flex-col gap-3 p-4 pt-0 min-w-0">
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
          {/* Left: Compact Title */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-[#f4f4f5]">Traffic Simulator</span>
            <Badge
              variant="outline"
              className="bg-emerald-950/60 text-emerald-400 border-emerald-800/40 text-[10px] font-mono gap-1 py-0.5"
            >
              <Layers className="w-2.5 h-2.5" />
              <span>webhook.events</span>
            </Badge>
          </div>

          {/* Right: Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {/* Event Type Select */}
            <Select value={selectedType} onValueChange={handleEventTypeChange}>
              <SelectTrigger size="sm" className="bg-[#09090b] border-[#27272a] text-xs font-mono h-8 min-w-[170px]">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-[#f4f4f5]">
                {Object.values(EVENT_TEMPLATES).map((tmpl) => (
                  <SelectItem key={tmpl.type} value={tmpl.type} className="text-xs font-mono cursor-pointer hover:bg-[#27272a]">
                    {tmpl.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source Origin Select */}
            <Select value={selectedSource} onValueChange={(val) => setSelectedSource(val)}>
              <SelectTrigger size="sm" className="bg-[#09090b] border-[#27272a] text-xs font-mono h-8 min-w-[150px] text-zinc-300">
                <span className="text-zinc-500 mr-1 text-[11px]">from:</span>
                <SelectValue placeholder="Source service" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-[#f4f4f5]">
                {SERVICE_OPTIONS.map((srv) => (
                  <SelectItem key={srv} value={srv} className="text-xs font-mono cursor-pointer hover:bg-[#27272a]">
                    {srv}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Buttons Group */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPayloadPreview(!showPayloadPreview)}
                className="bg-[#27272a] border-[#27272a] text-[#d4d4d8] hover:text-[#f4f4f5] hover:bg-[#3f3f46] text-xs h-8 gap-1.5"
                title="Preview JSON Payload"
              >
                {showPayloadPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{showPayloadPreview ? 'Hide' : 'Preview'}</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleSend}
                disabled={isSending || isBursting || !isActive}
                className="bg-[#27272a] text-[#f4f4f5] hover:bg-[#3f3f46] border border-[#3f3f46]/60 text-xs h-8 font-mono gap-1.5"
              >
                <Send className="w-3 h-3 text-emerald-400" />
                <span>{isSending ? 'Sending...' : 'Send Event'}</span>
              </Button>

              <Button
                size="sm"
                onClick={onTriggerBurst}
                disabled={isSending || isBursting || !isActive}
                className="bg-[#f4f4f5] text-[#09090b] hover:bg-[#e4e4e7] font-semibold text-xs h-8 gap-1.5"
              >
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{isBursting ? 'Bursting...' : '50 Burst'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* JSON Payload Preview */}
        {showPayloadPreview && (
          <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-3 flex flex-col gap-1.5 min-w-0 mt-1">
            <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] font-mono">
              <span className="flex items-center gap-1">
                <FileCode className="w-3 h-3 text-emerald-400" />
                <span>Payload: <span className="text-emerald-400">{selectedType}</span></span>
              </span>
              <span className="text-[10px] text-[#71717a] font-sans truncate">{currentTemplate.description}</span>
            </div>
            <pre className="font-mono text-[11px] text-[#a1a1aa] overflow-x-auto max-h-40 leading-relaxed p-1">
              {JSON.stringify(currentTemplate.payload, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
