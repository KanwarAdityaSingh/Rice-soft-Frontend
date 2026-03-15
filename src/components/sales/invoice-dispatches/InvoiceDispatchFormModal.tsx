import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { useSalesSaudas } from '../../../hooks/useSalesSaudas';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicles } from '../../../hooks/useVehicles';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { toast } from '../../../utils/toast';
import type { CreateInvoiceDispatchRequest } from '../../../types/sales';

interface InvoiceDispatchFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InvoiceDispatchFormModal({
  open,
  onOpenChange,
  onSuccess,
}: InvoiceDispatchFormModalProps) {
  const { create } = useInvoiceDispatches();
  const { salesSaudas } = useSalesSaudas({ status: 'order' });
  const { transporters } = useTransporters();
  const { vehicles } = useVehicles();

  const [formData, setFormData] = useState<CreateInvoiceDispatchRequest>({
    sales_sauda_id: '',
    internal_invoice_number: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    transporter_id: null,
    vehicle_id: null,
    distance_km: undefined,
    route_description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        sales_sauda_id: '',
        internal_invoice_number: '',
        dispatch_date: new Date().toISOString().split('T')[0],
        transporter_id: null,
        vehicle_id: null,
        distance_km: undefined,
        route_description: '',
      });
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.sales_sauda_id) e.sales_sauda_id = 'Select a sales order';
    if (!formData.internal_invoice_number?.trim())
      e.internal_invoice_number = 'Internal invoice number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await create({
        ...formData,
        internal_invoice_number: formData.internal_invoice_number.trim(),
        dispatch_date: formData.dispatch_date || undefined,
        transporter_id: formData.transporter_id || undefined,
        vehicle_id: formData.vehicle_id || undefined,
      });
      toast.success(
        'Invoice dispatch created',
        'Inventory will be deducted when you confirm this dispatch.'
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border bg-background p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">New Invoice Dispatch</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sales Order (finalized sauda)</label>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={formData.sales_sauda_id}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, sales_sauda_id: e.target.value }))
                }
              >
                <option value="">Select order</option>
                {salesSaudas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.order_number ?? s.id.slice(0, 8)} – {s.sauda_date}
                  </option>
                ))}
              </select>
              {errors.sales_sauda_id && (
                <p className="mt-1 text-xs text-red-600">{errors.sales_sauda_id}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Internal Invoice Number</label>
              <input
                type="text"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={formData.internal_invoice_number}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, internal_invoice_number: e.target.value }))
                }
              />
              {errors.internal_invoice_number && (
                <p className="mt-1 text-xs text-red-600">{errors.internal_invoice_number}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dispatch Date</label>
              <input
                type="date"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={formData.dispatch_date ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, dispatch_date: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Transporter</label>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={formData.transporter_id ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    transporter_id: e.target.value || null,
                  }))
                }
              >
                <option value="">None</option>
                {transporters.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.business_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vehicle</label>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={formData.vehicle_id ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, vehicle_id: e.target.value || null }))
                }
              >
                <option value="">None</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Distance (km)</label>
              <input
                type="number"
                min={0}
                step="any"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={formData.distance_km ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    distance_km: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Route</label>
              <textarea
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px]"
                value={formData.route_description ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, route_description: e.target.value || null }))
                }
              />
            </div>
            {errors.submit && (
              <p className="text-sm text-red-600">{errors.submit}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
