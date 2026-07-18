import { useState } from 'react';

interface MarkPaidModalProps {
  open: boolean;
  publicRef: string;
  amountLabel: string;
  onClose: () => void;
  onSubmit: (paymentReference: string, notes?: string) => Promise<void>;
}

export function MarkPaidModal({
  open,
  publicRef,
  amountLabel,
  onClose,
  onSubmit,
}: MarkPaidModalProps) {
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(reference.trim(), notes.trim() || undefined);
      setReference('');
      setNotes('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-violet-950/30 backdrop-blur-sm">
      <div className="coupon-card p-6 max-w-md w-full">
        <h2 className="text-lg font-bold text-violet-950">Mark as paid</h2>
        <p className="text-sm text-violet-500 mt-1">
          {publicRef} · Pay {amountLabel} via UPI/bank first
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-violet-600">
              Payment reference *
            </label>
            <input
              className="coupon-input mt-1"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UPI987654321"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-violet-600">Notes</label>
            <input
              className="coupon-input mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paid via PhonePe"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="coupon-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="coupon-btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Confirm paid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface BulkMarkPaidModalProps {
  open: boolean;
  count: number;
  onClose: () => void;
  onSubmit: (
    items: { redemption_id: string; payment_reference: string }[],
    notes?: string
  ) => Promise<{ succeeded: number; failed: number }>;
  redemptionIds: string[];
}

export function BulkMarkPaidModal({
  open,
  count,
  onClose,
  onSubmit,
  redemptionIds,
}: BulkMarkPaidModalProps) {
  const [sharedRef, setSharedRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ succeeded: number; failed: number } | null>(
    null
  );

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const items = redemptionIds.map((id, i) => ({
        redemption_id: id,
        payment_reference: sharedRef
          ? `${sharedRef}-${i + 1}`
          : `BULK-${Date.now()}-${i + 1}`,
      }));
      const res = await onSubmit(items, notes || undefined);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-violet-950/30 backdrop-blur-sm">
      <div className="coupon-card p-6 max-w-md w-full">
        <h2 className="text-lg font-bold text-violet-950">Bulk mark paid</h2>
        <p className="text-sm text-violet-500">{count} redemptions selected</p>
        {result ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-emerald-600">✓ {result.succeeded} succeeded</p>
            {result.failed > 0 && (
              <p className="text-rose-600">✗ {result.failed} failed</p>
            )}
            <button type="button" className="coupon-btn-primary mt-3" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-violet-600">
                Shared reference prefix
              </label>
              <input
                className="coupon-input mt-1"
                value={sharedRef}
                onChange={(e) => setSharedRef(e.target.value)}
                placeholder="UPI-BATCH-2026"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-violet-600">Notes</label>
              <input
                className="coupon-input mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="coupon-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="coupon-btn-primary" disabled={loading}>
                {loading ? 'Processing…' : 'Mark all paid'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
