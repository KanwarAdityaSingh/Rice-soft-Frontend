import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useSalesSaudasData } from './SalesSaudasDataContext';
import { useSalesmen } from '../../../hooks/useSalesmen';
import { useGodowns } from '../../../hooks/useGodowns';
import { salesSaudasAPI } from '../../../services/salesSaudas.api';
import { salesPartiesAPI } from '../../../services/salesParties.api';
import { salesPartySitesAPI } from '../../../services/salesPartySites.api';
import { productsAPI } from '../../../services/products.api';
import { packagingAPI } from '../../../services/packaging.api';
import type { Packaging, SalesParty, SalesPartySite, VendorAddress } from '../../../types/entities';
import { formatPacketTypeLabel } from '../../../constants/bagAndPacketTypes';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { DateInputWithSteppers } from '../../shared/DateInputWithSteppers';
import { SalesmanFormModal } from '../../admin/salesmen/SalesmanFormModal';
import { toast } from '../../../utils/toast';
import { formatVendorAddress } from '../../../utils/saudaDisplay';
import type {
  CreateSalesSaudaRequest,
  SalesMovementType,
  SalesSaudaAddress,
  SalesSaudaLineInput,
  SalesSaudaType,
} from '../../../types/sales';
import {
  isSalesSaudaType,
  SALES_SAUDA_TYPE_OPTIONS,
} from '../../../constants/sales-sauda-types';
import {
  isGodownTransfer,
  SALES_MOVEMENT_TYPE_OPTIONS,
} from '../../../constants/sales-movement-types';

function cloneAddress(address: VendorAddress | null | undefined): SalesSaudaAddress | null {
  if (!address) return null;
  return {
    street: address.street?.trim() ?? '',
    city: address.city?.trim() ?? '',
    state: address.state?.trim() ?? '',
    pincode: address.pincode?.trim() ?? '',
    country: address.country?.trim() ?? '',
  };
}

function addressesEqual(
  a: SalesSaudaAddress | null | undefined,
  b: SalesSaudaAddress | null | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    (a.street?.trim() ?? '') === (b.street?.trim() ?? '') &&
    (a.city?.trim() ?? '') === (b.city?.trim() ?? '') &&
    (a.state?.trim() ?? '') === (b.state?.trim() ?? '') &&
    (a.pincode?.trim() ?? '') === (b.pincode?.trim() ?? '') &&
    (a.country?.trim() ?? '') === (b.country?.trim() ?? '')
  );
}

function formatSiteLabel(site: SalesPartySite): string {
  const name = site.name?.trim();
  const line = formatVendorAddress(site.address);
  return name ? `${name}${line ? ` · ${line}` : ''}` : line || site.id.slice(0, 8);
}

function formatGodownOptionLabel(godown: { name: string; gst_number?: string | null }): string {
  const gst = godown.gst_number?.trim();
  return gst ? `${godown.name} · GST ${gst}` : godown.name;
}

interface SalesSaudaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saudaId?: string | null;
  onSuccess?: () => void;
}

type LineQuantityUnit = 'kg' | 'quintal' | 'ton';

const UNIT_FACTOR: Record<LineQuantityUnit, number> = {
  kg: 1,
  quintal: 100,
  ton: 1000,
};

/** Max bags (packet_count) allowed on a sales sauda line. */
const MAX_BAGS = 12_000;

const defaultLine = (): SalesSaudaLineInput => ({
  product_id: '',
  packaging_id: undefined,
  packet_count: undefined,
  quantity: undefined,
  quantity_unit: 'kg',
  rate: 0,
  discount_value: undefined,
  discount_type: 'per_kg',
  gst_percent: 0,
  sort_order: 0,
});

export function SalesSaudaFormModal({
  open,
  onOpenChange,
  saudaId,
  onSuccess,
}: SalesSaudaFormModalProps) {
  const { salesParties, products } = useSalesSaudasData();
  const { salesmen, refetch: refetchSalesmen, loading: loadingSalesmen } = useSalesmen();
  const { godowns } = useGodowns(false);
  const isEdit = !!saudaId;
  /** Party loaded by id when the selected sauda's party is missing from the list */
  const [extraSalesParty, setExtraSalesParty] = useState<SalesParty | null>(null);

  const [brands, setBrands] = useState<Array<{ value: string; label: string }>>([]);
  const [saudaTypeOptions, setSaudaTypeOptions] = useState(SALES_SAUDA_TYPE_OPTIONS);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  /** Packaging options per product_id; loaded on demand when user selects a product */
  const [packagingByProduct, setPackagingByProduct] = useState<Record<string, Packaging[]>>({});
  const requestedProductIds = useRef<Set<string>>(new Set());
  const [formData, setFormData] = useState<CreateSalesSaudaRequest>({
    movement_type: 'sale',
    sales_party_id: '',
    status: 'draft',
    sauda_date: new Date().toISOString().split('T')[0],
    sauda_type: '' as SalesSaudaType,
    from_godown_id: null,
    to_godown_id: null,
    salesman_id: null,
    billing_address: null,
    delivery_address: null,
    payment_terms: null,
    lines: [defaultLine()],
  });
  const isTransfer = isGodownTransfer(formData.movement_type);

  // Godown → godown transfers always use FOR
  useEffect(() => {
    if (!isTransfer) return;
    if (formData.sauda_type === 'for') return;
    setFormData((p) => (p.sauda_type === 'for' ? p : { ...p, sauda_type: 'for' }));
  }, [isTransfer, formData.sauda_type]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingSauda, setLoadingSauda] = useState(false);
  const [salesmanFormOpen, setSalesmanFormOpen] = useState(false);
  const [deliverySites, setDeliverySites] = useState<SalesPartySite[]>([]);
  const [loadingDeliverySites, setLoadingDeliverySites] = useState(false);
  const [deliverySameAsBilling, setDeliverySameAsBilling] = useState(true);
  const [selectedDeliverySiteId, setSelectedDeliverySiteId] = useState('');
  /**
   * When set, the next sales_party_id sync hydrates from these saved addresses
   * instead of resetting to the party primary address.
   */
  const pendingHydratedAddressesRef = useRef<{
    billing: SalesSaudaAddress | null;
    delivery: SalesSaudaAddress | null;
  } | null>(null);
  /** Line index → true when rate was autofilled from suggested-rate API (rate input disabled). */
  const [rateAutofilledForLine, setRateAutofilledForLine] = useState<Record<number, boolean>>({});
  /** Draft text for discount inputs so users can clear "0" and type decimals. */
  const [discountDrafts, setDiscountDrafts] = useState<Record<number, string>>({});

  const salesPartyOptions = useMemo(() => {
    const byId = new Map<string, SalesParty>();
    for (const p of salesParties) byId.set(p.id, p);
    if (extraSalesParty) byId.set(extraSalesParty.id, extraSalesParty);
    return Array.from(byId.values()).sort((a, b) =>
      (a.business_name || '').localeCompare(b.business_name || '', undefined, {
        sensitivity: 'base',
      })
    );
  }, [salesParties, extraSalesParty]);

  const selectedSalesParty = formData.sales_party_id
    ? salesPartyOptions.find((s) => s.id === formData.sales_party_id)
    : null;

  const hasAdditionalDeliveryAddresses = deliverySites.length > 0;

  /** Active salesmen, plus the currently assigned one if inactive */
  const salesmanOptions = useMemo(() => {
    const active = salesmen.filter((s) => s.is_active);
    const currentId = formData.salesman_id;
    if (!currentId || active.some((s) => s.id === currentId)) return active;
    const current = salesmen.find((s) => s.id === currentId);
    return current ? [...active, current] : active;
  }, [salesmen, formData.salesman_id]);

  const loadDeliverySites = useCallback(async (salesPartyId: string) => {
    setLoadingDeliverySites(true);
    try {
      const sites = await salesPartySitesAPI.list(salesPartyId);
      const active = (Array.isArray(sites) ? sites : []).filter((s) => s.is_active !== false);
      setDeliverySites(active);
      return active;
    } catch {
      setDeliverySites([]);
      return [] as SalesPartySite[];
    } finally {
      setLoadingDeliverySites(false);
    }
  }, []);

  useEffect(() => {
    if (open && saudaId) {
      loadSauda();
    } else if (open && !saudaId) {
      pendingHydratedAddressesRef.current = null;
      setExtraSalesParty(null);
      setFormData({
        movement_type: 'sale',
        sales_party_id: '',
        status: 'draft',
        sauda_date: new Date().toISOString().split('T')[0],
        sauda_type: '' as SalesSaudaType,
        from_godown_id: null,
        to_godown_id: null,
        salesman_id: null,
        billing_address: null,
        delivery_address: null,
        payment_terms: null,
        lines: [defaultLine()],
      });
      setDeliverySites([]);
      setDeliverySameAsBilling(true);
      setSelectedDeliverySiteId('');
      setErrors({});
      setRateAutofilledForLine({});
      setDiscountDrafts({});
    }
  }, [open, saudaId]);

  useEffect(() => {
    if (!open) {
      setPackagingByProduct({});
      requestedProductIds.current = new Set();
      setDeliverySites([]);
      setSelectedDeliverySiteId('');
      setExtraSalesParty(null);
      setDiscountDrafts({});
    }
  }, [open]);

  // If the selected party isn't in the shared list, fetch it so the dropdown shows a name
  useEffect(() => {
    if (!open || !formData.sales_party_id) return;
    if (salesParties.some((p) => p.id === formData.sales_party_id)) {
      setExtraSalesParty(null);
      return;
    }
    if (extraSalesParty?.id === formData.sales_party_id) return;
    let cancelled = false;
    void salesPartiesAPI
      .getById(formData.sales_party_id)
      .then((party) => {
        if (!cancelled) setExtraSalesParty(party);
      })
      .catch(() => {
        if (!cancelled) setExtraSalesParty(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, formData.sales_party_id, salesParties, extraSalesParty?.id]);

  // When sales party changes: set billing from party address; load additional delivery sites
  useEffect(() => {
    if (!open || isTransfer || !formData.sales_party_id) {
      if (!formData.sales_party_id || isTransfer) {
        setDeliverySites([]);
        setSelectedDeliverySiteId('');
      }
      return;
    }

    let cancelled = false;
    const partyId = formData.sales_party_id;
    const hydrated = pendingHydratedAddressesRef.current;
    pendingHydratedAddressesRef.current = null;

    const syncAddressesForParty = async () => {
      const sites = await loadDeliverySites(partyId);
      if (cancelled) return;

      const partyBilling = cloneAddress(
        salesPartyOptions.find((p) => p.id === partyId)?.address
      );

      if (hydrated) {
        const billing = hydrated.billing ?? partyBilling;
        const delivery = hydrated.delivery;
        const same = !delivery || addressesEqual(billing, delivery);
        setFormData((prev) => ({
          ...prev,
          billing_address: billing,
          delivery_address: same ? billing : delivery,
        }));
        setDeliverySameAsBilling(same);
        if (!same && delivery) {
          const match = sites.find((s) => addressesEqual(cloneAddress(s.address), delivery));
          setSelectedDeliverySiteId(match?.id ?? '');
        } else {
          setSelectedDeliverySiteId('');
        }
        return;
      }

      setFormData((prev) => ({
        ...prev,
        billing_address: partyBilling,
        delivery_address: partyBilling,
      }));
      setDeliverySameAsBilling(true);
      setSelectedDeliverySiteId('');
    };

    void syncAddressesForParty();
    return () => {
      cancelled = true;
    };
  }, [open, isTransfer, formData.sales_party_id, loadDeliverySites, salesPartyOptions]);

  useEffect(() => {
    if (open) {
      productsAPI
        .getBrands()
        .then(setBrands)
        .catch(() => setBrands([]));
      salesSaudasAPI
        .getTypes()
        .then((opts) => {
          if (Array.isArray(opts) && opts.length > 0) {
            setSaudaTypeOptions(
              opts.map((o) => ({
                value: o.value as SalesSaudaType,
                label: o.label,
              }))
            );
          } else {
            setSaudaTypeOptions(SALES_SAUDA_TYPE_OPTIONS);
          }
        })
        .catch(() => setSaudaTypeOptions(SALES_SAUDA_TYPE_OPTIONS));
    }
  }, [open]);

  // Lazy-load packaging per product so we don't request all packaging on modal open
  useEffect(() => {
    if (!open) return;
    const productIds = [
      ...new Set(
        (formData.lines ?? []).map((l) => l.product_id).filter((id): id is string => !!id)
      ),
    ];
    for (const pid of productIds) {
      if (packagingByProduct[pid] !== undefined || requestedProductIds.current.has(pid)) continue;
      requestedProductIds.current.add(pid);
      packagingAPI
        .getAllPackaging({ product_id: pid })
        .then((data) => {
          setPackagingByProduct((prev) => ({ ...prev, [pid]: data }));
        })
        .catch(() => {
          setPackagingByProduct((prev) => ({ ...prev, [pid]: [] }));
        });
    }
  }, [open, formData.lines]);

  const loadSauda = async () => {
    if (!saudaId) return;
    setLoadingSauda(true);
    try {
      const s = await salesSaudasAPI.getById(saudaId);
      const billing = cloneAddress(s.billing_address);
      const delivery = cloneAddress(s.delivery_address);
      pendingHydratedAddressesRef.current = { billing, delivery };
      setFormData({
        movement_type: isGodownTransfer(s.movement_type) ? 'godown_transfer' : 'sale',
        sales_party_id: s.sales_party_id ?? '',
        status: 'draft',
        sauda_date: s.sauda_date,
        sauda_type: isGodownTransfer(s.movement_type)
          ? 'for'
          : isSalesSaudaType(s.sauda_type)
            ? s.sauda_type
            : ('' as SalesSaudaType),
        from_godown_id: s.from_godown_id ?? null,
        to_godown_id: s.to_godown_id ?? null,
        salesman_id: s.salesman_id ?? null,
        billing_address: billing,
        delivery_address: delivery,
        payment_terms: s.payment_terms ?? null,
        notes: s.notes ?? null,
        lines:
          s.lines?.map((l) => ({
            product_id: l.product_id,
            packaging_id: l.packaging_id,
            packet_count: l.packet_count ?? undefined,
            quantity: l.quantity,
            quantity_unit: l.quantity_unit,
            rate: l.rate,
            discount_value: l.discount_value ?? 0,
            discount_type: l.discount_type ?? 'per_kg',
            gst_percent: l.gst_percent ?? 0,
            sort_order: l.sort_order,
          })) ?? [defaultLine()],
      });
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : 'Failed to load sauda' });
    } finally {
      setLoadingSauda(false);
    }
  };

  const handleDeliverySameAsBillingChange = (checked: boolean) => {
    setDeliverySameAsBilling(checked);
    if (checked) {
      setSelectedDeliverySiteId('');
      setFormData((prev) => ({
        ...prev,
        delivery_address: cloneAddress(prev.billing_address),
      }));
      return;
    }
    const firstSite = deliverySites[0];
    if (firstSite) {
      setSelectedDeliverySiteId(firstSite.id);
      setFormData((prev) => ({
        ...prev,
        delivery_address: cloneAddress(firstSite.address),
      }));
    }
  };

  const handleDeliverySiteChange = (siteId: string) => {
    setSelectedDeliverySiteId(siteId);
    const site = deliverySites.find((s) => s.id === siteId);
    if (!site) return;
    setDeliverySameAsBilling(false);
    setFormData((prev) => ({
      ...prev,
      delivery_address: cloneAddress(site.address),
    }));
  };

  const addLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [...(prev.lines ?? []), defaultLine()],
    }));
  };

  const removeLine = (index: number) => {
    setFormData((prev) => {
      const lines = [...(prev.lines ?? [])];
      lines.splice(index, 1);
      if (lines.length === 0) lines.push(defaultLine());
      return { ...prev, lines };
    });
  };

  const updateLine = <K extends keyof SalesSaudaLineInput>(
    index: number,
    field: K,
    value: SalesSaudaLineInput[K]
  ) => {
    setFormData((prev) => {
      const lines = [...(prev.lines ?? [])];
      if (!lines[index]) return prev;
      const next = { ...lines[index], [field]: value };
      // When product changes, clear bag so it stays product-specific
      if (field === 'product_id') {
        next.packaging_id = undefined;
        next.packet_count = undefined;
      }
      // Packet-based quantity is always interpreted as kg on backend.
      if (field === 'packet_count' && Number(value) > 0) {
        next.quantity_unit = 'kg';
        const selectedPackaging = next.product_id
          ? (packagingByProduct[next.product_id] ?? []).find((p) => p.id === next.packaging_id)
          : undefined;
        const capacity = Number(selectedPackaging?.holding_capacity) || 0;
        next.quantity = capacity > 0 ? Number(value) * capacity : undefined;
      }
      if (field === 'packet_count' && (!value || Number(value) <= 0)) {
        next.packet_count = undefined;
      }
      if (field === 'packaging_id' && (Number(next.packet_count) || 0) > 0) {
        next.quantity_unit = 'kg';
        const selectedPackaging = next.product_id
          ? (packagingByProduct[next.product_id] ?? []).find((p) => p.id === value)
          : undefined;
        const capacity = Number(selectedPackaging?.holding_capacity) || 0;
        next.quantity = capacity > 0 ? (Number(next.packet_count) || 0) * capacity : undefined;
      }
      // GST is not applicable for packaging capacity above 25kg.
      const selectedPackaging = next.product_id
        ? (packagingByProduct[next.product_id] ?? []).find((p) => p.id === next.packaging_id)
        : undefined;
      const capacity = Number(selectedPackaging?.holding_capacity) || 0;
      if (selectedPackaging && capacity > 25) {
        next.gst_percent = 0;
      }
      lines[index] = next;
      return { ...prev, lines };
    });
  };

  const changeLineUnit = (index: number, newUnit: LineQuantityUnit) => {
    setFormData((prev) => {
      const lines = [...(prev.lines ?? [])];
      const line = lines[index];
      if (!line) return prev;
      if ((Number(line.packet_count) || 0) > 0) return prev;
      const currentUnit = (line.quantity_unit || 'kg') as LineQuantityUnit;
      if (currentUnit === newUnit) return prev;
      const currentFactor = UNIT_FACTOR[currentUnit] ?? 1;
      const nextFactor = UNIT_FACTOR[newUnit] ?? 1;
      const qty = Number(line.quantity) || 0;
      const rate = Number(line.rate) || 0;
      const newQuantity = (qty * currentFactor) / nextFactor;
      const newRate = (rate * nextFactor) / currentFactor;
      lines[index] = {
        ...line,
        quantity_unit: newUnit,
        quantity: parseFloat(newQuantity.toFixed(4)),
        rate: parseFloat(newRate.toFixed(4)),
      };
      return { ...prev, lines };
    });
  };

  const getSelectedPackaging = (line: SalesSaudaLineInput): Packaging | undefined => {
    if (!line.product_id || !line.packaging_id) return undefined;
    return (packagingByProduct[line.product_id] ?? []).find((p) => p.id === line.packaging_id);
  };

  const getLineEffectiveQuantity = (line: SalesSaudaLineInput): number => {
    const packetCount = Number(line.packet_count) || 0;
    if (packetCount > 0) {
      const selectedPackaging = getSelectedPackaging(line);
      const capacity = Number(selectedPackaging?.holding_capacity) || 0;
      if (capacity > 0) return packetCount * capacity;
      return Number(line.quantity) || 0;
    }
    return Number(line.quantity) || 0;
  };

  const getLineIsTaxable = (line: SalesSaudaLineInput): boolean => {
    const selectedPackaging = getSelectedPackaging(line);
    if (!selectedPackaging) return true;
    const capacity = Number(selectedPackaging.holding_capacity) || 0;
    return capacity <= 25;
  };

  const getLineFinancialPreview = (line: SalesSaudaLineInput) => {
    const quantity = getLineEffectiveQuantity(line);
    const rate = Number(line.rate) || 0;
    const amount = quantity * rate;

    const discountType = line.discount_type === 'percentage' ? 'percentage' : 'per_kg';
    const discountValue = Number(line.discount_value) || 0;
    const discountAmount =
      discountType === 'per_kg' ? discountValue * quantity : (amount * discountValue) / 100;

    const taxableAfterDiscount = Math.max(amount - discountAmount, 0);
    const gstPercent = Number(line.gst_percent) || 0;
    const gstAmount = getLineIsTaxable(line) ? (taxableAfterDiscount * gstPercent) / 100 : 0;
    const finalAmount = taxableAfterDiscount + gstAmount;

    return { amount, discountAmount, gstAmount, finalAmount };
  };

  // Products filtered by selected brand (client-side). When no brand selected, show all.
  const productsByBrand =
    selectedBrand === ''
      ? products
      : products.filter((p) => p.brand === selectedBrand);

  const handleBrandChange = (brandValue: string) => {
    setSelectedBrand(brandValue);
    if (brandValue) {
      setFormData((prev) => ({
        ...prev,
        lines: (prev.lines ?? []).map((l) => {
          const product = products.find((p) => p.id === l.product_id);
          const matches = product?.brand === brandValue;
          return matches ? l : { ...l, product_id: '' };
        }),
      }));
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (isTransfer) {
      if (!formData.from_godown_id) e.from_godown_id = 'Select from godown';
      if (!formData.to_godown_id) e.to_godown_id = 'Select to godown';
      if (
        formData.from_godown_id &&
        formData.to_godown_id &&
        formData.from_godown_id === formData.to_godown_id
      ) {
        e.to_godown_id = 'To godown must be different from from godown';
      }
    } else if (!formData.sales_party_id) {
      e.sales_party_id = 'Select a sales party';
    }
    if (!formData.sauda_date) e.sauda_date = 'Date is required';
    if (isTransfer) {
      if (formData.sauda_type !== 'for') e.sauda_type = 'Godown transfer saudas must be FOR';
    } else if (!isSalesSaudaType(formData.sauda_type)) {
      e.sauda_type = 'Select sauda type (EX or FOR)';
    }
    if (
      !isTransfer &&
      hasAdditionalDeliveryAddresses &&
      !deliverySameAsBilling &&
      !selectedDeliverySiteId
    ) {
      e.delivery_address = 'Select a delivery address or use same as billing';
    }
    if (
      !isTransfer &&
      formData.payment_terms !== null &&
      formData.payment_terms !== undefined
    ) {
      if (!Number.isInteger(formData.payment_terms) || formData.payment_terms < 0) {
        e.payment_terms = 'Payment terms must be a whole number of days (>= 0)';
      } else if (formData.payment_terms > 90) {
        e.payment_terms = 'Payment terms cannot exceed 90 days';
      }
    }
    const lines = formData.lines ?? [];
    if (
      lines.length === 0 ||
      lines.every(
        (l) => !l.product_id || ((Number(l.quantity) || 0) <= 0 && (Number(l.packet_count) || 0) <= 0)
      )
    ) {
      e.lines = 'Add at least one line with product and quantity or packet count';
    }
    lines.forEach((l, i) => {
      if (!l.product_id) e[`line_${i}_product`] = 'Product required';
      const qty = Number(l.quantity) || 0;
      const packetCount = Number(l.packet_count) || 0;
      if (qty <= 0 && packetCount <= 0) {
        e[`line_${i}_qty`] = 'Enter quantity or packet count';
      }
      if (packetCount > 0 && !Number.isInteger(packetCount)) {
        e[`line_${i}_qty`] = 'Packet count must be a whole number';
      }
      if (packetCount > MAX_BAGS) {
        e[`line_${i}_qty`] = `Bags cannot exceed ${MAX_BAGS.toLocaleString('en-IN')}`;
      }
      if (packetCount > 0 && !l.packaging_id) {
        e[`line_${i}_packaging`] = 'Packaging is required when packet count is used';
      }
      const discountValue = Number(l.discount_value) || 0;
      const rate = Number(l.rate) || 0;
      const baseAmount = qty * rate;
      const gstPercent = Number(l.gst_percent) || 0;
      if (discountValue < 0) e[`line_${i}_discount`] = 'Discount must be ≥ 0';
      if (l.discount_type === 'percentage') {
        if (discountValue > 100) {
          e[`line_${i}_discount`] = 'Percentage discount cannot exceed 100';
        }
      } else if (discountValue > rate + 1e-9) {
        e[`line_${i}_discount`] = 'Discount cannot exceed the rate (base)';
      }
      const discountAmount =
        l.discount_type === 'percentage'
          ? (baseAmount * discountValue) / 100
          : discountValue * qty;
      if (discountAmount > baseAmount + 1e-9) {
        e[`line_${i}_discount`] = 'Discount cannot exceed the base amount';
      }
      if (gstPercent < 0) e[`line_${i}_gst`] = 'GST percent must be >= 0';
      if (l.rate < 0) e[`line_${i}_rate`] = 'Rate cannot be negative';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isEdit && !saudaId) return;
    setLoading(true);
    setErrors({});
    try {
      const filteredLines =
        formData.lines?.filter(
          (l) => l.product_id && ((Number(l.quantity) || 0) > 0 || (Number(l.packet_count) || 0) > 0)
        ) ?? [];
      const billing = isTransfer ? null : cloneAddress(formData.billing_address);
      const delivery = isTransfer
        ? null
        : deliverySameAsBilling
          ? cloneAddress(billing)
          : cloneAddress(formData.delivery_address);
      const linesPayload = filteredLines.map((l): SalesSaudaLineInput => {
        const discountType: 'per_kg' | 'percentage' =
          l.discount_type === 'percentage' ? 'percentage' : 'per_kg';
        return {
          product_id: l.product_id,
          packaging_id: l.packaging_id || undefined,
          packet_count: (Number(l.packet_count) || 0) > 0 ? Number(l.packet_count) : undefined,
          quantity: (Number(l.quantity) || 0) > 0 ? Number(l.quantity) : undefined,
          quantity_unit: l.quantity_unit || 'kg',
          rate: Number(l.rate) || 0,
          discount_value: Number(l.discount_value) || 0,
          discount_type: discountType,
          gst_percent: Number(l.gst_percent) || 0,
          sort_order: l.sort_order,
        };
      });
      const payload: CreateSalesSaudaRequest = isTransfer
        ? {
            movement_type: 'godown_transfer',
            from_godown_id: formData.from_godown_id || null,
            to_godown_id: formData.to_godown_id || null,
            status: formData.status,
            sauda_date: formData.sauda_date,
            sauda_type: 'for',
            payment_terms: null,
            notes: formData.notes,
            lines: linesPayload,
          }
        : {
            movement_type: 'sale',
            sales_party_id: formData.sales_party_id,
            status: formData.status,
            sauda_date: formData.sauda_date,
            sauda_type: formData.sauda_type,
            salesman_id: formData.salesman_id || null,
            billing_address: billing,
            delivery_address: delivery,
            payment_terms:
              formData.payment_terms === null || formData.payment_terms === undefined
                ? null
                : Number(formData.payment_terms),
            notes: formData.notes,
            lines: linesPayload,
          };
      if (isEdit && saudaId) {
        await salesSaudasAPI.update(saudaId, payload);
      } else {
        await salesSaudasAPI.create(payload);
        toast.success(
          isTransfer ? 'Godown transfer created' : 'Sales Sauda created',
          isTransfer
            ? 'Finalize it, then create a dispatch from the source godown.'
            : 'Verify and finalize it before creating an invoice dispatch.',
        );
      }
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[92vh] w-[95vw] max-w-6xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-none border border-border/80 bg-background shadow-2xl">
          {/* Document-style header */}
          <div className="sticky top-0 z-10 border-b-2 border-primary/30 bg-muted/30 px-5 py-3">
            <div className="flex items-center justify-between">
              <div>
                <Dialog.Title className="text-lg font-semibold tracking-tight text-foreground">
                  {isEdit
                    ? isTransfer
                      ? 'Edit Godown Transfer'
                      : 'Edit Sales Sauda'
                    : isTransfer
                      ? 'Godown Transfer'
                      : 'Sales Sauda'}
                </Dialog.Title>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {isTransfer ? 'Inter-godown stock move' : 'Trade agreement'}
                </p>
              </div>
              <Dialog.Close asChild>
                <button
                  className="rounded-md p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {loadingSauda ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="flex-1 px-5 py-4 space-y-4">
                {/* Party & date section */}
                <section className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                    {isTransfer ? 'Transfer & date' : 'Party & date'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Movement type
                      </label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={formData.movement_type ?? 'sale'}
                        disabled={isEdit}
                        onChange={(e) => {
                          const next = e.target.value as SalesMovementType;
                          pendingHydratedAddressesRef.current = null;
                          setFormData((p) => ({
                            ...p,
                            movement_type: next,
                            sales_party_id: next === 'godown_transfer' ? '' : p.sales_party_id,
                            from_godown_id: next === 'godown_transfer' ? p.from_godown_id : null,
                            to_godown_id: next === 'godown_transfer' ? p.to_godown_id : null,
                            salesman_id: next === 'godown_transfer' ? null : p.salesman_id,
                            payment_terms: next === 'godown_transfer' ? null : p.payment_terms,
                            billing_address: next === 'godown_transfer' ? null : p.billing_address,
                            delivery_address: next === 'godown_transfer' ? null : p.delivery_address,
                            // Godown transfers are always FOR
                            sauda_type: next === 'godown_transfer' ? 'for' : p.sauda_type,
                          }));
                          setErrors((prev) => {
                            const n = { ...prev };
                            delete n.sales_party_id;
                            delete n.from_godown_id;
                            delete n.to_godown_id;
                            return n;
                          });
                        }}
                      >
                        {SALES_MOVEMENT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {isTransfer && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Sales party is created/linked from the destination godown. Addresses are
                          filled by the server.
                        </p>
                      )}
                    </div>
                    {isTransfer ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            From godown
                          </label>
                          <select
                            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={formData.from_godown_id ?? ''}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                from_godown_id: e.target.value || null,
                              }))
                            }
                          >
                            <option value="">Select source godown</option>
                            {godowns
                              .filter((g) => g.is_active)
                              .map((g) => (
                                <option key={g.id} value={g.id}>
                                  {formatGodownOptionLabel(g)}
                                </option>
                              ))}
                          </select>
                          {errors.from_godown_id && (
                            <p className="mt-1 text-xs text-destructive">{errors.from_godown_id}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            To godown
                          </label>
                          <select
                            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={formData.to_godown_id ?? ''}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                to_godown_id: e.target.value || null,
                              }))
                            }
                          >
                            <option value="">Select destination godown</option>
                            {godowns
                              .filter((g) => g.is_active)
                              .map((g) => (
                                <option
                                  key={g.id}
                                  value={g.id}
                                  disabled={g.id === formData.from_godown_id}
                                >
                                  {formatGodownOptionLabel(g)}
                                </option>
                              ))}
                          </select>
                          {errors.to_godown_id && (
                            <p className="mt-1 text-xs text-destructive">{errors.to_godown_id}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Sales Party
                          </label>
                          <select
                            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={formData.sales_party_id}
                            onChange={(e) => {
                              pendingHydratedAddressesRef.current = null;
                              setFormData((p) => ({ ...p, sales_party_id: e.target.value }));
                            }}
                          >
                            <option value="">Select sales party</option>
                            {salesPartyOptions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.business_name?.trim() || 'Unnamed party'}
                                {s.is_active === false ? ' (inactive)' : ''}
                              </option>
                            ))}
                          </select>
                          {errors.sales_party_id && (
                            <p className="mt-1 text-xs text-destructive">{errors.sales_party_id}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Salesman{' '}
                            <span className="text-muted-foreground font-normal">(optional)</span>
                          </label>
                          <div className="flex gap-1">
                            <select
                              className="min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              value={formData.salesman_id ?? ''}
                              onChange={(e) =>
                                setFormData((p) => ({
                                  ...p,
                                  salesman_id: e.target.value || null,
                                }))
                              }
                            >
                              <option value="">None</option>
                              {salesmanOptions.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                  {!s.is_active ? ' (inactive)' : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => void refetchSalesmen()}
                              disabled={loadingSalesmen}
                              className="flex-shrink-0 rounded-md border border-border bg-background p-2 hover:bg-muted transition-colors disabled:opacity-50"
                              title="Refresh salesmen"
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 ${loadingSalesmen ? 'animate-spin' : ''}`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSalesmanFormOpen(true)}
                              className="flex-shrink-0 rounded-md border border-border bg-background p-2 hover:bg-muted transition-colors"
                              title="Add salesman"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        {isTransfer ? 'Transfer date' : 'Sauda Date'}
                      </label>
                      <DateInputWithSteppers
                        className="w-full"
                        inputClassName="py-2 text-sm"
                        invalid={Boolean(errors.sauda_date)}
                        value={formData.sauda_date}
                        onChange={(v) => setFormData((p) => ({ ...p, sauda_date: v }))}
                      />
                      {errors.sauda_date && (
                        <p className="mt-1 text-xs text-destructive">{errors.sauda_date}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Sauda type
                      </label>
                      {isTransfer ? (
                        <>
                          <input
                            type="text"
                            readOnly
                            className="w-full rounded-md border border-input bg-muted/40 px-2.5 py-2 text-sm text-muted-foreground"
                            value="FOR"
                          />
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Godown transfers are always FOR.
                          </p>
                        </>
                      ) : (
                        <select
                          className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={formData.sauda_type || ''}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              sauda_type: e.target.value as SalesSaudaType,
                            }))
                          }
                        >
                          <option value="">Select type</option>
                          {saudaTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {errors.sauda_type && (
                        <p className="mt-1 text-xs text-destructive">{errors.sauda_type}</p>
                      )}
                    </div>
                    {!isTransfer && (
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Payment Terms (days)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={90}
                          step={1}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={formData.payment_terms ?? ''}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              payment_terms:
                                e.target.value === ''
                                  ? null
                                  : Math.min(90, Math.max(0, Math.floor(Number(e.target.value)))),
                            }))
                          }
                          placeholder="e.g. 30 (max 90)"
                        />
                        {errors.payment_terms && (
                          <p className="mt-1 text-xs text-destructive">{errors.payment_terms}</p>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {!isTransfer && selectedSalesParty && (
                  <section className="rounded-md border border-border/60 bg-muted/15 p-3 space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Sales party details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="sm:col-span-2 rounded-md border border-border/40 bg-muted/30 px-2.5 py-2">
                        <p className="text-[11px] font-medium text-muted-foreground">Billing address</p>
                        <p className="mt-0.5 text-foreground">
                          {formatVendorAddress(formData.billing_address ?? selectedSalesParty.address) || '–'}
                        </p>
                      </div>
                      <div className="rounded-md border border-border/40 bg-muted/30 px-2.5 py-2">
                        <p className="text-[11px] font-medium text-muted-foreground">GST number</p>
                        <p className="mt-0.5 text-foreground">{selectedSalesParty.business_details?.gst_number ?? '–'}</p>
                      </div>
                      <div className="rounded-md border border-border/40 bg-muted/30 px-2.5 py-2">
                        <p className="text-[11px] font-medium text-muted-foreground">PAN number</p>
                        <p className="mt-0.5 text-foreground">{selectedSalesParty.business_details?.pan_number ?? '–'}</p>
                      </div>
                    </div>

                    {(hasAdditionalDeliveryAddresses || loadingDeliverySites) && (
                      <div className="space-y-2 rounded-md border border-border/40 bg-background/60 p-2.5">
                        <p className="text-[11px] font-medium text-muted-foreground">Delivery address</p>
                        {loadingDeliverySites ? (
                          <p className="text-xs text-muted-foreground">Loading delivery addresses…</p>
                        ) : (
                          <>
                            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                className="rounded border-input"
                                checked={deliverySameAsBilling}
                                onChange={(e) => handleDeliverySameAsBillingChange(e.target.checked)}
                              />
                              Delivery address same as billing address
                            </label>
                            {!deliverySameAsBilling && (
                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                  Select additional delivery address
                                </label>
                                <select
                                  className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  value={selectedDeliverySiteId}
                                  onChange={(e) => handleDeliverySiteChange(e.target.value)}
                                >
                                  <option value="">Select delivery address</option>
                                  {deliverySites.map((site) => (
                                    <option key={site.id} value={site.id}>
                                      {formatSiteLabel(site)}
                                    </option>
                                  ))}
                                </select>
                                {formData.delivery_address && (
                                  <p className="mt-1.5 text-xs text-foreground">
                                    {formatVendorAddress(formData.delivery_address) || '–'}
                                  </p>
                                )}
                                {errors.delivery_address && (
                                  <p className="mt-1 text-xs text-destructive">{errors.delivery_address}</p>
                                )}
                              </div>
                            )}
                            {deliverySameAsBilling && (
                              <p className="text-xs text-muted-foreground">
                                {formatVendorAddress(formData.billing_address) || '–'}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {/* Line items – table-style */}
                <section className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                      Line items
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="min-w-[150px]">
                        <label className="sr-only">Brand</label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={selectedBrand}
                          onChange={(e) => handleBrandChange(e.target.value)}
                        >
                          <option value="">All brands</option>
                          {brands.map((b) => (
                            <option key={b.value} value={b.value}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={addLine}
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Plus className="h-4 w-4" /> Add line
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Select brand to filter products below.</p>
                  {errors.lines && (
                    <p className="text-xs text-destructive">{errors.lines}</p>
                  )}
                  <div className="rounded-md border border-border/60 overflow-hidden">
                    <div className="max-h-[340px] overflow-y-auto">
                      {(formData.lines ?? []).map((line, i) => {
                        const financialPreview = getLineFinancialPreview(line);
                        return (
                        <div
                          key={i}
                          className="flex flex-wrap items-end gap-2 border-b border-border/40 last:border-0 p-2.5 bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1 min-w-[130px]">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Product</label>
                            <select
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                              value={line.product_id}
                              onChange={(e) => {
                                setRateAutofilledForLine((prev) => ({ ...prev, [i]: false }));
                                updateLine(i, 'product_id', e.target.value);
                              }}
                            >
                              <option value="">Select product</option>
                              {productsByBrand.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="min-w-[112px]">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Bag (packaging)</label>
                            <select
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                              value={line.packaging_id ?? ''}
                              onChange={(e) => {
                                const newPackId = e.target.value || undefined;
                                setRateAutofilledForLine((prev) => ({ ...prev, [i]: false }));
                                updateLine(i, 'packaging_id', newPackId);
                                if (line.product_id && newPackId) {
                                  productsAPI
                                    .getSuggestedRate(line.product_id, newPackId)
                                    .then((res) => {
                                      updateLine(i, 'rate', res.rate);
                                      setRateAutofilledForLine((prev) => ({ ...prev, [i]: true }));
                                    })
                                    .catch(() => {});
                                }
                              }}
                              disabled={!line.product_id}
                            >
                              <option value="">No bag</option>
                              {(packagingByProduct[line.product_id] ?? []).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.holding_capacity} kg ({formatPacketTypeLabel(p.packet_type)})
                                </option>
                              ))}
                            </select>
                            {errors[`line_${i}_packaging`] && (
                              <p className="mt-1 text-xs text-destructive">{errors[`line_${i}_packaging`]}</p>
                            )}
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="w-[72px]">
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Bags</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={line.packet_count ?? ''}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  if (digits === '') {
                                    updateLine(i, 'packet_count', undefined);
                                    return;
                                  }
                                  const n = Math.min(
                                    MAX_BAGS,
                                    Math.max(1, Math.floor(Number(digits))),
                                  );
                                  updateLine(i, 'packet_count', n);
                                  if (errors[`line_${i}_qty`]) {
                                    setErrors((prev) => {
                                      const next = { ...prev };
                                      delete next[`line_${i}_qty`];
                                      return next;
                                    });
                                  }
                                }}
                                placeholder={`Max ${MAX_BAGS.toLocaleString('en-IN')}`}
                              />
                            </div>
                            <div className="w-[72px]">
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Qty</label>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={line.quantity ?? ''}
                                onChange={(e) =>
                                  updateLine(
                                    i,
                                    'quantity',
                                    e.target.value === '' ? undefined : parseFloat(e.target.value)
                                  )
                                }
                                disabled={(Number(line.packet_count) || 0) > 0}
                              />
                            </div>
                            <div className="w-[58px]">
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Unit</label>
                              <select
                                className="w-full rounded-md border border-input bg-background px-1.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={(line.quantity_unit || 'kg') as LineQuantityUnit}
                                onChange={(e) =>
                                  changeLineUnit(i, e.target.value as LineQuantityUnit)
                                }
                                disabled={(Number(line.packet_count) || 0) > 0}
                              >
                                <option value="kg">Kg</option>
                                <option value="quintal">Qtl</option>
                                <option value="ton">Ton</option>
                              </select>
                            </div>
                          </div>
                          <div className="w-[84px]">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Rate (₹/{(line.quantity_unit || 'kg') === 'quintal' ? 'Qtl' : (line.quantity_unit || 'kg') === 'ton' ? 'Ton' : 'kg'})
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              value={line.rate ?? ''}
                              onChange={(e) =>
                                updateLine(i, 'rate', parseFloat(e.target.value) || 0)
                              }
                              disabled={!!rateAutofilledForLine[i]}
                              title={rateAutofilledForLine[i] ? 'Rate was filled from product rates; change product or bag to edit.' : undefined}
                            />
                          </div>
                          <div className="w-[88px]">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Discount</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              className={`w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                errors[`line_${i}_discount`] ? 'border-red-500' : 'border-input'
                              }`}
                              value={
                                discountDrafts[i] !== undefined
                                  ? discountDrafts[i]
                                  : line.discount_value == null || line.discount_value === 0
                                    ? ''
                                    : String(line.discount_value)
                              }
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^\d.]/g, '');
                                const parts = raw.split('.');
                                const cleaned =
                                  parts.length <= 1
                                    ? raw
                                    : `${parts[0]}.${parts.slice(1).join('')}`;
                                setDiscountDrafts((prev) => ({ ...prev, [i]: cleaned }));
                                if (cleaned === '' || cleaned === '.') {
                                  updateLine(i, 'discount_value', undefined);
                                  if (errors[`line_${i}_discount`]) {
                                    setErrors((prev) => {
                                      const next = { ...prev };
                                      delete next[`line_${i}_discount`];
                                      return next;
                                    });
                                  }
                                  return;
                                }
                                const n = Number(cleaned);
                                if (Number.isNaN(n) || n < 0) return;
                                const rate = Number(line.rate) || 0;
                                const type = line.discount_type ?? 'per_kg';
                                if (type === 'percentage' && n > 100) {
                                  updateLine(i, 'discount_value', 100);
                                  setDiscountDrafts((prev) => ({ ...prev, [i]: '100' }));
                                  setErrors((prev) => ({
                                    ...prev,
                                    [`line_${i}_discount`]: 'Percentage discount cannot exceed 100',
                                  }));
                                  return;
                                }
                                if (type !== 'percentage' && n > rate) {
                                  updateLine(i, 'discount_value', rate);
                                  setDiscountDrafts((prev) => ({
                                    ...prev,
                                    [i]: rate === 0 ? '' : String(rate),
                                  }));
                                  setErrors((prev) => ({
                                    ...prev,
                                    [`line_${i}_discount`]:
                                      'Discount cannot exceed the rate (base)',
                                  }));
                                  return;
                                }
                                updateLine(i, 'discount_value', n);
                                if (errors[`line_${i}_discount`]) {
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[`line_${i}_discount`];
                                    return next;
                                  });
                                }
                              }}
                              onBlur={() => {
                                setDiscountDrafts((prev) => {
                                  if (prev[i] === undefined) return prev;
                                  const next = { ...prev };
                                  delete next[i];
                                  return next;
                                });
                              }}
                              placeholder="0"
                            />
                          </div>
                          <div className="w-[78px]">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                            <select
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                              value={line.discount_type ?? 'per_kg'}
                              onChange={(e) => {
                                const nextType =
                                  (e.target.value as 'per_kg' | 'percentage') || 'per_kg';
                                updateLine(i, 'discount_type', nextType);
                                const n = Number(line.discount_value) || 0;
                                const rate = Number(line.rate) || 0;
                                if (nextType === 'percentage' && n > 100) {
                                  updateLine(i, 'discount_value', 100);
                                  setDiscountDrafts((prev) => ({ ...prev, [i]: '100' }));
                                } else if (nextType === 'per_kg' && n > rate) {
                                  updateLine(i, 'discount_value', rate || undefined);
                                  setDiscountDrafts((prev) => ({
                                    ...prev,
                                    [i]: rate ? String(rate) : '',
                                  }));
                                }
                              }}
                            >
                              <option value="per_kg">/kg</option>
                              <option value="percentage">%</option>
                            </select>
                          </div>
                          <div className="w-[72px]">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">GST %</label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              value={line.gst_percent ?? 0}
                              onChange={(e) =>
                                updateLine(
                                  i,
                                  'gst_percent',
                                  e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                                )
                              }
                              disabled={!getLineIsTaxable(line)}
                            />
                          </div>
                          <div className="w-[92px]">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Final (₹)</label>
                            <div className="rounded-md border border-border/40 bg-muted/30 px-2 py-1.5 text-xs font-medium tabular-nums">
                              {getLineFinancialPreview(line).finalAmount.toFixed(2)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(i)}
                            className="p-2 rounded-md hover:bg-destructive/15 text-destructive transition-colors"
                            aria-label="Remove line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div className="w-full flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="rounded-md border border-border/50 bg-background/60 px-2 py-1 text-muted-foreground">
                              Base: <span className="font-medium text-foreground">₹ {financialPreview.amount.toFixed(2)}</span>
                            </span>
                            <span className="rounded-md border border-border/50 bg-background/60 px-2 py-1 text-muted-foreground">
                              Discount: <span className="font-medium text-foreground">₹ {financialPreview.discountAmount.toFixed(2)}</span>
                            </span>
                            <span className="rounded-md border border-border/50 bg-background/60 px-2 py-1 text-muted-foreground">
                              GST: <span className="font-medium text-foreground">₹ {financialPreview.gstAmount.toFixed(2)}</span>
                            </span>
                            <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-primary">
                              Final: <span className="font-semibold">₹ {financialPreview.finalAmount.toFixed(2)}</span>
                            </span>
                          </div>
                          {errors[`line_${i}_qty`] && (
                            <p className="w-full text-xs text-destructive">{errors[`line_${i}_qty`]}</p>
                          )}
                          {errors[`line_${i}_discount`] && (
                            <p className="w-full text-xs text-destructive">{errors[`line_${i}_discount`]}</p>
                          )}
                          {errors[`line_${i}_gst`] && (
                            <p className="w-full text-xs text-destructive">{errors[`line_${i}_gst`]}</p>
                          )}
                          {!getLineIsTaxable(line) && (
                            <p className="w-full text-xs text-muted-foreground">
                              GST not applied for packaging capacity above 25 kg.
                            </p>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>

              {/* Total amount */}
              {(() => {
                const totalAmount = (formData.lines ?? []).reduce((sum, l) => {
                  return sum + getLineFinancialPreview(l).finalAmount;
                }, 0);
                return (
                  <div className="px-6 py-3 border-t border-border/60 bg-muted/20 flex justify-end">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-muted-foreground">
                        Final amount (server-computed)
                      </span>
                      <span className="text-lg font-semibold tabular-nums">₹ {totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              {errors.submit && (
                <p className="px-5 text-sm text-destructive">{errors.submit}</p>
              )}
              {/* Document footer – actions */}
              <div className="sticky bottom-0 border-t border-border/80 bg-muted/30 px-5 py-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-md px-3 py-2 text-xs font-medium border border-input bg-background hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md px-3 py-2 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-opacity"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEdit ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    <SalesmanFormModal
      open={salesmanFormOpen}
      onOpenChange={(next) => {
        setSalesmanFormOpen(next);
        if (!next) void refetchSalesmen();
      }}
    />
    </>
  );
}
