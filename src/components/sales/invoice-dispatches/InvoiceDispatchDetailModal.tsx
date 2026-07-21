import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState, useCallback } from 'react';
import {
  X,
  Loader2,
  CheckCircle,
  FileDigit,
  FileText,
  Truck,
  Package,
  AlertTriangle,
  Pencil,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicleMap } from '../../../hooks/useVehicles';
import { usePackaging } from '../../../hooks/usePackaging';
import { useProducts } from '../../../hooks/useProducts';
import { inventoryAPI } from '../../../services/inventory.api';
import { salesSaudasAPI } from '../../../services/salesSaudas.api';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { toast } from '../../../utils/toast';
import { extractApiErrorMessage } from '../../../utils/mastersIndiaSales';
import {
  deleteInvoiceDispatchConfirmDescription,
  extractInvoiceDispatchDeleteError,
  invoiceDispatchDeleteToastTitle,
} from '../../../utils/invoiceDispatchDelete';
import { useGodowns } from '../../../hooks/useGodowns';
import type {
  InvoiceDispatch,
  SalesSauda,
  EInvoice,
  EWayBill,
  CreateEWayBillRequest,
  EWayBillPreviewResponse,
} from '../../../types/sales';
import { formatPacketTypeLabel } from '../../../constants/bagAndPacketTypes';
import { BillShipToAddresses } from '../shared/BillShipToAddresses';
import { UploadedDocumentPreview } from '../../shared/UploadedDocumentPreview';
import { EWayBillPreviewDialog } from './EWayBillPreviewDialog';

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

interface InvoiceDispatchDetailModalProps {
  dispatchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Open edit form (logistics fields) for this dispatch. */
  onEdit?: (id: string) => void;
  getProductName: (id: string) => string;
}

export function InvoiceDispatchDetailModal({
  dispatchId,
  open,
  onOpenChange,
  onSuccess,
  onEdit,
  getProductName,
}: InvoiceDispatchDetailModalProps) {
  const {
    getById,
    remove,
    confirm,
    cancel,
    uploadBilti,
    getEInvoice,
    getEWayBills,
    generateEInvoice,
    previewEWayBill,
    generateEWayBill,
  } = useInvoiceDispatches();
  const { transporters } = useTransporters();
  const { getVehicleNumber } = useVehicleMap();
  const { packaging } = usePackaging();
  const { products } = useProducts();
  const { godowns } = useGodowns(true);

  const getProductHsn = useCallback(
    (productId: string) => products.find((p) => p.id === productId)?.hsn_code?.trim() || '',
    [products]
  );

  const [dispatch, setDispatch] = useState<InvoiceDispatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [eInvoice, setEInvoice] = useState<EInvoice | null | undefined>(undefined);
  const [eWayBills, setEWayBills] = useState<EWayBill[]>([]);
  const [fgiByProduct, setFgiByProduct] = useState<Record<string, number>>({});
  const [loadingFgi, setLoadingFgi] = useState(false);

  const [linkedSauda, setLinkedSauda] = useState<SalesSauda | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [uploadingBilti, setUploadingBilti] = useState(false);

  const [eWayPreviewOpen, setEWayPreviewOpen] = useState(false);
  const [eWayPreview, setEWayPreview] = useState<EWayBillPreviewResponse | null>(null);
  const [eWayPreviewLoading, setEWayPreviewLoading] = useState(false);
  const [eWayGenerateLoading, setEWayGenerateLoading] = useState(false);

  const resolvedEWayVehicle = useCallback((): string => {
    if (dispatch?.vehicle_id) return getVehicleNumber(dispatch.vehicle_id) || '';
    return '';
  }, [dispatch?.vehicle_id, getVehicleNumber]);

  const validateEWayGenerate = (distanceKm?: number | null): boolean => {
    if (!resolvedEWayVehicle()) {
      toast.error(
        'Vehicle required',
        'Set a verified vehicle on the dispatch before generating an e-way bill.',
      );
      return false;
    }
    const km = distanceKm ?? dispatch?.distance_km ?? null;
    if (km == null || !Number.isFinite(Number(km)) || Number(km) < 0) {
      toast.error(
        'Distance required',
        'Enter distance (km) before generating. Open Bill of Supply preview if Masters India could not calculate it.',
      );
      return false;
    }
    return true;
  };

  const buildEWayBody = useCallback(
    (overrides?: Pick<CreateEWayBillRequest, 'distance_km'>): CreateEWayBillRequest => {
      const body: CreateEWayBillRequest = {};
      const v = resolvedEWayVehicle();
      if (v) body.vehicle_number = v.toUpperCase();
      if (overrides?.distance_km != null) {
        body.distance_km = overrides.distance_km;
      } else if (dispatch?.distance_km != null) {
        body.distance_km = dispatch.distance_km;
      }
      const route = dispatch?.route_description?.trim();
      if (route) body.route = route;
      if (dispatch?.transporter_id) body.transporter_id = dispatch.transporter_id;
      const lr = dispatch?.lr_number?.trim();
      if (lr) body.lr_number = lr;
      return body;
    },
    [
      dispatch?.distance_km,
      dispatch?.route_description,
      dispatch?.transporter_id,
      dispatch?.lr_number,
      resolvedEWayVehicle,
    ],
  );

  const openBillOfSupplyPreview = async () => {
    if (!dispatchId) return;
    setEWayPreviewLoading(true);
    try {
      const preview = await previewEWayBill(dispatchId, buildEWayBody());
      setEWayPreview(preview);
      setEWayPreviewOpen(true);
    } catch (e) {
      toast.error(
        'Bill of Supply preview failed',
        extractApiErrorMessage(e, 'Could not build preview'),
      );
    } finally {
      setEWayPreviewLoading(false);
    }
  };

  const runGenerateEWayBill = async (
    force: boolean,
    overrides?: Pick<CreateEWayBillRequest, 'distance_km'>,
    opts?: { skipConfirm?: boolean },
  ) => {
    if (!dispatchId) return;
    const body = buildEWayBody(overrides);
    if (!validateEWayGenerate(body.distance_km)) {
      // Open preview so the user can enter distance when MI distance failed.
      if (body.distance_km == null) {
        void openBillOfSupplyPreview();
      }
      return;
    }
    if (!opts?.skipConfirm) {
      if (
        force &&
        !window.confirm(
          'Regenerate e-way bill? This will call Masters India with force=true.',
        )
      ) {
        return;
      }
      if (
        !force &&
        !window.confirm('Generate e-way bill with Masters India for this dispatch?')
      ) {
        return;
      }
    }
    setEWayGenerateLoading(true);
    try {
      const ewb = await generateEWayBill(dispatchId, {
        force,
        body,
      });
      const list = await getEWayBills(dispatchId);
      setEWayBills(list);
      setEWayPreviewOpen(false);
      setEWayPreview(null);
      toast.success(
        force ? 'E-Way bill regenerated' : 'E-Way bill generated',
        ewb.eway_bill_number ? `EWB ${ewb.eway_bill_number}` : 'Masters India accepted the request.',
      );
      onSuccess?.();
    } catch (e) {
      toast.error('E-Way generate failed', extractApiErrorMessage(e, 'Action failed'));
    } finally {
      setEWayGenerateLoading(false);
    }
  };

  useEffect(() => {
    if (open && dispatchId) {
      setLoading(true);
      getById(dispatchId)
        .then(setDispatch)
        .catch(() => setDispatch(null))
        .finally(() => setLoading(false));
    } else {
      setDispatch(null);
      setEInvoice(undefined);
      setEWayBills([]);
      setFgiByProduct({});
    }
  }, [open, dispatchId, getById]);

  useEffect(() => {
    if (!open || !dispatch?.sales_sauda_id) {
      setLinkedSauda(null);
      return;
    }
    let cancelled = false;
    salesSaudasAPI
      .getById(dispatch.sales_sauda_id)
      .then((sauda) => {
        if (!cancelled) setLinkedSauda(sauda);
      })
      .catch(() => {
        if (!cancelled) setLinkedSauda(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, dispatch?.sales_sauda_id]);

  useEffect(() => {
    if (!open || !dispatchId || !dispatch) return;
    if (dispatch.status === 'confirmed') {
      getEInvoice(dispatchId).then(setEInvoice).catch(() => setEInvoice(null));
      getEWayBills(dispatchId).then(setEWayBills).catch(() => setEWayBills([]));
    } else {
      setEInvoice(undefined);
      setEWayBills([]);
    }
  }, [open, dispatchId, dispatch?.status, getEInvoice, getEWayBills]);

  useEffect(() => {
    if (!open || !dispatch || dispatch.status !== 'draft' || !dispatch.lines?.length) {
      setFgiByProduct({});
      return;
    }
    setLoadingFgi(true);
    inventoryAPI
      .getFinishedGoods(dispatch.godown_id ? { godown_id: dispatch.godown_id } : undefined)
      .then((rows) => {
        const byProduct: Record<string, number> = {};
        const list = Array.isArray(rows) ? rows : [];
        for (const row of list) {
          const weight = Number(row.total_weight) || 0;
          if (row.product_id) {
            byProduct[row.product_id] = (byProduct[row.product_id] ?? 0) + weight;
          }
        }
        setFgiByProduct(byProduct);
      })
      .catch(() => setFgiByProduct({}))
      .finally(() => setLoadingFgi(false));
  }, [open, dispatch?.id, dispatch?.godown_id, dispatch?.status, dispatch?.lines?.length]);

  const biltiPreviewUrl =
    dispatch?.bilti_image_url?.trim() || dispatch?.bilti_pdf_url?.trim() || null;
  const receivingDocPreviewUrl =
    dispatch?.receiving_doc_image_url?.trim() ||
    dispatch?.receiving_doc_pdf_url?.trim() ||
    null;

  const handleBiltiUpload = async (file: File | null) => {
    if (!dispatch || !file) return;
    const err = validateBiltiFile(file);
    if (err) {
      toast.error('Invalid bilti', err);
      return;
    }
    setUploadingBilti(true);
    try {
      await uploadBilti(dispatch.id, file);
      const updated = await getById(dispatch.id);
      setDispatch(updated);
      toast.success('Bilti uploaded', 'Document saved on this dispatch.');
      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bilti upload failed';
      toast.error('Error', msg);
    } finally {
      setUploadingBilti(false);
    }
  };

  const handleDelete = async () => {
    if (!dispatch) return;
    setActionLoading('delete');
    try {
      await remove(dispatch.id);
      const successDetail =
        dispatch.status === 'confirmed'
          ? 'Inventory was reversed and the dispatch was removed. Sauda remaining quantity is available again.'
          : dispatch.status === 'cancelled'
            ? 'The cancelled dispatch was removed.'
            : 'The draft invoice dispatch was removed.';
      toast.success('Dispatch deleted', successDetail);
      setDeleteConfirmOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(
        invoiceDispatchDeleteToastTitle(e),
        extractInvoiceDispatchDeleteError(e),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const canCancelTransfer =
    dispatch?.status === 'confirmed' && Boolean(dispatch.to_godown_id);

  /** Soft client hint — server still returns 409 with a clear message for all delete blockers. */
  const deleteBlockedByCompliance = Boolean(
    eInvoice?.irn || eWayBills.some((e) => e.eway_bill_number || e.id),
  );
  const deleteBlockedReason = eInvoice?.irn
    ? 'Cannot delete while an e-invoice exists on this dispatch'
    : eWayBills.some((e) => e.eway_bill_number || e.id)
      ? 'Cannot delete while an e-way bill exists on this dispatch'
      : undefined;

  const handleCancelTransfer = async () => {
    if (!dispatch || !canCancelTransfer) return;
    setActionLoading('cancel');
    try {
      const updated = await cancel(dispatch.id);
      setDispatch(updated);
      setCancelConfirmOpen(false);
      toast.success(
        'Transfer cancelled',
        'Stock was reversed. Sauda remaining quantity is available again.',
      );
      onSuccess?.();
    } catch (e) {
      toast.error(
        'Cancel failed',
        extractApiErrorMessage(
          e,
          'Could not reverse this transfer. Destination stock may already have been used.',
        ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const runAction = async (
    key: string,
    fn: () => Promise<unknown>,
    successToast?: { title: string; description?: string } | ((result: unknown) => { title: string; description?: string }),
  ) => {
    setActionLoading(key);
    try {
      const result = await fn();
      if (successToast) {
        const msg = typeof successToast === 'function' ? successToast(result) : successToast;
        toast.success(msg.title, msg.description);
      } else if (key === 'confirm') {
        toast.success('Dispatch confirmed', 'Inventory has been deducted.');
      }
      const updated = await getById(dispatchId!);
      setDispatch(updated);
      if (key === 'e-invoice' && dispatchId) {
        const einv = await getEInvoice(dispatchId);
        setEInvoice(einv);
      }
      if ((key === 'e-way' || key === 'e-way-force') && dispatchId) {
        const ewb = await getEWayBills(dispatchId);
        setEWayBills(ewb);
      }
      onSuccess?.();
    } catch (e) {
      console.error(e);
      toast.error('Error', extractApiErrorMessage(e, 'Action failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const transporterName = (id: string | null) =>
    id ? transporters.find((t) => t.id === id)?.business_name ?? id : '–';

  const getPackagingLabel = (packagingId: string | null) => {
    if (!packagingId) return '–';
    const p = packaging.find((x) => x.id === packagingId);
    return p ? `${p.holding_capacity} kg (${formatPacketTypeLabel(p.packet_type)})` : packagingId;
  };

  return (
    <>
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex max-h-[92vh] w-[95vw] max-w-3xl translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-xl border bg-background shadow-xl">
          {loading ? (
            <div className="p-6">
              <Dialog.Title className="sr-only">Invoice Dispatch</Dialog.Title>
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            </div>
          ) : dispatch ? (
            <>
          <div className="shrink-0 border-b border-border/70 px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Dialog.Title className="text-lg font-semibold tracking-tight">
                  Invoice Dispatch
                </Dialog.Title>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold tabular-nums">
                    {dispatch.internal_invoice_number}
                  </p>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                      dispatch.status === 'confirmed'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : dispatch.status === 'cancelled'
                          ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {dispatch.status}
                  </span>
                  {dispatch.financial_year ? (
                    <span className="text-xs text-muted-foreground">FY {dispatch.financial_year}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {dispatch.dispatch_date}
                  {' · '}
                  {(() => {
                    const from = dispatch.godown_id
                      ? godowns.find((g) => g.id === dispatch.godown_id)
                      : undefined;
                    const fromLabel = from
                      ? `${from.name}${from.gst_number?.trim() ? ` · GST ${from.gst_number.trim()}` : ''}`
                      : dispatch.godown_id
                        ? 'Godown'
                        : 'No godown';
                    if (!dispatch.to_godown_id) return fromLabel;
                    const to = godowns.find((g) => g.id === dispatch.to_godown_id);
                    const toLabel = to
                      ? `${to.name}${to.gst_number?.trim() ? ` · GST ${to.gst_number.trim()}` : ''}`
                      : 'To godown';
                    return `${fromLabel} → ${toLabel}`;
                  })()}
                  {' · '}
                  {dispatch.party_name}
                </p>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              {/* Party */}
              <section className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Party & addresses
                </h4>
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Sales party</p>
                    <p className="font-medium">{dispatch.party_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">GST</p>
                    <p className="font-medium tabular-nums">{dispatch.party_gst_number ?? '–'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">PAN</p>
                    <p className="font-medium tabular-nums">{dispatch.party_pan_number ?? '–'}</p>
                  </div>
                  <div className="sm:col-span-2 rounded-lg border border-border/50 bg-background/70 p-3">
                    <BillShipToAddresses
                      billingAddress={linkedSauda?.billing_address}
                      deliveryAddress={linkedSauda?.delivery_address}
                      billingFallbackText={dispatch.party_address}
                    />
                    {!linkedSauda?.billing_address &&
                      !linkedSauda?.delivery_address &&
                      !dispatch.party_address && (
                        <p className="text-xs text-muted-foreground">No bill/ship addresses on sauda.</p>
                      )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      From sales sauda · used for e-invoice / e-way
                    </p>
                  </div>
                  {dispatch.usp?.trim() && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">USP</p>
                      <p className="font-medium whitespace-pre-wrap">{dispatch.usp}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Logistics */}
              <section className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Logistics
                </h4>
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Transporter</p>
                    <p className="font-medium">{transporterName(dispatch.transporter_id)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="font-medium">
                      {dispatch.vehicle_id ? getVehicleNumber(dispatch.vehicle_id) : '–'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transportation cost</p>
                    <p className="font-medium">
                      {dispatch.transportation_cost != null &&
                      !Number.isNaN(Number(dispatch.transportation_cost))
                        ? `₹ ${Number(dispatch.transportation_cost).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : '–'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Distance (km)</p>
                    <p className="font-medium">
                      {dispatch.distance_km != null ? dispatch.distance_km : '–'}
                    </p>
                    {dispatch.distance_km == null && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Required for e-way generate if Masters India cannot calculate it.
                      </p>
                    )}
                  </div>
                  {dispatch.route_description && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Route</p>
                      <p className="font-medium">{dispatch.route_description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">LR number</p>
                    <p className="font-medium">{dispatch.lr_number?.trim() || '–'}</p>
                  </div>
                  <div className="sm:col-span-2 text-[11px] text-muted-foreground">
                    To change logistics (date, transporter, vehicle, LR, freight, distance, route,
                    USP), use Edit. Sauda, godown, invoice number, and lines stay locked.
                  </div>
                </div>
              </section>

              {/* Bilti */}
              <section className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bilti
                  </h4>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
                    {uploadingBilti ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {biltiPreviewUrl ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      accept={BILTI_ACCEPT}
                      className="sr-only"
                      disabled={uploadingBilti}
                      onChange={(e) => {
                        void handleBiltiUpload(e.target.files?.[0] || null);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <p className="mb-2 text-[11px] text-muted-foreground">JPEG, PNG, GIF, or PDF — max 10MB</p>
                {biltiPreviewUrl ? (
                  <UploadedDocumentPreview url={biltiPreviewUrl} compact alt="Bilti" />
                ) : (
                  <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-sm text-muted-foreground">
                    No bilti uploaded
                  </p>
                )}
              </section>

              {/* Receiving document */}
              <section className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Receiving document
                </h4>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Upload from the invoice dispatch table. JPEG, PNG, GIF, or PDF — max 10MB.
                </p>
                {receivingDocPreviewUrl ? (
                  <UploadedDocumentPreview
                    url={receivingDocPreviewUrl}
                    compact
                    alt="Receiving document"
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-sm text-muted-foreground">
                    No receiving document uploaded
                  </p>
                )}
              </section>

              {dispatch.lines && dispatch.lines.length > 0 && (
                <section className="rounded-xl border border-border/60 overflow-hidden">
                  <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Lines
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30 text-left">
                          <th className="p-2.5 font-medium">Product</th>
                          <th className="p-2.5 font-medium">HSN</th>
                          <th className="p-2.5 font-medium">Bag</th>
                          <th className="p-2.5 text-right font-medium">Bags</th>
                          <th className="p-2.5 text-right font-medium">Qty</th>
                          <th className="p-2.5 text-right font-medium">Rate</th>
                          <th className="p-2.5 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dispatch.lines.map((l) => {
                          const hsn = getProductHsn(l.product_id);
                          return (
                            <tr key={l.id} className="border-b last:border-0">
                              <td className="p-2.5">{getProductName(l.product_id)}</td>
                              <td className="p-2.5">
                                {hsn ? (
                                  <span className="tabular-nums">{hsn}</span>
                                ) : (
                                  <span className="text-amber-700 dark:text-amber-300">Missing</span>
                                )}
                              </td>
                              <td className="p-2.5">{getPackagingLabel(l.packaging_id)}</td>
                              <td className="p-2.5 text-right tabular-nums">
                                {l.packet_count != null && Number(l.packet_count) > 0
                                  ? l.packet_count
                                  : '–'}
                              </td>
                              <td className="p-2.5 text-right tabular-nums">
                                {l.quantity} {l.quantity_unit}
                              </td>
                              <td className="p-2.5 text-right tabular-nums">{l.rate}</td>
                              <td className="p-2.5 text-right tabular-nums">{l.amount}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              {dispatch.status === 'draft' && dispatch.lines && dispatch.lines.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" /> Available stock (before confirm)
                  </h4>
                  {loadingFgi ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-2 font-medium">Product</th>
                            <th className="p-2 text-right font-medium">Required (kg)</th>
                            <th className="p-2 text-right font-medium">Available (kg)</th>
                            <th className="p-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dispatch.lines.map((l) => {
                            const required = Number(l.quantity) || 0;
                            const available = Number(fgiByProduct[l.product_id]) || 0;
                            const sufficient = available >= required;
                            return (
                              <tr key={l.id} className="border-b last:border-0">
                                <td className="p-2">{getProductName(l.product_id)}</td>
                                <td className="p-2 text-right">{required}</td>
                                <td className="p-2 text-right">{available.toFixed(2)}</td>
                                <td className="p-2">
                                  {sufficient ? (
                                    <span className="text-green-600 dark:text-green-400">Sufficient</span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                      <AlertTriangle className="h-3.5 w-3.5" /> Insufficient
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
          </div>

          {(dispatch.status === 'draft' ||
            dispatch.status === 'confirmed' ||
            dispatch.status === 'cancelled') && (
            <div className="shrink-0 space-y-3 border-t border-border/70 bg-background px-5 py-3 sm:px-6">
              {dispatch.status === 'draft' && (
                <div className="flex flex-wrap gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={() => {
                        onOpenChange(false);
                        onEdit(dispatch.id);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-border bg-background hover:bg-muted disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!!actionLoading}
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50"
                  >
                    {actionLoading === 'delete' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                  <button
                    type="button"
                    disabled={!!actionLoading}
                    onClick={() =>
                      runAction('confirm', () => confirm(dispatch.id))
                    }
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {actionLoading === 'confirm' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <CheckCircle className="h-4 w-4" /> Confirm Dispatch
                  </button>
                </div>
              )}
              {dispatch.status === 'confirmed' && (
                <div className="flex flex-wrap gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      disabled={!!actionLoading || eWayPreviewLoading || eWayGenerateLoading}
                      onClick={() => {
                        onOpenChange(false);
                        onEdit(dispatch.id);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-border bg-background hover:bg-muted disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                  )}
                  {canCancelTransfer && (
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={() => setCancelConfirmOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50"
                    >
                      {actionLoading === 'cancel' && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <Undo2 className="h-4 w-4" /> Cancel transfer
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={
                      !!actionLoading ||
                      eWayPreviewLoading ||
                      eWayGenerateLoading ||
                      deleteBlockedByCompliance
                    }
                    title={deleteBlockedReason}
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50"
                  >
                    {actionLoading === 'delete' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                  <button
                    type="button"
                    disabled={!!actionLoading || eWayPreviewLoading || eWayGenerateLoading}
                    onClick={() => void openBillOfSupplyPreview()}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-border bg-background hover:bg-muted/50 disabled:opacity-50"
                  >
                    {eWayPreviewLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <FileText className="h-4 w-4" /> Preview & Generate Bill of Supply
                  </button>
                  <button
                    type="button"
                    disabled={!!actionLoading || eWayPreviewLoading || eWayGenerateLoading}
                    onClick={() => void runGenerateEWayBill(false)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {eWayGenerateLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Truck className="h-4 w-4" /> Generate E-Way Bill
                  </button>
                  {eWayBills.length > 0 && (
                    <button
                      type="button"
                      disabled={!!actionLoading || eWayPreviewLoading || eWayGenerateLoading}
                      onClick={() => void runGenerateEWayBill(true)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-border bg-background hover:bg-muted/50 disabled:opacity-50"
                    >
                      <Truck className="h-4 w-4" /> Regenerate E-Way (force)
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!!actionLoading || eWayPreviewLoading || eWayGenerateLoading}
                    onClick={() =>
                      runAction(
                        'e-invoice',
                        () => generateEInvoice(dispatch.id),
                        (result) => {
                          const einv = result as EInvoice;
                          return {
                            title: 'E-Invoice generated',
                            description: einv.irn
                              ? `IRN ${einv.irn.slice(0, 24)}…`
                              : 'Masters India accepted the request.',
                          };
                        },
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-50"
                  >
                    {actionLoading === 'e-invoice' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <FileDigit className="h-4 w-4" />
                    {eInvoice?.irn ? 'Regenerate E-Invoice' : 'Generate E-Invoice'}
                  </button>
                </div>
              )}
              {dispatch.status === 'cancelled' && (
                <div className="flex flex-wrap gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={() => {
                        onOpenChange(false);
                        onEdit(dispatch.id);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-border bg-background hover:bg-muted disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!!actionLoading}
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50"
                  >
                    {actionLoading === 'delete' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
            </>
          ) : (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold">Invoice Dispatch</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>
              <p className="text-sm text-muted-foreground">Could not load dispatch.</p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    <EWayBillPreviewDialog
      open={eWayPreviewOpen}
      onOpenChange={(next) => {
        setEWayPreviewOpen(next);
        if (!next) setEWayPreview(null);
      }}
      preview={eWayPreview}
      mode="bill-of-supply"
      confirming={eWayGenerateLoading}
      onConfirmGenerate={(overrides) =>
        void runGenerateEWayBill(false, overrides, { skipConfirm: true })
      }
    />

    <ConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      onConfirm={() => void handleDelete()}
      title="Delete invoice dispatch"
      description={
        dispatch
          ? deleteInvoiceDispatchConfirmDescription(dispatch.status)
          : 'This dispatch will be permanently deleted.'
      }
      confirmText="Delete"
      variant="danger"
    />

    <ConfirmDialog
      open={cancelConfirmOpen}
      onOpenChange={setCancelConfirmOpen}
      onConfirm={() => void handleCancelTransfer()}
      title="Cancel godown transfer"
      description="This reverses the confirmed transfer: destination stock is debited and source stock is restored. It will fail if destination stock was already used. Sauda remaining quantity becomes available again."
      confirmText="Cancel transfer"
      variant="danger"
    />
    </>
  );
}
