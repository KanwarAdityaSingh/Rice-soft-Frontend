import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { useSalesSaudas } from '../../../hooks/useSalesSaudas';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicles } from '../../../hooks/useVehicles';
import { toast } from '../../../utils/toast';
import { useGodowns } from '../../../hooks/useGodowns';
import { DateInputWithSteppers } from '../../shared/DateInputWithSteppers';
import type { CreateInvoiceDispatchRequest } from '../../../types/sales';
import type { SalesPartySite } from '../../../types/entities';
import { salesPartySitesAPI } from '../../../services/salesPartySites.api';
import {
  getTransporterInvoiceDispatchBlockers,
  isTransporterEligibleForInvoiceDispatch,
} from '../../../utils/transporterInvoiceDispatchEligibility';

function formatPartySiteLabel(site: SalesPartySite): string {
  const n = site.name?.trim();
  const line = [site.address?.city, site.address?.state].filter(Boolean).join(', ');
  return n ? `${n}${line ? ` · ${line}` : ''}` : line || site.id.slice(0, 8);
}

const VEHICLE_VERIFIED_ONLY_MESSAGE =
  'Only verified vehicles can be used for invoice dispatch. Verify the vehicle in Directory first.';

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
  const { godowns } = useGodowns(false);

  const [formData, setFormData] = useState<CreateInvoiceDispatchRequest>({
    godown_id: '',
    sales_sauda_id: '',
    internal_invoice_number: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    transporter_id: null,
    vehicle_id: null,
    delivery_site_id: null,
    lr_number: null,
    distance_km: undefined,
    route_description: null,
  });
  const [tcsAmountInput, setTcsAmountInput] = useState('');
  const [partySites, setPartySites] = useState<SalesPartySite[]>([]);
  const [loadingPartySites, setLoadingPartySites] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const selectedTransporter = useMemo(
    () =>
      formData.transporter_id
        ? transporters.find((t) => t.id === formData.transporter_id)
        : undefined,
    [formData.transporter_id, transporters]
  );
  const transporterSelectionBlocked = Boolean(
    selectedTransporter && !isTransporterEligibleForInvoiceDispatch(selectedTransporter)
  );

  const selectedVehicle = useMemo(
    () =>
      formData.vehicle_id ? vehicles.find((v) => v.id === formData.vehicle_id) : undefined,
    [formData.vehicle_id, vehicles]
  );
  const vehicleSelectionBlocked = Boolean(
    selectedVehicle && !selectedVehicle.is_verified
  );

  const selectedSaudaPartyId = useMemo(
    () => salesSaudas.find((s) => s.id === formData.sales_sauda_id)?.sales_party_id,
    [salesSaudas, formData.sales_sauda_id]
  );

  const loadPartySites = useCallback(
    async (salesPartyId: string) => {
      setLoadingPartySites(true);
      try {
        const sites = await salesPartySitesAPI.list(salesPartyId);
        setPartySites(Array.isArray(sites) ? sites : []);
      } catch {
        setPartySites([]);
      } finally {
        setLoadingPartySites(false);
      }
    },
    []
  );

  useEffect(() => {
    if (open) {
      setFormData({
        godown_id: '',
        sales_sauda_id: '',
        internal_invoice_number: '',
        dispatch_date: new Date().toISOString().split('T')[0],
        transporter_id: null,
        vehicle_id: null,
        delivery_site_id: null,
        lr_number: null,
        distance_km: undefined,
        route_description: null,
      });
      setTcsAmountInput('');
      setPartySites([]);
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!formData.sales_sauda_id || !selectedSaudaPartyId) {
      setPartySites([]);
      return;
    }
    setFormData((p) => ({ ...p, delivery_site_id: null }));
    void loadPartySites(selectedSaudaPartyId);
  }, [formData.sales_sauda_id, selectedSaudaPartyId, loadPartySites]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.godown_id) e.godown_id = 'Select dispatch godown (stock will deduct here)';
    if (!formData.sales_sauda_id) e.sales_sauda_id = 'Select a sales order';
    if (!formData.internal_invoice_number?.trim())
      e.internal_invoice_number = 'Internal invoice number is required';
    if (formData.transporter_id) {
      const t = transporters.find((x) => x.id === formData.transporter_id);
      if (t && !isTransporterEligibleForInvoiceDispatch(t)) {
        e.transporter_id = getTransporterInvoiceDispatchBlockers(t).join('. ');
      }
    }
    if (formData.vehicle_id) {
      const v = vehicles.find((x) => x.id === formData.vehicle_id);
      if (v && !v.is_verified) {
        e.vehicle_id = VEHICLE_VERIFIED_ONLY_MESSAGE;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const tcsTrim = tcsAmountInput.trim();
      let tcs_amount: number | undefined;
      if (tcsTrim !== '') {
        const n = Number(tcsTrim);
        if (Number.isNaN(n)) {
          setErrors({ submit: 'TCS amount must be a valid number' });
          setLoading(false);
          return;
        }
        tcs_amount = n;
      }
      await create({
        ...formData,
        internal_invoice_number: formData.internal_invoice_number.trim(),
        dispatch_date: formData.dispatch_date || undefined,
        transporter_id: formData.transporter_id || undefined,
        vehicle_id: formData.vehicle_id || undefined,
        delivery_site_id: formData.delivery_site_id || undefined,
        lr_number: formData.lr_number?.trim() || undefined,
        tcs_amount,
        distance_km: formData.distance_km,
        route_description: formData.route_description?.trim() || undefined,
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
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] sm:w-[90vw] md:w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border border-border/80 bg-background p-6 sm:p-8 shadow-xl">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-tight">
                New Invoice Dispatch
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Link a sales order, dispatch warehouse, and optional logistics details.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="shrink-0 rounded-lg p-2 hover:bg-muted"
                type="button"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Dispatch from godown *</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Stock is fulfilled from this warehouse — not from the sales order.
              </p>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={formData.godown_id}
                onChange={(e) => setFormData((p) => ({ ...p, godown_id: e.target.value }))}
              >
                <option value="">Select godown</option>
                {godowns
                  .filter((g) => g.is_active)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </select>
              {errors.godown_id && <p className="mt-1 text-xs text-red-600">{errors.godown_id}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Sales Order (finalized sauda)
              </label>
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
              <label className="mb-1 block text-sm font-medium">Internal Invoice Number</label>
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
              <label className="mb-1 block text-sm font-medium">Dispatch Date</label>
              <DateInputWithSteppers
                className="w-full"
                inputClassName="py-2 text-sm"
                value={formData.dispatch_date ?? ''}
                onChange={(v) => setFormData((p) => ({ ...p, dispatch_date: v }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Transporter</label>
              <select
                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${
                  errors.transporter_id ? 'border-red-500' : ''
                }`}
                aria-invalid={Boolean(errors.transporter_id)}
                value={formData.transporter_id ?? ''}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setFormData((p) => ({ ...p, transporter_id: id }));
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (!id) {
                      delete next.transporter_id;
                      return next;
                    }
                    const t = transporters.find((x) => x.id === id);
                    if (t && !isTransporterEligibleForInvoiceDispatch(t)) {
                      next.transporter_id = getTransporterInvoiceDispatchBlockers(t).join('. ');
                    } else {
                      delete next.transporter_id;
                    }
                    return next;
                  });
                }}
              >
                <option value="">None</option>
                {transporters.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.business_name}
                  </option>
                ))}
              </select>
              {errors.transporter_id && (
                <p className="mt-1 text-xs text-red-600">{errors.transporter_id}</p>
              )}
              <button
                type="button"
                onClick={() =>
                  window.open('/directory/transporters', '_blank', 'noopener,noreferrer')
                }
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Add transporter
              </button>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Vehicle</label>
              <select
                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${
                  errors.vehicle_id ? 'border-red-500' : ''
                }`}
                aria-invalid={Boolean(errors.vehicle_id)}
                value={formData.vehicle_id ?? ''}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setFormData((p) => ({ ...p, vehicle_id: id }));
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (!id) {
                      delete next.vehicle_id;
                      return next;
                    }
                    const v = vehicles.find((x) => x.id === id);
                    if (v && !v.is_verified) {
                      next.vehicle_id = VEHICLE_VERIFIED_ONLY_MESSAGE;
                    } else {
                      delete next.vehicle_id;
                    }
                    return next;
                  });
                }}
              >
                <option value="">None</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number}
                    {!v.is_verified ? ' (unverified)' : ''}
                  </option>
                ))}
              </select>
              {errors.vehicle_id && (
                <p className="mt-1 text-xs text-red-600">{errors.vehicle_id}</p>
              )}
            </div>

            <div className="md:col-span-2 rounded-lg border border-dashed border-border/70 bg-muted/10 p-4">
              <p className="mb-3 text-sm font-medium">NIC / e-way (optional)</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Ship-to site</label>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Leave blank to use party billing address. Sites belong to the selected sales order&apos;s customer.
                  </p>
                  <select
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    disabled={loadingPartySites || !formData.sales_sauda_id}
                    value={formData.delivery_site_id ?? ''}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        delivery_site_id: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">Same as bill-to</option>
                    {partySites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {formatPartySiteLabel(s)}
                      </option>
                    ))}
                  </select>
                  {loadingPartySites && (
                    <p className="mt-1 text-xs text-muted-foreground">Loading sites…</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">LR number</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={formData.lr_number ?? ''}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        lr_number: e.target.value.trim() === '' ? null : e.target.value,
                      }))
                    }
                    placeholder="Transporter LR / doc no."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">TCS amount</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={tcsAmountInput}
                    onChange={(e) => setTcsAmountInput(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Distance (km)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={formData.distance_km ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        distance_km: v === '' ? undefined : Number(v),
                      }));
                    }}
                    placeholder="Optional"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Route description</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={formData.route_description ?? ''}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        route_description: e.target.value.trim() === '' ? null : e.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {errors.submit && (
              <p className="md:col-span-2 text-sm text-red-600">{errors.submit}</p>
            )}
            <div className="flex justify-end gap-2 border-t border-border/60 pt-5 md:col-span-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || transporterSelectionBlocked || vehicleSelectionBlocked}
                title={
                  transporterSelectionBlocked
                    ? 'This transporter is incomplete — update them in Directory or choose None'
                    : vehicleSelectionBlocked
                      ? VEHICLE_VERIFIED_ONLY_MESSAGE
                      : undefined
                }
                className="rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 disabled:pointer-events-none disabled:opacity-50"
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
