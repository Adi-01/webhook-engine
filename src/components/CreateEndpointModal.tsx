import { useState } from 'react';
import { createEndpoint } from '../server/endpoints.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Sparkles, Globe, KeyRound } from 'lucide-react';

interface CreateEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEndpointModal({ isOpen, onClose, onSuccess }: CreateEndpointModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuickFill = (type: 'healthy' | 'flaky') => {
    if (type === 'healthy') {
      setName('Internal Healthy Receiver (200 OK)');
      setUrl('http://localhost:3000/api/mock-receiver/healthy');
      setSecret('whsec_healthy_preset_secret');
    } else {
      setName('Internal Flaky Receiver (60% 503s)');
      setUrl('http://localhost:3000/api/mock-receiver/flaky');
      setSecret('whsec_flaky_preset_secret');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await createEndpoint({
        data: {
          name: name.trim(),
          url: url.trim(),
          secret: secret.trim() || undefined,
        },
      });
      setName('');
      setUrl('');
      setSecret('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register endpoint');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-[#18181b] border-[#27272a] text-[#f4f4f5] p-6 shadow-2xl">
        <DialogHeader className="gap-1 border-b border-[#27272a] pb-4">
          <DialogTitle className="text-base font-semibold text-[#f4f4f5]">
            Register Webhook Endpoint
          </DialogTitle>
          <DialogDescription className="text-xs text-[#a1a1aa]">
            Add a target destination server to receive signed event deliveries.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 text-xs pt-1">
          <span className="text-[#71717a] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Presets:</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleQuickFill('healthy')}
            className="bg-[#27272a] text-emerald-400 hover:bg-[#3f3f46] border-[#3f3f46]/60 text-[11px] font-mono h-6"
          >
            + Healthy Mock (200 OK)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleQuickFill('flaky')}
            className="bg-[#27272a] text-amber-400 hover:bg-[#3f3f46] border-[#3f3f46]/60 text-[11px] font-mono h-6"
          >
            + Flaky Mock (60% 503)
          </Button>
        </div>

        {errorMsg && (
          <div className="text-xs p-3 rounded-lg bg-rose-950/40 text-rose-400 border border-rose-900/50">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#d4d4d8]">
              Endpoint Name <span className="text-rose-400">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Email Invoicing Service, Stripe Webhook Receiver"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#09090b] border-[#27272a] text-xs text-[#f4f4f5] h-9"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#d4d4d8] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-zinc-500" />
              <span>Destination URL <span className="text-rose-400">*</span></span>
            </label>
            <Input
              type="url"
              required
              placeholder="https://webhook.site/... or https://api.mycompany.com/webhooks"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-[#09090b] border-[#27272a] text-xs font-mono text-[#f4f4f5] h-9"
            />
            <span className="text-[11px] text-[#71717a]">
              Must be reachable via HTTP or HTTPS. Test with Webhook.site for live inspections.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#d4d4d8] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
              <span>HMAC Signing Secret <span className="text-[#71717a] font-normal">(optional)</span></span>
            </label>
            <Input
              type="text"
              placeholder="Leave blank to auto-generate cryptographically secure whsec_..."
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="bg-[#09090b] border-[#27272a] text-xs font-mono text-[#f4f4f5] h-9"
            />
            <span className="text-[11px] text-[#71717a]">
              Used to calculate the <code className="text-[#a1a1aa]">X-Webhook-Signature</code> header.
            </span>
          </div>

          <DialogFooter className="border-t border-[#27272a] pt-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim() || !url.trim()}
              className="bg-[#f4f4f5] text-[#09090b] hover:bg-[#e4e4e7] text-xs font-semibold"
            >
              {isSubmitting ? 'Registering...' : 'Register Endpoint'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
