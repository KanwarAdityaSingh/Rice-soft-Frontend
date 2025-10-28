import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { X } from 'lucide-react';
import { leadsAPI } from '../../../services/leads.api';
import type { CreateLeadEventRequest } from '../../../types/entities';

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onSuccess?: () => void;
}

const EVENT_TYPES = [
  'note_added',
  'call_made',
  'email_sent',
  'meeting_scheduled',
  'meeting_completed',
  'quote_sent',
  'follow_up',
  'priority_changed',
  'value_updated',
  'close_date_updated',
];

export function AddEventDialog({ open, onOpenChange, leadId, onSuccess }: AddEventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState<string>('note_added');
  const [description, setDescription] = useState('');
  const [metadataText, setMetadataText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let metadata: Record<string, any> | undefined;
    if (metadataText.trim()) {
      try {
        metadata = JSON.parse(metadataText);
      } catch {
        setError('Metadata must be valid JSON');
        setLoading(false);
        return;
      }
    }

    const payload: CreateLeadEventRequest = {
      lead_id: leadId,
      event_type: eventType,
      event_description: description || undefined,
      metadata,
    };

    try {
      await leadsAPI.addLeadEvent(payload);
      onSuccess?.();
      onOpenChange(false);
      setDescription('');
      setMetadataText('');
      setEventType('note_added');
    } catch (err: any) {
      setError(err?.message || 'Failed to add event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-w-lg w-full translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">Add Lead Event</Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  rows={3}
                  placeholder="Add event notes..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Metadata (JSON)</label>
                <textarea
                  value={metadataText}
                  onChange={(e) => setMetadataText(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary font-mono"
                  rows={3}
                  placeholder='{"key": "value"}'
                />
                {error && (
                  <p className="text-xs text-destructive mt-1">{error}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Adding...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


