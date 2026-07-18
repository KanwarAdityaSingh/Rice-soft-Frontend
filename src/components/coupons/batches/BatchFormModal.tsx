import { useState } from 'react';
import type { CreateCouponBatchRequest } from '../../../types/coupons';
import { rupeesInputToPaise } from '../../../utils/couponFormat';

interface BatchFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCouponBatchRequest) => Promise<void>;
}

export function BatchFormModal({ open, onClose, onSubmit }: BatchFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [faceValue, setFaceValue] = useState('50');
  const [totalCount, setTotalCount] = useState('1000');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        face_value_paise: rupeesInputToPaise(faceValue),
        total_count: parseInt(totalCount, 10),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-violet-950/30 backdrop-blur-sm">
      <div className="coupon-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold coupon-hero-title">Create coupon batch</h2>
        <p className="text-sm text-violet-500 mt-1">
          Generate physical cashback coupons for distribution
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-violet-600">Batch name *</label>
            <input
              className="coupon-input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="March-2026-1509"
              required
              maxLength={255}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-violet-600">Description</label>
            <textarea
              className="coupon-input mt-1 min-h-[60px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-violet-600">Face value (₹) *</label>
              <input
                className="coupon-input mt-1"
                type="number"
                min="1"
                step="0.01"
                value={faceValue}
                onChange={(e) => setFaceValue(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-violet-600">Total coupons *</label>
              <input
                className="coupon-input mt-1"
                type="number"
                min="1"
                max="500000"
                value={totalCount}
                onChange={(e) => setTotalCount(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-violet-600">Expiry date</label>
            <input
              className="coupon-input mt-1"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-[11px] text-violet-400 mt-1">Leave empty for no expiry</p>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="coupon-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="coupon-btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
