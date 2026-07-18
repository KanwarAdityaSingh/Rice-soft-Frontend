import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Loader2, Plus, RefreshCw, Check } from 'lucide-react';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { useSalesSaudas } from '../../../hooks/useSalesSaudas';
import { useSalesParties } from '../../../hooks/useSalesParties';
import { useProducts } from '../../../hooks/useProducts';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicles } from '../../../hooks/useVehicles';
import { toast } from '../../../utils/toast';
import { useGodowns } from '../../../hooks/useGodowns';
import { DateInputWithSteppers } from '../../shared/DateInputWithSteppers';
import { TransporterFormModal } from '../../admin/transporters/TransporterFormModal';
import { VehicleFormModal } from '../../admin/vehicles/VehicleFormModal';
import { BillShipToAddresses } from '../shared/BillShipToAddresses';
import { UploadedDocumentPreview } from '../../shared/UploadedDocumentPreview';
import type { CreateInvoiceDispatchRequest, SalesSauda } from '../../../types/sales';
import type { SalesParty, SalesPartySite } from '../../../types/entities';
import { salesPartySitesAPI } from '../../../services/salesPartySites.api';
import { salesSaudasAPI } from '../../../services/salesSaudas.api';
import { invoiceDispatchesAPI } from '../../../services/invoiceDispatches.api';
import {
  getTransporterInvoiceDispatchBlockers,
  isTransporterEligibleForInvoiceDispatch,
} from '../../../utils/transporterInvoiceDispatchEligibility';

const BILTI_ACCEPT = 'image/jpeg,image/png,image/gif,application/pdf,.pdf';
const BILTI_MAX_BYTES = 10 * 1024 * 1024;

function validateBiltiFile(file: File): string | null {
  const okType =
    /^(image\/jpeg|image\/png|image\/gif|application\/pdf)$/i.test(file.type) ||
    /\.(jpe?g|png|gif|pdf)$/i.test(file.name);
  if (!okType) return 'Bilti must be a JPEG, PNG, GIF, or PDF';
  if (file.size > BILTI_MAX_BYTES) return 'Bilti file must be 10MB or smaller';
  return null;
}

function formatPartySiteLabel(site: SalesPartySite): string {
  const n = site.name?.trim();
  const line = [site.address?.city, site.address?.state].filter(Boolean).join(', ');
  return n ? `${n}${line ? ` · ${line}` : ''}` : line || site.id.slice(0, 8);
}

/** USP applies when the sales party has neither GST nor PAN. */
function salesPartyNeedsUsp(party: SalesParty | undefined): boolean {
  if (!party) return false;
  const gst = party.business_details?.gst_number?.trim();
  const pan = party.business_details?.pan_number?.trim();
  return !gst && !pan;
}

const USP_MAX_LENGTH = 2000;

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
  const { salesParties } = useSalesParties({ includeInactive: true });
  const { products } = useProducts();
  const {
    transporters,
    refetch: refetchTransporters,
    loading: loadingTransporters,
  } = useTransporters();
  const {
    vehicles,
    refetch: refetchVehicles,
    loading: loadingVehicles,
  } = useVehicles();
  const { godowns } = useGodowns(false);

  const [pendingBiltiFile, setPendingBiltiFile] = useState<File | null>(null);
  const [pendingBiltiPreviewUrl, setPendingBiltiPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateInvoiceDispatchRequest>({
    godown_id: '',
    sales_sauda_id: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    transporter_id: null,
    vehicle_id: null,
    delivery_site_id: null,
    lr_number: null,
    usp: null,
    transportation_cost: null,
    distance_km: undefined,
    route_description: null,
  });
  // const [tcsAmountInput, setTcsAmountInput] = useState('');
  const [transportationCostInput, setTransportationCostInput] = useState('');
  const [partySites, setPartySites] = useState<SalesPartySite[]>([]);
  const [loadingPartySites, setLoadingPartySites] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [transporterFormOpen, setTransporterFormOpen] = useState(false);
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);

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

  const [selectedSaudaDetail, setSelectedSaudaDetail] = useState<SalesSauda | null>(null);
  const [loadingSaudaDetail, setLoadingSaudaDetail] = useState(false);

  const selectedSaudaFromList = useMemo(
    () => salesSaudas.find((s) => s.id === formData.sales_sauda_id),
    [salesSaudas, formData.sales_sauda_id]
  );

  const selectedSauda = selectedSaudaDetail ?? selectedSaudaFromList;
  const selectedSaudaPartyId = selectedSauda?.sales_party_id;
  /** Transportation cost only applies to FOR saudas */
  const showTransportationCost = selectedSauda?.sauda_type === 'for';

  const selectedSalesParty = useMemo(
    () =>
      selectedSaudaPartyId
        ? salesParties.find((p) => p.id === selectedSaudaPartyId)
        : undefined,
    [salesParties, selectedSaudaPartyId]
  );

  const showUspField = salesPartyNeedsUsp(selectedSalesParty);

  const productById = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return map;
  }, [products]);

  const selectedSaudaLines = useMemo(() => {
    const lines = selectedSauda?.lines ?? [];
    return [...lines].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [selectedSauda?.lines]);

  const linesMissingHsn = useMemo(
    () =>
      selectedSaudaLines.filter((line) => {
        const hsn = productById.get(line.product_id)?.hsn_code?.trim();
        return !hsn;
      }),
    [selectedSaudaLines, productById]
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
        dispatch_date: new Date().toISOString().split('T')[0],
        transporter_id: null,
        vehicle_id: null,
        delivery_site_id: null,
        lr_number: null,
        usp: null,
        transportation_cost: null,
        distance_km: undefined,
        route_description: null,
      });
      // setTcsAmountInput('');
      setTransportationCostInput('');
      setPartySites([]);
      setSelectedSaudaDetail(null);
      setPendingBiltiFile(null);
      setPendingBiltiPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (pendingBiltiPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(pendingBiltiPreviewUrl);
      }
    };
  }, [pendingBiltiPreviewUrl]);

  const handleBiltiFileSelect = (file: File | null) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next.bilti;
      return next;
    });
    setPendingBiltiPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    if (!file) {
      setPendingBiltiFile(null);
      return;
    }
    const err = validateBiltiFile(file);
    if (err) {
      setPendingBiltiFile(null);
      setErrors((prev) => ({ ...prev, bilti: err }));
      return;
    }
    setPendingBiltiFile(file);
    setPendingBiltiPreviewUrl(URL.createObjectURL(file));
  };

  useEffect(() => {
    if (!formData.sales_sauda_id) {
      setSelectedSaudaDetail(null);
      setPartySites([]);
      return;
    }
    let cancelled = false;
    setLoadingSaudaDetail(true);
    salesSaudasAPI
      .getById(formData.sales_sauda_id)
      .then((sauda) => {
        if (!cancelled) setSelectedSaudaDetail(sauda);
      })
      .catch(() => {
        if (!cancelled) setSelectedSaudaDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSaudaDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.sales_sauda_id]);

  useEffect(() => {
    if (!formData.sales_sauda_id || !selectedSaudaPartyId) {
      setPartySites([]);
      return;
    }
    setFormData((p) => ({ ...p, delivery_site_id: null }));
    void loadPartySites(selectedSaudaPartyId);
  }, [formData.sales_sauda_id, selectedSaudaPartyId, loadPartySites]);

  // Clear USP when the selected party has GST/PAN (field not applicable)
  useEffect(() => {
    if (!showUspField && formData.usp) {
      setFormData((p) => ({ ...p, usp: null }));
    }
  }, [showUspField, formData.usp]);

  // Clear transportation cost when sauda is not FOR
  useEffect(() => {
    if (!showTransportationCost && transportationCostInput) {
      setTransportationCostInput('');
      setFormData((p) => ({ ...p, transportation_cost: null }));
    }
  }, [showTransportationCost, transportationCostInput]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.godown_id) e.godown_id = 'Select dispatch godown (stock will deduct here)';
    if (!formData.sales_sauda_id) e.sales_sauda_id = 'Select a sales order';
    if (showUspField && formData.usp && formData.usp.length > USP_MAX_LENGTH) {
      e.usp = `USP cannot exceed ${USP_MAX_LENGTH} characters`;
    }
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
    if (showTransportationCost) {
      const costTrim = transportationCostInput.trim();
      if (costTrim === '') {
        e.transportation_cost = 'Transportation cost is required for FOR saudas';
      } else {
        const n = Number(costTrim);
        if (Number.isNaN(n) || n < 0) {
          e.transportation_cost = 'Transportation cost must be a number ≥ 0';
        }
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
      // TCS amount temporarily hidden from invoice dispatch UI
      // const tcsTrim = tcsAmountInput.trim();
      // let tcs_amount: number | undefined;
      // if (tcsTrim !== '') {
      //   const n = Number(tcsTrim);
      //   if (Number.isNaN(n)) {
      //     setErrors({ submit: 'TCS amount must be a valid number' });
      //     setLoading(false);
      //     return;
      //   }
      //   tcs_amount = n;
      // }
      const uspTrim = showUspField ? formData.usp?.trim() || null : null;
      const costTrim = showTransportationCost ? transportationCostInput.trim() : '';
      const transportation_cost =
        showTransportationCost && costTrim !== '' ? Number(costTrim) : undefined;
      const created = await create({
        ...formData,
        dispatch_date: formData.dispatch_date || undefined,
        transporter_id: formData.transporter_id || undefined,
        vehicle_id: formData.vehicle_id || undefined,
        delivery_site_id: formData.delivery_site_id || undefined,
        lr_number: formData.lr_number?.trim() || undefined,
        usp: uspTrim,
        transportation_cost,
        // tcs_amount,
        distance_km: formData.distance_km,
        route_description: formData.route_description?.trim() || undefined,
      });
      const invoiceNo = created?.internal_invoice_number?.trim();
      if (pendingBiltiFile && created?.id) {
        try {
          await invoiceDispatchesAPI.uploadBilti(created.id, pendingBiltiFile);
        } catch (uploadErr: unknown) {
          const uploadMsg =
            uploadErr instanceof Error ? uploadErr.message : 'Bilti upload failed';
          toast.error(
            'Dispatch created, bilti upload failed',
            [
              invoiceNo ? `Invoice No. ${invoiceNo}.` : null,
              `${uploadMsg}. You can upload bilti from the dispatch details.`,
            ]
              .filter(Boolean)
              .join(' ')
          );
          onOpenChange(false);
          onSuccess?.();
          return;
        }
      }
      toast.success(
        'Invoice dispatch created',
        invoiceNo
          ? `Invoice No. ${invoiceNo}. Inventory will be deducted when you confirm this dispatch.`
          : 'Inventory will be deducted when you confirm this dispatch.'
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
    <>
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
              <label className="mb-1 block text-sm font-medium">Dispatch from *</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Godown where stock is fulfilled — not from the sales order.
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
                    {s.order_number ?? s.id.slice(0, 8)}
                    {s.financial_year ? ` (${s.financial_year})` : ''} – {s.sauda_date}
                  </option>
                ))}
              </select>
              {errors.sales_sauda_id && (
                <p className="mt-1 text-xs text-red-600">{errors.sales_sauda_id}</p>
              )}
            </div>
            {formData.sales_sauda_id && (
              <div className="md:col-span-2 rounded-lg border border-border/60 bg-muted/15 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Addresses from sales sauda (read-only)
                </p>
                {loadingSaudaDetail && !selectedSauda ? (
                  <p className="text-xs text-muted-foreground">Loading addresses…</p>
                ) : (
                  <>
                    <BillShipToAddresses
                      billingAddress={selectedSauda?.billing_address}
                      deliveryAddress={selectedSauda?.delivery_address}
                    />
                    {!selectedSauda?.billing_address && !selectedSauda?.delivery_address && (
                      <p className="text-xs text-muted-foreground">
                        No bill/ship addresses on this sauda.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            {formData.sales_sauda_id && (
              <div className="md:col-span-2 rounded-lg border border-border/60 bg-muted/15 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Products & HSN (from sales sauda — used for e-invoice / e-way)
                </p>
                {loadingSaudaDetail && selectedSaudaLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Loading lines…</p>
                ) : selectedSaudaLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No lines on this sauda.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border/50 bg-background/60">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="p-2 font-medium">Product</th>
                          <th className="p-2 font-medium">HSN</th>
                          <th className="p-2 text-right font-medium">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSaudaLines.map((line) => {
                          const product = productById.get(line.product_id);
                          const hsn = product?.hsn_code?.trim() || '';
                          return (
                            <tr key={line.id} className="border-b last:border-0">
                              <td className="p-2">
                                {product?.name ?? line.product_id.slice(0, 8)}
                              </td>
                              <td className="p-2">
                                {hsn ? (
                                  <span className="font-medium tabular-nums">{hsn}</span>
                                ) : (
                                  <span className="text-amber-700 dark:text-amber-300">
                                    Missing
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right tabular-nums">
                                {line.quantity} {line.quantity_unit}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {linesMissingHsn.length > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {linesMissingHsn.length} product
                    {linesMissingHsn.length === 1 ? '' : 's'} missing HSN. Set HSN on the product
                    in Directory, or ensure a default HSN is configured — e-invoice / e-way will
                    fail if both are missing.
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Dispatch Date</label>
              <DateInputWithSteppers
                className="w-full"
                inputClassName="py-2 text-sm"
                value={formData.dispatch_date ?? ''}
                onChange={(v) => setFormData((p) => ({ ...p, dispatch_date: v }))}
              />
            </div>
            <div className="flex items-end">
              <p className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                Invoice number will be generated on save from the godown GST state and dispatch date
                (financial year).
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Transporter</label>
              <div className="flex gap-1">
                <select
                  className={`min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm ${
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
                <button
                  type="button"
                  onClick={() => void refetchTransporters()}
                  disabled={loadingTransporters}
                  className="flex-shrink-0 rounded-lg border border-border bg-background p-2 hover:bg-muted transition-colors disabled:opacity-50"
                  title="Refresh transporters"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingTransporters ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setTransporterFormOpen(true)}
                  className="flex-shrink-0 rounded-lg border border-border bg-background p-2 hover:bg-muted transition-colors"
                  title="Add transporter"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {errors.transporter_id && (
                <p className="mt-1 text-xs text-red-600">{errors.transporter_id}</p>
              )}
            </div>
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Bilti <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <p className="mb-2 text-xs text-muted-foreground">
                JPEG, PNG, GIF, or PDF — max 10MB. Uploaded after the dispatch is created.
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept={BILTI_ACCEPT}
                  onChange={(e) => {
                    handleBiltiFileSelect(e.target.files?.[0] || null);
                    e.target.value = '';
                  }}
                  className={`w-full rounded-lg border bg-background px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:text-primary ${
                    errors.bilti ? 'border-red-500' : 'border-border'
                  }`}
                />
                {pendingBiltiFile && !errors.bilti && (
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                )}
              </div>
              {pendingBiltiFile && (
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  Selected: {pendingBiltiFile.name}
                </p>
              )}
              {errors.bilti && (
                <p className="mt-1 text-xs text-red-600">{errors.bilti}</p>
              )}
              {pendingBiltiPreviewUrl && pendingBiltiFile?.type.startsWith('image/') ? (
                <div className="mt-2 overflow-hidden rounded-md border border-border bg-muted/30">
                  <img
                    src={pendingBiltiPreviewUrl}
                    alt="Bilti preview"
                    className="mx-auto h-auto max-h-28 w-full object-contain"
                  />
                </div>
              ) : pendingBiltiFile ? (
                <UploadedDocumentPreview
                  url={pendingBiltiPreviewUrl}
                  compact
                  alt="Bilti preview"
                  className="mt-2"
                />
              ) : null}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Vehicle</label>
              <div className="flex gap-1">
                <select
                  className={`min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm ${
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
                <button
                  type="button"
                  onClick={() => void refetchVehicles()}
                  disabled={loadingVehicles}
                  className="flex-shrink-0 rounded-lg border border-border bg-background p-2 hover:bg-muted transition-colors disabled:opacity-50"
                  title="Refresh vehicles"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingVehicles ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleFormOpen(true)}
                  className="flex-shrink-0 rounded-lg border border-border bg-background p-2 hover:bg-muted transition-colors"
                  title="Add vehicle"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {errors.vehicle_id && (
                <p className="mt-1 text-xs text-red-600">{errors.vehicle_id}</p>
              )}
            </div>
            {showTransportationCost && (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Transportation cost</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${
                    errors.transportation_cost ? 'border-red-500' : ''
                  }`}
                  value={transportationCostInput}
                  onChange={(e) => {
                    setTransportationCostInput(e.target.value);
                    if (errors.transportation_cost) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.transportation_cost;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. 1500.00"
                />
                {errors.transportation_cost && (
                  <p className="mt-1 text-xs text-red-600">{errors.transportation_cost}</p>
                )}
              </div>
            )}

            <div className="md:col-span-2 rounded-lg border border-dashed border-border/70 bg-muted/10 p-4">
              <p className="mb-3 text-sm font-medium">Masters India — e-invoice / e-way (optional)</p>
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
                {showUspField && (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium">
                      USP <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Sales party has no GST or PAN. Optional note for this dispatch (max {USP_MAX_LENGTH} characters).
                    </p>
                    <textarea
                      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[80px] ${
                        errors.usp ? 'border-red-500' : ''
                      }`}
                      value={formData.usp ?? ''}
                      maxLength={USP_MAX_LENGTH}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          usp: e.target.value === '' ? null : e.target.value,
                        }))
                      }
                      placeholder="Optional USP"
                    />
                    <p className="mt-1 text-xs text-muted-foreground text-right">
                      {(formData.usp ?? '').length}/{USP_MAX_LENGTH}
                    </p>
                    {errors.usp && (
                      <p className="mt-1 text-xs text-red-600">{errors.usp}</p>
                    )}
                  </div>
                )}
                {/* <div>
                  <label className="mb-1 block text-sm font-medium">TCS amount</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={tcsAmountInput}
                    onChange={(e) => setTcsAmountInput(e.target.value)}
                    placeholder="Optional"
                  />
                </div> */}
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

    <TransporterFormModal
      open={transporterFormOpen}
      onOpenChange={(next) => {
        setTransporterFormOpen(next);
        if (!next) void refetchTransporters();
      }}
      nested
    />
    <VehicleFormModal
      open={vehicleFormOpen}
      onOpenChange={(next) => {
        setVehicleFormOpen(next);
        if (!next) void refetchVehicles();
      }}
      nested
    />
    </>
  );
}
