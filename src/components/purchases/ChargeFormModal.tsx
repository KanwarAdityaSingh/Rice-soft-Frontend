import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { CreatePaymentAdviceChargeRequest } from '../../types/entities';

interface ChargeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (charge: CreatePaymentAdviceChargeRequest) => Promise<void>;
}

export function ChargeFormModal({ open, onOpenChange, onSubmit }: ChargeFormModalProps) {
  const [formData, setFormData] = useState<CreatePaymentAdviceChargeRequest>({
    charge_name: '',
    charge_value: 0,
    charge_type: 'fixed',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.charge_name.trim()) {
      newErrors.charge_name = 'Charge name is required';
    }
    if (formData.charge_value <= 0) {
      newErrors.charge_value = 'Charge value must be greater than 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        charge_name: '',
        charge_value: 0,
        charge_type: 'fixed',
      });
      setErrors({});
      onOpenChange(false);
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Failed to add charge' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      charge_name: '',
      charge_value: 0,
      charge_type: 'fixed',
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-xl p-6 w-full max-w-md z-50 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Add Charge</Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Charge Name *</label>
              <input
                type="text"
                value={formData.charge_name}
                onChange={(e) => setFormData({ ...formData, charge_name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                placeholder="CD 2.0%, RTGS Charges, etc."
              />
              {errors.charge_name && <p className="mt-1 text-xs text-red-600">{errors.charge_name}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Charge Type *</label>
              <select
                value={formData.charge_type}
                onChange={(e) =>
                  setFormData({ ...formData, charge_type: e.target.value as 'fixed' | 'percentage' })
                }
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Charge Value *</label>
              <input
                type="number"
                value={formData.charge_value || ''}
                onChange={(e) =>
                  setFormData({ ...formData, charge_value: parseFloat(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                min="0"
                step="0.01"
                placeholder={formData.charge_type === 'percentage' ? '2.0' : '0.00'}
              />
              {errors.charge_value && <p className="mt-1 text-xs text-red-600">{errors.charge_value}</p>}
            </div>

            {errors.submit && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? 'Adding...' : 'Add Charge'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

