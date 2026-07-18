import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState, useCallback } from 'react';
import {
  X,
  Loader2,
  CheckCircle,
  FileDigit,
  Truck,
  Package,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicleMap } from '../../../hooks/useVehicles';
import { usePackaging } from '../../../hooks/usePackaging';
import { useProducts } from '../../../hooks/useProducts';
import { inventoryAPI } from '../../../services/inventory.api';
import { salesSaudasAPI } from '../../../services/salesSaudas.api';
import { salesPartySitesAPI } from '../../../services/salesPartySites.api';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { toast } from '../../../utils/toast';
import {
  extractApiErrorMessage,
  getComplianceProviderLabel,
  isMastersIndiaMockPayload,
} from '../../../utils/mastersIndiaSales';
import QRCode from 'qrcode';
import { useGodowns } from '../../../hooks/useGodowns';
import type {
  InvoiceDispatch,
  SalesSauda,
  EInvoice,
  EWayBill,
  CreateEWayBillRequest,
} from '../../../types/sales';
import type { SalesPartySite } from '../../../types/entities';
import { formatPacketTypeLabel } from '../../../constants/bagAndPacketTypes';
import { BillShipToAddresses } from '../shared/BillShipToAddresses';
import { UploadedDocumentPreview } from '../../shared/UploadedDocumentPreview';

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

function ComplianceProviderBadge({ payload, provider }: { payload?: unknown; provider?: string | null }) {
  const isMock = provider === 'mock' || isMastersIndiaMockPayload(payload);
  const label = isMock ? 'Mock' : provider ? getComplianceProviderLabel({ provider }) : getComplianceProviderLabel(payload);
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        isMock
          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
          : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
      }`}
    >
      {label}
    </span>
  );
}

function EInvoiceQrDisplay({ content }: { content: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(content, { width: 160, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [content]);

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt="E-invoice QR code"
        className="h-40 w-40 rounded border bg-white p-1"
      />
    );
  }
  return (
    <p className="font-mono text-xs break-all text-muted-foreground">{content}</p>
  );
}

function formatPartySiteLabel(site: SalesPartySite): string {
  const n = site.name?.trim();
  const line = [site.address?.city, site.address?.state].filter(Boolean).join(', ');
  return n ? `${n}${line ? ` · ${line}` : ''}` : line || site.id.slice(0, 8);
}

interface InvoiceDispatchDetailModalProps {
  dispatchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  getProductName: (id: string) => string;
}

export function InvoiceDispatchDetailModal({
  dispatchId,
  open,
  onOpenChange,
  onSuccess,
  getProductName,
}: InvoiceDispatchDetailModalProps) {
  const {
    getById,
    patch,
    confirm,
    uploadBilti,
    getEInvoice,
    getEWayBills,
    generateEInvoice,
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
  const [partySites, setPartySites] = useState<SalesPartySite[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [patchDeliverySiteId, setPatchDeliverySiteId] = useState('');
  const [patchLrNumber, setPatchLrNumber] = useState('');
  // const [patchTcsAmount, setPatchTcsAmount] = useState('');
  const [savingPatch, setSavingPatch] = useState(false);
  const [uploadingBilti, setUploadingBilti] = useState(false);

  const [eWayVehicleNumber, setEWayVehicleNumber] = useState('');
  const [eWayDistanceKm, setEWayDistanceKm] = useState('');
  const [eWayRoute, setEWayRoute] = useState('');
  const [eWayTransporterId, setEWayTransporterId] = useState<string>('');
  const [eWayLrNumber, setEWayLrNumber] = useState('');
  const [eWayAdvancedOpen, setEWayAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!dispatch || dispatch.status !== 'confirmed') return;
    setEWayVehicleNumber((prev) => {
      if (prev.trim()) return prev;
      return dispatch.vehicle_id ? getVehicleNumber(dispatch.vehicle_id) || '' : '';
    });
    setEWayDistanceKm((prev) => {
      if (prev.trim()) return prev;
      return dispatch.distance_km != null ? String(dispatch.distance_km) : '';
    });
    setEWayRoute((prev) => {
      if (prev.trim()) return prev;
      return dispatch.route_description?.trim() || '';
    });
    setEWayTransporterId((prev) => prev || dispatch.transporter_id || '');
    setEWayLrNumber((prev) => {
      if (prev.trim()) return prev;
      return dispatch.lr_number?.trim() || '';
    });
    if (!dispatch.vehicle_id) setEWayAdvancedOpen(true);
  }, [
    dispatch?.id,
    dispatch?.status,
    dispatch?.vehicle_id,
    dispatch?.distance_km,
    dispatch?.route_description,
    dispatch?.transporter_id,
    dispatch?.lr_number,
    getVehicleNumber,
  ]);

  const resolvedEWayVehicle = useCallback((): string => {
    const override = eWayVehicleNumber.trim();
    if (override) return override;
    if (dispatch?.vehicle_id) return getVehicleNumber(dispatch.vehicle_id) || '';
    return '';
  }, [dispatch?.vehicle_id, eWayVehicleNumber, getVehicleNumber]);

  const godownGstin =
    dispatch?.godown_id != null
      ? godowns.find((g) => g.id === dispatch.godown_id)?.gst_number?.trim() || null
      : null;

  const validateEWayGenerate = (): boolean => {
    if (!resolvedEWayVehicle()) {
      toast.error(
        'Vehicle required',
        'Set a verified vehicle on the dispatch or enter a vehicle number under e-way overrides.',
      );
      setEWayAdvancedOpen(true);
      return false;
    }
    return true;
  };

  const buildEWayBody = useCallback((): CreateEWayBillRequest => {
    const body: CreateEWayBillRequest = {};
    const v = resolvedEWayVehicle();
    if (v) body.vehicle_number = v.toUpperCase();
    const dk = eWayDistanceKm.trim();
    if (dk !== '') {
      const n = Number(dk);
      if (!Number.isNaN(n)) body.distance_km = n;
    }
    const r = eWayRoute.trim();
    if (r) body.route = r;
    if (eWayTransporterId) body.transporter_id = eWayTransporterId;
    const lr = eWayLrNumber.trim();
    if (lr) body.lr_number = lr;
    return body;
  }, [eWayDistanceKm, eWayRoute, eWayTransporterId, eWayLrNumber, resolvedEWayVehicle]);

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
      setPartySites([]);
      setEWayVehicleNumber('');
      setEWayDistanceKm('');
      setEWayRoute('');
      setEWayTransporterId('');
      setEWayAdvancedOpen(false);
    }
  }, [open, dispatchId, getById]);

  useEffect(() => {
    if (!dispatch) return;
    setPatchDeliverySiteId(dispatch.delivery_site_id ?? '');
    setPatchLrNumber(dispatch.lr_number ?? '');
    // setPatchTcsAmount(
    //   dispatch.tcs_amount != null && !Number.isNaN(Number(dispatch.tcs_amount))
    //     ? String(dispatch.tcs_amount)
    //     : ''
    // );
  }, [dispatch?.id, dispatch?.delivery_site_id, dispatch?.lr_number /*, dispatch?.tcs_amount */]);

  useEffect(() => {
    if (!open || !dispatch?.sales_sauda_id) {
      setLinkedSauda(null);
      setPartySites([]);
      return;
    }
    let cancelled = false;
    setLoadingSites(true);
    salesSaudasAPI
      .getById(dispatch.sales_sauda_id)
      .then((sauda) => {
        if (cancelled) return Promise.resolve(null);
        setLinkedSauda(sauda);
        if (!sauda?.sales_party_id) {
          setPartySites([]);
          return Promise.resolve(null);
        }
        return salesPartySitesAPI.list(sauda.sales_party_id);
      })
      .then((sites) => {
        if (!cancelled && sites && Array.isArray(sites)) setPartySites(sites);
      })
      .catch(() => {
        if (!cancelled) {
          setLinkedSauda(null);
          setPartySites([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSites(false);
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

  const handleSavePatch = async () => {
    if (!dispatch) return;
    const nextSite = patchDeliverySiteId.trim() || null;
    const nextLr = patchLrNumber.trim() || null;
    // TCS amount temporarily hidden from invoice dispatch UI
    // const tcsTrim = patchTcsAmount.trim();
    // let nextTcs: number | null = null;
    // if (tcsTrim !== '') {
    //   const n = Number(tcsTrim);
    //   if (Number.isNaN(n)) {
    //     toast.error('Validation', 'TCS amount must be a valid number');
    //     return;
    //   }
    //   nextTcs = n;
    // }
    setSavingPatch(true);
    try {
      await patch(dispatch.id, {
        delivery_site_id: nextSite,
        lr_number: nextLr,
        // tcs_amount: nextTcs,
      });
      const updated = await getById(dispatch.id);
      setDispatch(updated);
      toast.success('Saved', 'Dispatch details updated');
      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast.error('Error', msg);
    } finally {
      setSavingPatch(false);
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border bg-background p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Invoice Dispatch</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : dispatch ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Invoice No.</span>
                  <p className="font-medium">{dispatch.internal_invoice_number}</p>
                  {dispatch.financial_year ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      FY {dispatch.financial_year}
                    </p>
                  ) : null}
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">{dispatch.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dispatch date</span>
                  <p className="font-medium">{dispatch.dispatch_date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dispatch from</span>
                  <p className="font-medium">
                    {dispatch.godown_id
                      ? godowns.find((g) => g.id === dispatch.godown_id)?.name ?? dispatch.godown_id
                      : '–'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Party</span>
                  <p className="font-medium">{dispatch.party_name}</p>
                </div>
                <div className="col-span-2 rounded-md border border-border/50 bg-muted/10 p-3">
                  <BillShipToAddresses
                    billingAddress={linkedSauda?.billing_address}
                    deliveryAddress={linkedSauda?.delivery_address}
                    billingFallbackText={dispatch.party_address}
                  />
                  {!linkedSauda?.billing_address &&
                    !linkedSauda?.delivery_address &&
                    !dispatch.party_address && (
                      <p className="text-xs text-muted-foreground">No bill/ship addresses.</p>
                    )}
                </div>
                <div>
                  <span className="text-muted-foreground">GST</span>
                  <p className="font-medium">{dispatch.party_gst_number ?? '–'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">PAN</span>
                  <p className="font-medium">{dispatch.party_pan_number ?? '–'}</p>
                </div>
                {dispatch.usp?.trim() && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">USP</span>
                    <p className="font-medium whitespace-pre-wrap">{dispatch.usp}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Transporter</span>
                  <p className="font-medium">{transporterName(dispatch.transporter_id)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">LR number</span>
                  <p className="font-medium">{dispatch.lr_number?.trim() || '–'}</p>
                </div>
                <div className="col-span-2 space-y-2 rounded-md border border-border/50 bg-muted/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground text-sm">Bilti</span>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
                      {uploadingBilti ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {biltiPreviewUrl ? 'Replace bilti' : 'Upload bilti'}
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
                  <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, or PDF — max 10MB</p>
                  {biltiPreviewUrl ? (
                    <UploadedDocumentPreview url={biltiPreviewUrl} compact alt="Bilti" />
                  ) : (
                    <p className="text-sm text-muted-foreground">No bilti uploaded</p>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Vehicle</span>
                  <p className="font-medium">{dispatch.vehicle_id ? getVehicleNumber(dispatch.vehicle_id) : '–'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Transportation cost</span>
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
                {dispatch.distance_km != null && (
                  <div>
                    <span className="text-muted-foreground">Distance (km)</span>
                    <p className="font-medium">{dispatch.distance_km}</p>
                  </div>
                )}
                {dispatch.route_description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Route</span>
                    <p className="font-medium">{dispatch.route_description}</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 p-3 space-y-3 text-sm">
                <div className="font-medium text-foreground">LR & ship-to</div>
                <p className="text-xs text-muted-foreground">
                  Optional overrides for Masters India e-invoice / e-way bill. Same as bill-to if ship-to is cleared.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      LR number
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={patchLrNumber}
                      onChange={(e) => setPatchLrNumber(e.target.value)}
                      placeholder="Transporter LR / doc no."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Ship-to site
                    </label>
                    <select
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      disabled={loadingSites}
                      value={patchDeliverySiteId}
                      onChange={(e) => setPatchDeliverySiteId(e.target.value)}
                    >
                      <option value="">Same as bill-to</option>
                      {partySites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatPartySiteLabel(s)}
                        </option>
                      ))}
                    </select>
                    {loadingSites && (
                      <p className="mt-1 text-xs text-muted-foreground">Loading sites…</p>
                    )}
                  </div>
                  {/* <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      TCS amount
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={patchTcsAmount}
                      onChange={(e) => setPatchTcsAmount(e.target.value)}
                      placeholder="Optional"
                    />
                  </div> */}
                </div>
                <button
                  type="button"
                  disabled={savingPatch}
                  onClick={() => void handleSavePatch()}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-50"
                >
                  {savingPatch && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save LR / ship-to
                </button>
              </div>

              {dispatch.lines && dispatch.lines.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Lines</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left p-2 font-medium">Product</th>
                          <th className="text-left p-2 font-medium">HSN</th>
                          <th className="text-left p-2 font-medium">Bag</th>
                          <th className="text-right p-2 font-medium">Qty</th>
                          <th className="text-right p-2 font-medium">Rate</th>
                          <th className="text-right p-2 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dispatch.lines.map((l) => {
                          const hsn = getProductHsn(l.product_id);
                          return (
                          <tr key={l.id} className="border-b last:border-0">
                            <td className="p-2">{getProductName(l.product_id)}</td>
                            <td className="p-2">
                              {hsn ? (
                                <span className="tabular-nums">{hsn}</span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-300">Missing</span>
                              )}
                            </td>
                            <td className="p-2">{getPackagingLabel(l.packaging_id)}</td>
                            <td className="p-2 text-right">
                              {l.quantity} {l.quantity_unit}
                            </td>
                            <td className="p-2 text-right">{l.rate}</td>
                            <td className="p-2 text-right">{l.amount}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
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
              {dispatch.status === 'confirmed' && (
                <div className="rounded-lg border border-border/60 bg-muted/15 p-3 text-sm">
                  <h4 className="mb-2 font-medium">Masters India prerequisites</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className={dispatch.status === 'confirmed' ? 'text-foreground' : ''}>
                      Dispatch confirmed
                    </li>
                    <li className={godownGstin ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}>
                      Godown GSTIN: {godownGstin || 'Missing — add GSTIN on godown master'}
                    </li>
                    <li className={dispatch.party_gst_number ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}>
                      Party GSTIN: {dispatch.party_gst_number || 'Missing'}
                    </li>
                    <li className={resolvedEWayVehicle() ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}>
                      Vehicle for e-way: {resolvedEWayVehicle() || 'Required before generate'}
                    </li>
                    <li className={eInvoice?.irn ? 'text-foreground' : 'text-muted-foreground'}>
                      E-invoice IRN: {eInvoice?.irn ? 'Generated' : 'Not generated yet'}
                    </li>
                  </ul>
                </div>
              )}
              {dispatch.status === 'confirmed' && eInvoice !== undefined && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <h4 className="text-sm font-medium mb-2 flex flex-wrap items-center gap-2">
                    <FileDigit className="h-4 w-4" /> E-Invoice (Masters India)
                    {eInvoice != null && (
                      <ComplianceProviderBadge
                        provider={eInvoice.provider}
                        payload={eInvoice.government_response_payload}
                      />
                    )}
                    {eInvoice?.status && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{eInvoice.status}</span>
                    )}
                  </h4>
                  {eInvoice == null ? (
                    <p className="text-sm text-muted-foreground">Not generated yet. Use the button below to generate.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {eInvoice.irn && (
                          <div>
                            <span className="text-muted-foreground">IRN</span>
                            <p className="font-medium break-all">{eInvoice.irn}</p>
                          </div>
                        )}
                        {eInvoice.acknowledgement_number && (
                          <div>
                            <span className="text-muted-foreground">Ack. number</span>
                            <p className="font-medium">{eInvoice.acknowledgement_number}</p>
                          </div>
                        )}
                        {eInvoice.ack_date && (
                          <div>
                            <span className="text-muted-foreground">Ack. date</span>
                            <p className="font-medium">{eInvoice.ack_date}</p>
                          </div>
                        )}
                        {eInvoice.qr_code_content && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Signed QR</span>
                            <div className="mt-2">
                              <EInvoiceQrDisplay content={eInvoice.qr_code_content} />
                            </div>
                          </div>
                        )}
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Masters India response (audit)
                        </summary>
                        <pre className="mt-2 max-h-28 overflow-auto rounded border bg-background/80 p-2 font-mono">
                          {JSON.stringify(eInvoice.government_response_payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}
              {dispatch.status === 'confirmed' && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> E-Way Bill(s) — Masters India
                  </h4>
                  {eWayBills.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None yet. Generate below (vehicle on dispatch or in overrides).</p>
                  ) : (
                    <div className="space-y-2">
                      {eWayBills.map((ewb) => (
                        <div key={ewb.id} className="rounded border bg-background/60 p-2 text-sm">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <ComplianceProviderBadge provider={ewb.provider} payload={ewb.payload} />
                            {ewb.print_url && (
                              <a
                                href={ewb.print_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" /> Print / PDF
                              </a>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {ewb.eway_bill_number && (
                              <div>
                                <span className="text-muted-foreground">EWB number</span>
                                <p className="font-medium">{ewb.eway_bill_number}</p>
                              </div>
                            )}
                            {ewb.vehicle_number && (
                              <div>
                                <span className="text-muted-foreground">Vehicle</span>
                                <p className="font-medium">{ewb.vehicle_number}</p>
                              </div>
                            )}
                            {ewb.distance_km != null && (
                              <div>
                                <span className="text-muted-foreground">Distance (km)</span>
                                <p className="font-medium">{ewb.distance_km}</p>
                              </div>
                            )}
                            {ewb.valid_until && (
                              <div>
                                <span className="text-muted-foreground">Valid until</span>
                                <p className="font-medium">{ewb.valid_until}</p>
                              </div>
                            )}
                            {ewb.route && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Route</span>
                                <p className="font-medium">{ewb.route}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {dispatch.status === 'draft' && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
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
                <div className="space-y-3 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => setEWayAdvancedOpen((o) => !o)}
                    className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-left text-sm font-medium hover:bg-muted/40"
                  >
                    E-way overrides (vehicle, distance, route, transporter, LR)
                    {resolvedEWayVehicle() && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Vehicle: {resolvedEWayVehicle()}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${eWayAdvancedOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {eWayAdvancedOpen && (
                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-dashed border-border/70 p-3 sm:grid-cols-2 text-sm">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-muted-foreground">
                          Vehicle number (required if dispatch has no vehicle)
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          value={eWayVehicleNumber}
                          onChange={(e) => setEWayVehicleNumber(e.target.value)}
                          placeholder="Override registration"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Distance (km)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          value={eWayDistanceKm}
                          onChange={(e) => setEWayDistanceKm(e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Transporter override</label>
                        <select
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          value={eWayTransporterId}
                          onChange={(e) => setEWayTransporterId(e.target.value)}
                        >
                          <option value="">Use dispatch transporter</option>
                          {transporters.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.business_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-muted-foreground">Route</label>
                        <input
                          type="text"
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          value={eWayRoute}
                          onChange={(e) => setEWayRoute(e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-muted-foreground">
                          LR number (transporter document)
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          value={eWayLrNumber}
                          onChange={(e) => setEWayLrNumber(e.target.value)}
                          placeholder={
                            dispatch.lr_number?.trim()
                              ? `Default: ${dispatch.lr_number.trim()}`
                              : 'Optional override for e-way'
                          }
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!!actionLoading}
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
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={() => {
                        if (!validateEWayGenerate()) return;
                        void runAction(
                          'e-way',
                          () => generateEWayBill(dispatch.id, { body: buildEWayBody() }),
                          (result) => {
                            const ewb = result as EWayBill;
                            return {
                              title: 'E-Way bill generated',
                              description: ewb.eway_bill_number
                                ? `EWB ${ewb.eway_bill_number}`
                                : 'Masters India accepted the request.',
                            };
                          },
                        );
                      }}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-50"
                    >
                      {actionLoading === 'e-way' && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <Truck className="h-4 w-4" /> Generate E-Way Bill
                    </button>
                    {eWayBills.length > 0 && (
                      <button
                        type="button"
                        disabled={!!actionLoading}
                        onClick={() => {
                          if (
                            !window.confirm(
                              'Regenerate e-way bill? This calls Masters India again with force=true and may add another e-way row.'
                            )
                          )
                            return;
                          if (!validateEWayGenerate()) return;
                          void runAction('e-way-force', () =>
                            generateEWayBill(dispatch.id, {
                              force: true,
                              body: buildEWayBody(),
                            })
                          );
                        }}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-border bg-background hover:bg-muted/50 disabled:opacity-50"
                      >
                        {actionLoading === 'e-way-force' && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <Truck className="h-4 w-4" /> Regenerate E-Way (force)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Could not load dispatch.</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
