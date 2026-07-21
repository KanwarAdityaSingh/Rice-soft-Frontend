import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Loader2, Plus, RefreshCw, Check, FileText } from 'lucide-react';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { useSalesSaudas } from '../../../hooks/useSalesSaudas';
import { useSalesParties } from '../../../hooks/useSalesParties';
import { useProducts } from '../../../hooks/useProducts';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicles } from '../../../hooks/useVehicles';
import { toast } from '../../../utils/toast';
import { extractApiErrorMessage } from '../../../utils/mastersIndiaSales';
import {
  formatBagsInput,
  formatQty,
  getSaudaLineRemaining,
  hasSaudaRemaining,
  isSaudaFullyDispatched,
  isSaudaLineFullyDispatched,
  remainingBagsFromQty,
} from '../../../utils/salesSaudaFulfillment';
import { buildBillOfSupplyLivePreview } from '../../../utils/billOfSupplyLivePreview';
import { useGodowns } from '../../../hooks/useGodowns';
import { usePackaging } from '../../../hooks/usePackaging';
import {
  DateInputWithSteppers,
  shiftIsoDate,
  toIsoDateString,
} from '../../shared/DateInputWithSteppers';
import { TransporterFormModal } from '../../admin/transporters/TransporterFormModal';
import { VehicleFormModal } from '../../admin/vehicles/VehicleFormModal';
import { UploadedDocumentPreview } from '../../shared/UploadedDocumentPreview';
import {
  BillOfSupplyDocument,
  BILL_OF_SUPPLY_GOOGLE_FONTS,
  BILL_OF_SUPPLY_STYLES,
} from './pdf/BillOfSupplyDocument';
import type {
  CreateInvoiceDispatchLineInput,
  CreateInvoiceDispatchRequest,
  InvoiceDispatch,
  SalesSauda,
} from '../../../types/sales';
import type { SalesParty } from '../../../types/entities';
import { salesSaudasAPI } from '../../../services/salesSaudas.api';
import { invoiceDispatchesAPI } from '../../../services/invoiceDispatches.api';
import {
  getTransporterInvoiceDispatchBlockers,
  isTransporterEligibleForInvoiceDispatch,
} from '../../../utils/transporterInvoiceDispatchEligibility';
import { isGodownTransfer } from '../../../constants/sales-movement-types';

const BOS_FONT_LINK_ID = 'bill-of-supply-google-fonts';
/** Bill of Supply page width in CSS px (matches BillOfSupplyDocument). */
const BOS_PAGE_WIDTH_PX = 794;

/** Per-line pick for partial create (bags default from remaining ÷ capacity). */
type DispatchLinePick = {
  sales_sauda_line_id: string;
  included: boolean;
  /** Bags — primary input when sauda line has packaging. */
  bagsInput: string;
  /** Fallback kg input when sauda line has no packaging. */
  quantityInput: string;
};

const BILTI_ACCEPT = 'image/jpeg,image/png,image/gif,application/pdf,.pdf';
const BILTI_MAX_BYTES = 10 * 1024 * 1024;
/** Max bags that can be entered on a dispatch line. */
const MAX_BAGS = 12_000;

function validateBiltiFile(file: File): string | null {
  const okType =
    /^(image\/jpeg|image\/png|image\/gif|application\/pdf)$/i.test(file.type) ||
    /\.(jpe?g|png|gif|pdf)$/i.test(file.name);
  if (!okType) return 'Bilti must be a JPEG, PNG, GIF, or PDF';
  if (file.size > BILTI_MAX_BYTES) return 'Bilti file must be 10MB or smaller';
  return null;
}

function formatGodownLabel(godown: { name: string; gst_number?: string | null } | undefined): string {
  if (!godown) return '–';
  const gst = godown.gst_number?.trim();
  return gst ? `${godown.name} · GST ${gst}` : godown.name;
}

/** USP applies when the sales party has neither GST nor PAN. */
function salesPartyNeedsUsp(party: SalesParty | undefined): boolean {
  if (!party) return false;
  const gst = party.business_details?.gst_number?.trim();
  const pan = party.business_details?.pan_number?.trim();
  return !gst && !pan;
}

const USP_MAX_LENGTH = 2000;
/** LR / transporter document number — max 10 digits. */
const LR_NUMBER_MAX_DIGITS = 10;
/** Transportation cost ceiling for FOR saudas (₹5 lakh). */
const TRANSPORTATION_COST_MAX = 500_000;

const VEHICLE_VERIFIED_ONLY_MESSAGE =
  'Only verified vehicles can be used for invoice dispatch. Verify the vehicle in Directory first.';

interface InvoiceDispatchFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, opens in edit mode (PUT) — logistics fields for any status. */
  dispatchId?: string | null;
  /** Prefill sales sauda on create (e.g. from sauda detail). */
  initialSalesSaudaId?: string | null;
  onSuccess?: () => void;
}

export function InvoiceDispatchFormModal({
  open,
  onOpenChange,
  dispatchId = null,
  initialSalesSaudaId = null,
  onSuccess,
}: InvoiceDispatchFormModalProps) {
  const { create, update, getById } = useInvoiceDispatches();
  const isEdit = Boolean(dispatchId);
  /** Include sale + godown_transfer finalized orders */
  const { salesSaudas } = useSalesSaudas({ status: 'order', movement_type: 'all' });
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
  const { packaging } = usePackaging();

  const packagingById = useMemo(() => {
    const map = new Map(packaging.map((p) => [p.id, p]));
    return map;
  }, [packaging]);

  const getLineCapacity = (packagingId: string | null | undefined): number => {
    if (!packagingId) return 0;
    return Number(packagingById.get(packagingId)?.holding_capacity) || 0;
  };

  const [pendingBiltiFile, setPendingBiltiFile] = useState<File | null>(null);
  const [pendingBiltiPreviewUrl, setPendingBiltiPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateInvoiceDispatchRequest>({
    godown_id: '',
    sales_sauda_id: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    transporter_id: null,
    vehicle_id: null,
    lr_number: null,
    usp: null,
    transportation_cost: null,
    route_description: null,
  });
  const [editingDispatch, setEditingDispatch] = useState<InvoiceDispatch | null>(null);
  const [loadingDispatch, setLoadingDispatch] = useState(false);
  // const [tcsAmountInput, setTcsAmountInput] = useState('');
  const [transportationCostInput, setTransportationCostInput] = useState('');
  const [distanceKmInput, setDistanceKmInput] = useState('');
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
  const [linePicks, setLinePicks] = useState<DispatchLinePick[]>([]);
  const [previewScale, setPreviewScale] = useState(0.85);
  const previewPaneRef = useRef<HTMLDivElement>(null);

  const selectedSaudaFromList = useMemo(
    () => salesSaudas.find((s) => s.id === formData.sales_sauda_id),
    [salesSaudas, formData.sales_sauda_id]
  );

  const selectedSauda = selectedSaudaDetail ?? selectedSaudaFromList;
  const selectedSaudaPartyId = selectedSauda?.sales_party_id;
  const isTransferSauda = isGodownTransfer(selectedSauda);
  /** Transportation cost only applies to FOR saudas (not typical for transfers) */
  const showTransportationCost = !isTransferSauda && selectedSauda?.sauda_type === 'for';

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

  const selectedGodown = useMemo(
    () => godowns.find((g) => g.id === formData.godown_id),
    [godowns, formData.godown_id],
  );

  const selectedSaudaLines = useMemo(() => {
    const lines = selectedSaudaDetail?.lines ?? selectedSauda?.lines ?? [];
    return [...lines].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [selectedSaudaDetail?.lines, selectedSauda?.lines]);

  const livePreviewVm = useMemo(
    () =>
      buildBillOfSupplyLivePreview({
        sauda: selectedSaudaDetail ?? selectedSauda,
        salesParty: selectedSalesParty,
        godown: selectedGodown,
        transporter: selectedTransporter,
        vehicle: selectedVehicle,
        dispatchDate: formData.dispatch_date,
        lrNumber: formData.lr_number,
        distanceKm: distanceKmInput,
        usp: formData.usp,
        linePicks: isEdit ? undefined : linePicks,
        getLineCapacity,
        productById,
        editingDispatch,
      }),
    [
      selectedSaudaDetail,
      selectedSauda,
      selectedSalesParty,
      selectedGodown,
      selectedTransporter,
      selectedVehicle,
      formData.dispatch_date,
      formData.lr_number,
      formData.usp,
      distanceKmInput,
      isEdit,
      linePicks,
      packagingById,
      productById,
      editingDispatch,
    ],
  );

  const assetBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  /** Dispatch date may be today or at most +2 calendar days. */
  const dispatchDateBounds = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const min = toIsoDateString(today);
    const max = shiftIsoDate(min, 2);
    return { min, max };
  }, []);

  const saudaHasRemaining = hasSaudaRemaining(selectedSaudaDetail ?? selectedSauda);
  const saudaFullyDispatched = isSaudaFullyDispatched(selectedSaudaDetail ?? selectedSauda);

  const resetCreateForm = (prefillSaudaId?: string | null) => {
    setFormData({
      godown_id: '',
      sales_sauda_id: prefillSaudaId?.trim() || '',
      to_godown_id: null,
      dispatch_date: new Date().toISOString().split('T')[0],
      transporter_id: null,
      vehicle_id: null,
      lr_number: null,
      usp: null,
      transportation_cost: null,
      route_description: null,
    });
    setEditingDispatch(null);
    setTransportationCostInput('');
    setDistanceKmInput('');
    setSelectedSaudaDetail(null);
    setLinePicks([]);
    setPendingBiltiFile(null);
    setPendingBiltiPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setErrors({});
  };

  const applyDispatchToForm = (d: InvoiceDispatch) => {
    setEditingDispatch(d);
    setFormData({
      godown_id: d.godown_id ?? '',
      sales_sauda_id: d.sales_sauda_id,
      dispatch_date: d.dispatch_date,
      transporter_id: d.transporter_id,
      vehicle_id: d.vehicle_id,
      lr_number: d.lr_number ?? null,
      usp: d.usp ?? null,
      transportation_cost: d.transportation_cost ?? null,
      route_description: d.route_description ?? null,
      distance_km: d.distance_km ?? undefined,
    });
    setTransportationCostInput(
      d.transportation_cost != null && !Number.isNaN(Number(d.transportation_cost))
        ? String(d.transportation_cost)
        : '',
    );
    setDistanceKmInput(
      d.distance_km != null && !Number.isNaN(Number(d.distance_km))
        ? String(d.distance_km)
        : '',
    );
    setPendingBiltiFile(null);
    setPendingBiltiPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setErrors({});
  };

  useEffect(() => {
    if (!open) return;
    if (!document.getElementById(BOS_FONT_LINK_ID)) {
      const link = document.createElement('link');
      link.id = BOS_FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = BILL_OF_SUPPLY_GOOGLE_FONTS;
      document.head.appendChild(link);
    }
  }, [open]);

  // Fit A4 preview to the side pane width so text stays readable.
  useEffect(() => {
    if (!open) return;
    const el = previewPaneRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const updateScale = () => {
      const padding = 24; // p-3 on scroll container
      const available = Math.max(280, el.clientWidth - padding);
      const next = Math.min(1, available / BOS_PAGE_WIDTH_PX);
      setPreviewScale(Number(next.toFixed(3)));
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!dispatchId) {
      resetCreateForm(initialSalesSaudaId);
      return;
    }
    let cancelled = false;
    setLoadingDispatch(true);
    setErrors({});
    getById(dispatchId)
      .then((d) => {
        if (cancelled) return;
        applyDispatchToForm(d);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrors({
          submit: extractApiErrorMessage(err, 'Failed to load dispatch'),
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingDispatch(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, dispatchId, getById, initialSalesSaudaId]);

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
      setLinePicks([]);
      return;
    }
    let cancelled = false;
    setLoadingSaudaDetail(true);
    salesSaudasAPI
      .getById(formData.sales_sauda_id)
      .then((sauda) => {
        if (cancelled) return;
        setSelectedSaudaDetail(sauda);
        if (!isEdit) {
          if (isGodownTransfer(sauda)) {
            setFormData((p) => ({
              ...p,
              godown_id: sauda.from_godown_id || p.godown_id,
              to_godown_id: sauda.to_godown_id || null,
            }));
          } else {
            setFormData((p) => ({ ...p, to_godown_id: null }));
          }
          const sorted = [...(sauda.lines ?? [])].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
          );
          setLinePicks(
            sorted.map((line) => {
              const remaining = getSaudaLineRemaining(line);
              const canShip = remaining > 1e-9;
              const capacity =
                line.packaging_id
                  ? Number(packagingById.get(line.packaging_id)?.holding_capacity) || 0
                  : 0;
              const bags =
                canShip && capacity > 0 ? remainingBagsFromQty(remaining, capacity) : 0;
              return {
                sales_sauda_line_id: line.id,
                included: canShip,
                bagsInput: bags > 0 ? formatBagsInput(bags) : '',
                quantityInput: canShip && capacity <= 0 ? formatBagsInput(remaining) : '',
              };
            }),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedSaudaDetail(null);
          setLinePicks([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSaudaDetail(false);
      });
    return () => {
      cancelled = true;
    };
    // packagingById intentionally omitted — backfill bags when packaging loads below
  }, [formData.sales_sauda_id, isEdit]);

  // If packaging arrives after sauda GET, fill empty bag defaults once.
  useEffect(() => {
    if (isEdit || !selectedSaudaDetail || packagingById.size === 0) return;
    setLinePicks((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((pick) => {
        if (pick.bagsInput || pick.quantityInput) return pick;
        const line = selectedSaudaDetail.lines?.find((l) => l.id === pick.sales_sauda_line_id);
        if (!line || isSaudaLineFullyDispatched(line)) return pick;
        const remaining = getSaudaLineRemaining(line);
        const capacity = line.packaging_id
          ? Number(packagingById.get(line.packaging_id)?.holding_capacity) || 0
          : 0;
        if (capacity <= 0) {
          if (remaining > 1e-9) {
            changed = true;
            return {
              ...pick,
              included: true,
              quantityInput: formatBagsInput(remaining),
            };
          }
          return pick;
        }
        const bags = remainingBagsFromQty(remaining, capacity);
        if (bags <= 0) return pick;
        changed = true;
        return {
          ...pick,
          included: true,
          bagsInput: formatBagsInput(bags),
        };
      });
      return changed ? next : prev;
    });
  }, [isEdit, selectedSaudaDetail, packagingById]);

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

  const buildCreateLines = (): CreateInvoiceDispatchLineInput[] | null => {
    const lineById = new Map(selectedSaudaLines.map((l) => [l.id, l]));
    const out: CreateInvoiceDispatchLineInput[] = [];
    for (const pick of linePicks) {
      if (!pick.included) continue;
      const line = lineById.get(pick.sales_sauda_line_id);
      if (!line) continue;
      const remaining = getSaudaLineRemaining(line);
      if (remaining <= 1e-9) continue;
      const capacity = getLineCapacity(line.packaging_id);
      if (capacity > 0 && line.packaging_id) {
        const bags = Number(pick.bagsInput);
        if (Number.isNaN(bags) || bags <= 0) continue;
        out.push({
          sales_sauda_line_id: pick.sales_sauda_line_id,
          packet_count: bags,
        });
      } else {
        const qty = Number(pick.quantityInput);
        if (Number.isNaN(qty) || qty <= 0) continue;
        out.push({
          sales_sauda_line_id: pick.sales_sauda_line_id,
          quantity: qty,
        });
      }
    }
    return out;
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!isEdit) {
      if (!formData.godown_id) e.godown_id = 'Select dispatch godown (stock will deduct here)';
      if (!formData.sales_sauda_id) e.sales_sauda_id = 'Select a sales order';
      if (formData.sales_sauda_id && selectedSaudaDetail) {
        if (selectedSaudaDetail.status !== 'order') {
          e.sales_sauda_id = 'Sauda must be finalized (order) before dispatch';
        } else {
          if (isGodownTransfer(selectedSaudaDetail)) {
            if (
              selectedSaudaDetail.from_godown_id &&
              formData.godown_id !== selectedSaudaDetail.from_godown_id
            ) {
              e.godown_id = 'For godown transfer, dispatch godown must be the source (from) godown';
            }
            if (!selectedSaudaDetail.to_godown_id && !formData.to_godown_id) {
              e.to_godown_id = 'Transfer sauda is missing destination godown';
            }
          }
          if (!saudaHasRemaining) {
            e.lines =
              'Nothing remaining on this sauda — all quantity is already allocated or dispatched.';
          } else {
            const lineById = new Map(selectedSaudaLines.map((l) => [l.id, l]));
            const included = linePicks.filter((p) => p.included);
            if (included.length === 0) {
              e.lines = 'Select at least one line with bags (or qty) to dispatch';
            }
            const seen = new Set<string>();
            for (const pick of included) {
              if (seen.has(pick.sales_sauda_line_id)) {
                e.lines = 'Duplicate sauda lines are not allowed';
                break;
              }
              seen.add(pick.sales_sauda_line_id);
              const line = lineById.get(pick.sales_sauda_line_id);
              if (!line) {
                e[`line_${pick.sales_sauda_line_id}`] = 'Unknown sauda line';
                continue;
              }
              const remaining = getSaudaLineRemaining(line);
              const capacity = getLineCapacity(line.packaging_id);
              if (capacity > 0 && line.packaging_id) {
                const bags = Number(pick.bagsInput);
                if (Number.isNaN(bags) || bags <= 0) {
                  e[`line_${pick.sales_sauda_line_id}`] = 'Bags must be greater than 0';
                } else if (bags > MAX_BAGS) {
                  e[`line_${pick.sales_sauda_line_id}`] =
                    `Bags cannot exceed ${MAX_BAGS.toLocaleString('en-IN')}`;
                } else {
                  const qty = bags * capacity;
                  if (qty > remaining + 1e-9) {
                    const maxBags = remainingBagsFromQty(remaining, capacity);
                    e[`line_${pick.sales_sauda_line_id}`] =
                      `Cannot exceed remaining (${formatBagsInput(maxBags)} bags / ${formatQty(remaining, line.quantity_unit)})`;
                  }
                }
              } else {
                const qty = Number(pick.quantityInput);
                if (Number.isNaN(qty) || qty <= 0) {
                  e[`line_${pick.sales_sauda_line_id}`] =
                    'Quantity must be greater than 0 (sauda line has no packaging for bags)';
                } else if (qty > remaining + 1e-9) {
                  e[`line_${pick.sales_sauda_line_id}`] =
                    `Cannot exceed remaining (${formatQty(remaining)})`;
                }
              }
            }
          }
        }
      }
    }
    if (!formData.dispatch_date?.trim()) {
      e.dispatch_date = 'Dispatch date is required';
    } else if (!isEdit) {
      const d = formData.dispatch_date.trim();
      if (d < dispatchDateBounds.min || d > dispatchDateBounds.max) {
        e.dispatch_date = 'Dispatch date must be today or within the next 2 days';
      }
    }
    if (showUspField && formData.usp && formData.usp.length > USP_MAX_LENGTH) {
      e.usp = `USP cannot exceed ${USP_MAX_LENGTH} characters`;
    }
    if (showTransportationCost && !formData.transporter_id) {
      e.transporter_id = 'Transporter is required for FOR saudas';
    } else if (formData.transporter_id) {
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
    const lrTrim = formData.lr_number?.trim() ?? '';
    if (lrTrim !== '') {
      const digitCount = (lrTrim.match(/\d/g) ?? []).length;
      if (digitCount > LR_NUMBER_MAX_DIGITS || lrTrim.length > LR_NUMBER_MAX_DIGITS) {
        e.lr_number = `LR number cannot exceed ${LR_NUMBER_MAX_DIGITS} digits`;
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
        } else if (n > TRANSPORTATION_COST_MAX) {
          e.transportation_cost = 'Transportation cost cannot exceed ₹5,00,000';
        }
      }
    }
    const distanceTrim = distanceKmInput.trim();
    if (distanceTrim !== '') {
      const n = Number(distanceTrim);
      if (Number.isNaN(n) || n < 0) {
        e.distance_km = 'Distance must be a number ≥ 0';
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
      const uspTrim = showUspField ? formData.usp?.trim() || null : null;
      const costTrim = showTransportationCost ? transportationCostInput.trim() : '';
      const transportation_cost =
        showTransportationCost && costTrim !== '' ? Number(costTrim) : null;
      const distanceTrim = distanceKmInput.trim();
      const distance_km = distanceTrim === '' ? null : Number(distanceTrim);

      if (isEdit && dispatchId) {
        const updated = await update(dispatchId, {
          dispatch_date: formData.dispatch_date || undefined,
          transporter_id: formData.transporter_id || null,
          vehicle_id: formData.vehicle_id || null,
          lr_number: formData.lr_number?.trim() || null,
          transportation_cost: showTransportationCost ? transportation_cost : null,
          distance_km,
          route_description: formData.route_description?.trim() || null,
          usp: uspTrim,
        });
        if (pendingBiltiFile) {
          try {
            await invoiceDispatchesAPI.uploadBilti(dispatchId, pendingBiltiFile);
          } catch (uploadErr: unknown) {
            const uploadMsg =
              uploadErr instanceof Error ? uploadErr.message : 'Bilti upload failed';
            toast.error(
              'Dispatch updated, bilti upload failed',
              `${uploadMsg}. You can upload bilti from the dispatch details.`,
            );
            onOpenChange(false);
            onSuccess?.();
            return;
          }
        }
        toast.success(
          'Invoice dispatch updated',
          updated.internal_invoice_number
            ? `Invoice No. ${updated.internal_invoice_number}`
            : undefined,
        );
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      const lines = buildCreateLines() ?? [];

      const toGodownId =
        isTransferSauda
          ? formData.to_godown_id || selectedSaudaDetail?.to_godown_id || null
          : undefined;

      const created = await create({
        godown_id: formData.godown_id,
        sales_sauda_id: formData.sales_sauda_id,
        ...(toGodownId ? { to_godown_id: toGodownId } : {}),
        dispatch_date: formData.dispatch_date || undefined,
        transporter_id: formData.transporter_id || undefined,
        vehicle_id: formData.vehicle_id || undefined,
        lr_number: formData.lr_number?.trim() || undefined,
        usp: uspTrim,
        transportation_cost:
          showTransportationCost && transportation_cost != null
            ? transportation_cost
            : undefined,
        route_description: formData.route_description?.trim() || undefined,
        distance_km: distance_km ?? undefined,
        lines,
      });
      const invoiceNo = created?.internal_invoice_number?.trim();
      if (pendingBiltiFile && created?.id) {
        try {
          await invoiceDispatchesAPI.uploadBilti(created.id, pendingBiltiFile);
        } catch (uploadErr: unknown) {
          const uploadMsg = extractApiErrorMessage(uploadErr, 'Bilti upload failed');
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
          ? `Invoice No. ${invoiceNo}. Draft reserves quantity — confirm to deduct inventory.`
          : 'Draft reserves quantity — confirm to deduct inventory.',
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      setErrors({ submit: extractApiErrorMessage(err, 'Request failed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex h-[96vh] max-h-[96vh] w-[98vw] max-w-[1680px] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-xl border border-border/80 bg-background shadow-xl">
          <div className="shrink-0 border-b border-border/70 px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Dialog.Title className="text-lg font-semibold tracking-tight">
                  {isEdit ? 'Edit Invoice Dispatch' : 'New Invoice Dispatch'}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {isEdit
                    ? 'Logistics only — godown, sales order, invoice number, status, and lines stay locked. Change qty by deleting and recreating. Live Bill of Supply updates as you edit logistics.'
                    : 'Ship full remaining or a partial qty per sauda line. Live Bill of Supply preview updates as you select values.'}
                </Dialog.Description>
                {isEdit && editingDispatch?.internal_invoice_number ? (
                  <p className="mt-1.5 text-sm font-medium tabular-nums">
                    {editingDispatch.internal_invoice_number}
                    {editingDispatch.financial_year ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        FY {editingDispatch.financial_year}
                      </span>
                    ) : null}
                  </p>
                ) : null}
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
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            {loadingDispatch ? (
              <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading dispatch…
              </div>
            ) : (
            <>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:overflow-hidden">
              <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.25fr)] lg:gap-6 lg:overflow-hidden">
              <div className="min-w-0 space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
              {/* Order */}
              <section className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Order & warehouse
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium">
                      {isTransferSauda ? 'From godown' : 'Dispatch from'}
                      {isEdit ? '' : ' *'}
                    </label>
                    {!isEdit && (
                      <p className="mb-2 text-xs text-muted-foreground">
                        {isTransferSauda
                          ? 'Source godown — stock decreases here on confirm (must match transfer sauda).'
                          : 'Godown where stock is fulfilled — not from the sales order.'}
                      </p>
                    )}
                    {isEdit || (isTransferSauda && selectedSauda?.from_godown_id) ? (
                      <p className="rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-sm font-medium">
                        {(() => {
                          const from = godowns.find((g) => g.id === formData.godown_id);
                          return from
                            ? formatGodownLabel(from)
                            : formData.godown_id || '–';
                        })()}
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                          {isTransferSauda ? 'From sauda' : 'Locked'}
                        </span>
                      </p>
                    ) : (
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
                              {formatGodownLabel(g)}
                            </option>
                          ))}
                      </select>
                    )}
                    {errors.godown_id && (
                      <p className="mt-1 text-xs text-red-600">{errors.godown_id}</p>
                    )}
                  </div>
                  {isTransferSauda && (
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium">To godown</label>
                      <p className="rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-sm font-medium">
                        {(() => {
                          const toId =
                            formData.to_godown_id || selectedSauda?.to_godown_id || '';
                          const to = godowns.find((g) => g.id === toId);
                          return to ? formatGodownLabel(to) : toId || '–';
                        })()}
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                          Stock increases here on confirm
                        </span>
                      </p>
                      {errors.to_godown_id && (
                        <p className="mt-1 text-xs text-red-600">{errors.to_godown_id}</p>
                      )}
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium">
                      Sales order (finalized sauda)
                    </label>
                    {isEdit ? (
                      <p className="rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-sm font-medium">
                        {selectedSauda?.order_number ??
                          (formData.sales_sauda_id
                            ? formData.sales_sauda_id.slice(0, 8)
                            : '–')}
                        {selectedSauda?.sauda_date ? ` – ${selectedSauda.sauda_date}` : ''}
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                          Locked
                        </span>
                      </p>
                    ) : (
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
                            {isGodownTransfer(s) ? 'Transfer · ' : ''}
                            {s.order_number ?? s.id.slice(0, 8)}
                            {s.financial_year ? ` (${s.financial_year})` : ''} – {s.sauda_date}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.sales_sauda_id && (
                      <p className="mt-1 text-xs text-red-600">{errors.sales_sauda_id}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Dispatch date</label>
                    <DateInputWithSteppers
                      className="w-full"
                      inputClassName="py-2 text-sm"
                      value={formData.dispatch_date ?? ''}
                      min={isEdit ? undefined : dispatchDateBounds.min}
                      max={isEdit ? undefined : dispatchDateBounds.max}
                      onChange={(v) => setFormData((p) => ({ ...p, dispatch_date: v }))}
                    />
                    {!isEdit && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Today through +2 days only
                      </p>
                    )}
                    {errors.dispatch_date && (
                      <p className="mt-1 text-xs text-red-600">{errors.dispatch_date}</p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <p className="w-full rounded-lg border border-dashed border-border/70 bg-background/70 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                      {isEdit
                        ? 'Invoice No. stays locked. Changing the date does not renumber the invoice.'
                        : 'Invoice No. is generated on save from godown GST state + dispatch date (FY).'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Logistics */}
              <section className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Logistics
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium">
                      Transporter
                      {showTransportationCost && <span className="text-red-500"> *</span>}
                    </label>
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
                              if (showTransportationCost) {
                                next.transporter_id = 'Transporter is required for FOR saudas';
                              } else {
                                delete next.transporter_id;
                              }
                              return next;
                            }
                            const t = transporters.find((x) => x.id === id);
                            if (t && !isTransporterEligibleForInvoiceDispatch(t)) {
                              next.transporter_id =
                                getTransporterInvoiceDispatchBlockers(t).join('. ');
                            } else {
                              delete next.transporter_id;
                            }
                            return next;
                          });
                        }}
                      >
                        <option value="">
                          {showTransportationCost ? 'Select transporter' : 'None'}
                        </option>
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
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${loadingTransporters ? 'animate-spin' : ''}`}
                        />
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
                  <div className="sm:col-span-2">
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
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${loadingVehicles ? 'animate-spin' : ''}`}
                        />
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
                  <div>
                    <label className="mb-1 block text-sm font-medium">LR number</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={LR_NUMBER_MAX_DIGITS}
                      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${
                        errors.lr_number ? 'border-red-500' : ''
                      }`}
                      value={formData.lr_number ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, LR_NUMBER_MAX_DIGITS);
                        setFormData((p) => ({
                          ...p,
                          lr_number: raw === '' ? null : raw,
                        }));
                        if (errors.lr_number) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.lr_number;
                            return next;
                          });
                        }
                      }}
                      placeholder="Up to 10 digits"
                    />
                    {errors.lr_number && (
                      <p className="mt-1 text-xs text-red-600">{errors.lr_number}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Distance (km){' '}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <p className="mb-1.5 text-[11px] text-muted-foreground">
                      Used for e-way generate when Masters India cannot calculate distance.
                    </p>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      inputMode="decimal"
                      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${
                        errors.distance_km ? 'border-red-500' : ''
                      }`}
                      value={distanceKmInput}
                      onChange={(e) => {
                        setDistanceKmInput(e.target.value);
                        if (errors.distance_km) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.distance_km;
                            return next;
                          });
                        }
                      }}
                      placeholder="e.g. 120"
                    />
                    {errors.distance_km && (
                      <p className="mt-1 text-xs text-red-600">{errors.distance_km}</p>
                    )}
                  </div>
                  {showTransportationCost && (
                    <div>
                      <label className="mb-1 block text-sm font-medium">Transportation cost</label>
                      <input
                        type="number"
                        min={0}
                        max={TRANSPORTATION_COST_MAX}
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
                        placeholder="Max ₹5,00,000"
                      />
                      {errors.transportation_cost && (
                        <p className="mt-1 text-xs text-red-600">{errors.transportation_cost}</p>
                      )}
                    </div>
                  )}
                  {showUspField && (
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        USP <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Sales party has no GST or PAN. Max {USP_MAX_LENGTH} characters.
                      </p>
                      <textarea
                        className={`min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-sm ${
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
                      <p className="mt-1 text-right text-xs text-muted-foreground">
                        {(formData.usp ?? '').length}/{USP_MAX_LENGTH}
                      </p>
                      {errors.usp && <p className="mt-1 text-xs text-red-600">{errors.usp}</p>}
                    </div>
                  )}
                </div>
              </section>

              {/* Bilti */}
              <section className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bilti <span className="font-normal normal-case tracking-normal">(optional)</span>
                </h4>
                <p className="mb-3 text-[11px] text-muted-foreground">
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
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    Selected: {pendingBiltiFile.name}
                  </p>
                )}
                {errors.bilti && <p className="mt-1 text-xs text-red-600">{errors.bilti}</p>}
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
                ) : (
                  <p className="mt-2 rounded-lg border border-dashed border-border/60 px-3 py-3 text-center text-xs text-muted-foreground">
                    No bilti selected
                  </p>
                )}
              </section>

              {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}
              </div>

              {/* Live Bill of Supply preview — wider pane, scale-to-fit */}
              <div className="flex min-h-[420px] min-w-0 flex-col lg:h-full lg:min-h-0">
                <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Bill of Supply Preview
                  </h3>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    Updates live
                  </span>
                </div>
                <div
                  ref={previewPaneRef}
                  className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-neutral-200/80 p-3 shadow-inner dark:bg-neutral-900/60"
                >
                  <div
                    className="mx-auto w-fit overflow-hidden rounded-md border border-neutral-300 bg-[#FAF9F7] shadow-lg dark:border-neutral-700"
                    style={{ zoom: previewScale }}
                  >
                    <style>{BILL_OF_SUPPLY_STYLES}</style>
                    <BillOfSupplyDocument
                      data={livePreviewVm}
                      assetBaseUrl={assetBaseUrl}
                    />
                  </div>
                </div>
              </div>
              </div>
            </div>

            <div className="shrink-0 flex justify-end gap-2 border-t border-border/70 bg-background px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  loadingDispatch ||
                  loadingSaudaDetail ||
                  transporterSelectionBlocked ||
                  vehicleSelectionBlocked ||
                  (!isEdit && Boolean(formData.sales_sauda_id) && saudaFullyDispatched)
                }
                title={
                  !isEdit && saudaFullyDispatched
                    ? 'Nothing remaining on this sauda'
                    : transporterSelectionBlocked
                      ? showTransportationCost
                        ? 'This transporter is incomplete — update them in Directory or choose another'
                        : 'This transporter is incomplete — update them in Directory or choose None'
                      : vehicleSelectionBlocked
                        ? VEHICLE_VERIFIED_ONLY_MESSAGE
                        : undefined
                }
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? 'Save changes' : 'Create'}
              </button>
            </div>
            </>
            )}
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
