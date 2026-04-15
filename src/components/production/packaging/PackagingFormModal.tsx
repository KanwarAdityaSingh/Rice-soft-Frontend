import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useMemo } from 'react';
import { X, Warehouse, Layers3, Store, Plus, Receipt, FileText, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { usePackaging } from '../../../hooks/usePackaging';
import { usePackagingVendors } from '../../../hooks/usePackagingVendors';
import { useProducts } from '../../../hooks/useProducts';
import { useGodowns } from '../../../hooks/useGodowns';
import type { CreatePackagingRequest, UpdatePackagingRequest, PacketType } from '../../../types/entities';
import { EMPTY_BAG_GST_PERCENT, HOLDING_CAPACITIES } from '../../../constants/packaging';
import { PACKAGING_PACKET_TYPE_OPTIONS } from '../../../constants/bagAndPacketTypes';
import { getPackagingVendorsNewWindowUrl } from '../../../utils/appRoutes';
import { computeEmptyBagReceiptSnapshot, packagingHasAnyEmptyBagSnapshot } from '../../../utils/empty-bag-cost';
import { EmptyBagSnapshotDisplay } from './EmptyBagSnapshotDisplay';

interface PackagingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packagingId?: string | null;
}

const DEFAULT_PACKET_TYPE: PacketType = 'pp';

const MAX_PACKAGING_BILL_BYTES = 10 * 1024 * 1024;
const PACKAGING_BILL_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];

function validatePackagingBillFile(file: File): string | null {
  if (file.size > MAX_PACKAGING_BILL_BYTES) {
    return 'File size must be less than 10MB';
  }
  if (file.type && !PACKAGING_BILL_MIME_TYPES.includes(file.type)) {
    return 'File must be JPEG, PNG, GIF, or PDF';
  }
  return null;
}

const inputClassName =
  'w-full px-3.5 py-2.5 text-sm rounded-xl border bg-background transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50';

const fieldHintClass = 'mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80';

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-gradient-to-b from-muted/30 to-transparent p-4 sm:p-5 shadow-sm">
      <div className="flex gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {description && <p className="text-[11px] text-muted-foreground/90 leading-snug">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function PackagingFormModal({ open, onOpenChange, packagingId }: PackagingFormModalProps) {
  const { createPackaging, updatePackaging, packaging, uploadPackagingBill } = usePackaging();
  const { packagingVendors, refetch: refetchPackagingVendors } = usePackagingVendors();
  const { products } = useProducts();
  const { godowns } = useGodowns(false);
  const [formData, setFormData] = useState<CreatePackagingRequest>({
    product_id: '',
    holding_capacity: 0,
    packet_type: DEFAULT_PACKET_TYPE,
    packaging_vendor_id: null,
    ordered_weight: null,
    initial_packets: null,
    godown_id: '',
    empty_bag_weight_kg: null,
    empty_bag_rate_per_kg: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [packagingBillFile, setPackagingBillFile] = useState<File | null>(null);
  useEffect(() => {
    if (packagingId && open) {
      const pkg = packaging.find((p) => p.id === packagingId);
      if (pkg) {
        setBillNumber(pkg.bill_number?.trim() ?? '');
        setBillDate(pkg.bill_date ? pkg.bill_date.slice(0, 10) : '');
        setPackagingBillFile(null);
        setFormData({
          product_id: pkg.product_id,
          holding_capacity: Number(pkg.holding_capacity),
          packet_type: pkg.packet_type,
          packaging_vendor_id: pkg.packaging_vendor_id,
          ordered_weight: pkg.ordered_weight ? Number(pkg.ordered_weight) : null,
          initial_packets: null, // Not used in edit mode
          godown_id: '',
          empty_bag_weight_kg:
            pkg.empty_bag_weight_kg != null && pkg.empty_bag_weight_kg !== ''
              ? Number(pkg.empty_bag_weight_kg)
              : null,
          empty_bag_rate_per_kg:
            pkg.empty_bag_rate_per_kg != null && pkg.empty_bag_rate_per_kg !== ''
              ? Number(pkg.empty_bag_rate_per_kg)
              : null,
        });
      }
    } else if (open) {
      setBillNumber('');
      setBillDate('');
      setPackagingBillFile(null);
      setFormData({
        product_id: '',
        holding_capacity: 0,
        packet_type: DEFAULT_PACKET_TYPE,
        packaging_vendor_id: null,
        ordered_weight: null,
        initial_packets: null,
        godown_id: '',
        empty_bag_weight_kg: null,
        empty_bag_rate_per_kg: null,
      });
    }
  }, [packagingId, open, packaging]);

  /** After adding a vendor in another tab, refetch when this window regains focus. */
  useEffect(() => {
    if (!open) return;
    const onFocus = () => {
      void refetchPackagingVendors();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [open, refetchPackagingVendors]);

  const editingPackaging = packagingId ? packaging.find((p) => p.id === packagingId) : undefined;

  const emptyBagPreview = useMemo(() => {
    if (packagingId) return null;
    const ip = formData.initial_packets;
    const w = formData.empty_bag_weight_kg;
    const r = formData.empty_bag_rate_per_kg;
    if (
      ip != null &&
      ip > 0 &&
      w != null &&
      w > 0 &&
      r != null &&
      r >= 0
    ) {
      return computeEmptyBagReceiptSnapshot(ip, w, r, EMPTY_BAG_GST_PERCENT);
    }
    return null;
  }, [packagingId, formData.initial_packets, formData.empty_bag_weight_kg, formData.empty_bag_rate_per_kg]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (packagingBillFile) {
      const fileErr = validatePackagingBillFile(packagingBillFile);
      if (fileErr) {
        newErrors.packaging_bill = fileErr;
      }
    }
    if (!formData.product_id) {
      newErrors.product_id = 'Product is required';
    }
    if (formData.holding_capacity <= 0) {
      newErrors.holding_capacity = 'Holding capacity must be greater than 0';
    }
    if (!HOLDING_CAPACITIES.includes(formData.holding_capacity as any)) {
      newErrors.holding_capacity = `Holding capacity must be one of: ${HOLDING_CAPACITIES.join(', ')} kg`;
    }
    if (!packagingId) {
      if (!formData.godown_id || !String(formData.godown_id).trim()) {
        newErrors.godown_id = 'Select a godown for initial empty-packet stock';
      }
      if (
        formData.initial_packets == null ||
        !Number.isInteger(formData.initial_packets) ||
        formData.initial_packets <= 0
      ) {
        newErrors.initial_packets = 'Initial packets must be a whole number greater than 0';
      }
      if (formData.initial_packets != null && formData.initial_packets > 0) {
        const w = formData.empty_bag_weight_kg;
        const r = formData.empty_bag_rate_per_kg;
        if (w == null || Number.isNaN(Number(w)) || Number(w) <= 0) {
          newErrors.empty_bag_weight_kg = 'Empty bag weight (kg per bag) is required and must be greater than 0';
        }
        if (r == null || Number.isNaN(Number(r)) || Number(r) < 0) {
          newErrors.empty_bag_rate_per_kg = 'Rate per kg is required and must be zero or greater';
        }
      }
    }
    if (!formData.packaging_vendor_id || !String(formData.packaging_vendor_id).trim()) {
      newErrors.packaging_vendor_id = 'Packaging vendor is required';
    }
    if (packagingId) {
      const w = formData.empty_bag_weight_kg;
      const r = formData.empty_bag_rate_per_kg;
      if (w != null && (Number.isNaN(Number(w)) || Number(w) <= 0)) {
        newErrors.empty_bag_weight_kg = 'Must be greater than 0 when set';
      }
      if (r != null && (Number.isNaN(Number(r)) || Number(r) < 0)) {
        newErrors.empty_bag_rate_per_kg = 'Must be zero or greater when set';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (packagingId) {
        const updatePayload: UpdatePackagingRequest = {
          holding_capacity: formData.holding_capacity,
          packet_type: formData.packet_type,
          packaging_vendor_id: formData.packaging_vendor_id,
          ordered_weight: formData.ordered_weight,
          bill_number: billNumber.trim() ? billNumber.trim() : null,
          bill_date: billDate || null,
        };
        if (formData.empty_bag_weight_kg != null) {
          updatePayload.empty_bag_weight_kg = formData.empty_bag_weight_kg;
        }
        if (formData.empty_bag_rate_per_kg != null) {
          updatePayload.empty_bag_rate_per_kg = formData.empty_bag_rate_per_kg;
        }
        updatePayload.empty_bag_gst_percent = EMPTY_BAG_GST_PERCENT;
        await updatePackaging(packagingId, updatePayload);
        if (packagingBillFile) {
          await uploadPackagingBill(
            packagingId,
            packagingBillFile,
            billNumber.trim() || undefined,
            billDate || undefined
          );
          setPackagingBillFile(null);
        }
        setAlertType('success');
        setAlertTitle('Packaging Updated');
        setAlertMessage('Packaging has been updated successfully.');
      } else {
        const initial = formData.initial_packets as number;
        const createData: CreatePackagingRequest = {
          product_id: formData.product_id,
          holding_capacity: formData.holding_capacity,
          packet_type: formData.packet_type,
          packaging_vendor_id: String(formData.packaging_vendor_id).trim(),
          ordered_weight: formData.ordered_weight,
          initial_packets: initial,
          godown_id: String(formData.godown_id).trim(),
          empty_bag_weight_kg: Number(formData.empty_bag_weight_kg),
          empty_bag_rate_per_kg: Number(formData.empty_bag_rate_per_kg),
          empty_bag_gst_percent: EMPTY_BAG_GST_PERCENT,
        };
        if (billNumber.trim()) createData.bill_number = billNumber.trim();
        if (billDate) createData.bill_date = billDate;
        const created = await createPackaging(createData);
        if (packagingBillFile) {
          await uploadPackagingBill(
            created.id,
            packagingBillFile,
            billNumber.trim() || undefined,
            billDate || undefined
          );
          setPackagingBillFile(null);
        }
        setAlertType('success');
        setAlertTitle('Packaging Created');
        setAlertMessage('Packaging lot has been created successfully.');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to save packaging. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,800px)] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl shadow-black/20">
            {/* Header */}
            <div className="relative shrink-0 border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 pr-8">
                  <Dialog.Title className="text-xl font-bold tracking-tight sm:text-2xl">
                    {packagingId ? 'Edit packaging' : 'Create packaging'}
                  </Dialog.Title>
                  <p className="text-sm text-muted-foreground">
                    {packagingId
                      ? 'Update product link, capacity, type, and vendor details.'
                      : 'Define how empty packets are tracked: product, size, type, and where stock starts.'}
                  </p>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                <div className="space-y-5">
                  {!packagingId && (
                    <SectionCard
                      icon={Warehouse}
                      title="Initial empty-packet stock"
                      description="Required for new packaging. Stock is recorded in one godown; you can move it later from inventory."
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                          <label className="mb-1.5 block text-sm font-medium text-foreground">
                            Godown <span className="text-destructive">*</span>
                          </label>
                          <select
                            value={formData.godown_id || ''}
                            onChange={(e) => {
                              setFormData({ ...formData, godown_id: e.target.value });
                              if (errors.godown_id) setErrors({ ...errors, godown_id: '' });
                            }}
                            className={`${inputClassName} ${errors.godown_id ? 'border-destructive' : 'border-border'}`}
                          >
                            <option value="">Select godown</option>
                            {godowns.map((g) => (
                              <option key={g.id} value={g.id} disabled={!g.is_active}>
                                {g.name}
                                {!g.is_active ? ' (inactive)' : ''}
                              </option>
                            ))}
                          </select>
                          <p className={fieldHintClass}>Warehouse where the first empty packets are booked.</p>
                          {errors.godown_id && (
                            <p className="mt-1.5 text-xs font-medium text-destructive">{errors.godown_id}</p>
                          )}
                        </div>
                        <div className="sm:col-span-1">
                          <label className="mb-1.5 block text-sm font-medium text-foreground">
                            No. of bags <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={formData.initial_packets ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const nextPackets = raw === '' ? null : parseInt(raw, 10);
                              setFormData({
                                ...formData,
                                initial_packets: Number.isNaN(nextPackets as number) ? null : nextPackets,
                              });
                              if (errors.initial_packets) setErrors({ ...errors, initial_packets: '' });
                            }}
                            className={`${inputClassName} border-border`}
                            placeholder="e.g. 100"
                          />
                          <p className={fieldHintClass}>Whole number of empty packets for this line in the godown above.</p>
                          {errors.initial_packets && (
                            <p className="mt-1.5 text-xs font-medium text-destructive">{errors.initial_packets}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 border-t border-border/60 pt-4 space-y-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">Empty bag costing</p>
                          <p className={fieldHintClass}>
                            Required with initial stock. Enter weight and rate per kg; GST is {EMPTY_BAG_GST_PERCENT}%
                            (fixed). The server stores a one-time receipt snapshot when stock is first booked.
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">
                              Empty bag weight (kg) <span className="text-destructive">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={formData.empty_bag_weight_kg ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setFormData({
                                  ...formData,
                                  empty_bag_weight_kg: raw === '' ? null : parseFloat(raw),
                                });
                                if (errors.empty_bag_weight_kg) {
                                  setErrors({ ...errors, empty_bag_weight_kg: '' });
                                }
                              }}
                              className={`${inputClassName} ${errors.empty_bag_weight_kg ? 'border-destructive' : 'border-border'}`}
                              placeholder="e.g. 0.05"
                            />
                            <p className={fieldHintClass}>Weight of one empty bag in kg.</p>
                            {errors.empty_bag_weight_kg && (
                              <p className="mt-1.5 text-xs font-medium text-destructive">{errors.empty_bag_weight_kg}</p>
                            )}
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">
                              Rate per kg <span className="text-destructive">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.empty_bag_rate_per_kg ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setFormData({
                                  ...formData,
                                  empty_bag_rate_per_kg: raw === '' ? null : parseFloat(raw),
                                });
                                if (errors.empty_bag_rate_per_kg) {
                                  setErrors({ ...errors, empty_bag_rate_per_kg: '' });
                                }
                              }}
                              className={`${inputClassName} ${errors.empty_bag_rate_per_kg ? 'border-destructive' : 'border-border'}`}
                              placeholder="0"
                            />
                            {errors.empty_bag_rate_per_kg && (
                              <p className="mt-1.5 text-xs font-medium text-destructive">{errors.empty_bag_rate_per_kg}</p>
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 text-sm">
                          <span className="font-medium text-foreground">GST on empty bags: </span>
                          <span className="font-mono font-semibold tabular-nums">{EMPTY_BAG_GST_PERCENT}%</span>
                          <span className="text-muted-foreground"> (fixed)</span>
                        </div>
                        {emptyBagPreview && (
                          <EmptyBagSnapshotDisplay
                            variant="preview"
                            title="Estimated first receipt (client preview — server values may differ slightly)"
                            values={emptyBagPreview}
                          />
                        )}
                      </div>
                    </SectionCard>
                  )}

                  <SectionCard
                    icon={Layers3}
                    title="Product & specification"
                    description="What this packaging line represents: finished product, bag size, and material type."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Product <span className="text-destructive">*</span>
                        </label>
                        <select
                          value={formData.product_id}
                          onChange={(e) => {
                            setFormData({ ...formData, product_id: e.target.value });
                            if (errors.product_id) setErrors({ ...errors, product_id: '' });
                          }}
                          className={`${inputClassName} border-border`}
                        >
                          <option value="">Select a product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                        {errors.product_id && (
                          <p className="mt-1.5 text-xs font-medium text-destructive">{errors.product_id}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Holding capacity (kg) <span className="text-destructive">*</span>
                        </label>
                        <select
                          value={formData.holding_capacity || ''}
                          onChange={(e) => {
                            setFormData({ ...formData, holding_capacity: parseFloat(e.target.value) || 0 });
                            if (errors.holding_capacity) setErrors({ ...errors, holding_capacity: '' });
                          }}
                          className={`${inputClassName} border-border`}
                        >
                          <option value="">Select capacity</option>
                          {HOLDING_CAPACITIES.map((kg) => (
                            <option key={kg} value={kg}>
                              {kg} kg
                            </option>
                          ))}
                        </select>
                        <p className={fieldHintClass}>Net rice weight per empty packet.</p>
                        {errors.holding_capacity && (
                          <p className="mt-1.5 text-xs font-medium text-destructive">{errors.holding_capacity}</p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Packet / packaging type <span className="text-destructive">*</span>
                        </label>
                        <select
                          value={formData.packet_type}
                          onChange={(e) =>
                            setFormData({ ...formData, packet_type: e.target.value as PacketType })
                          }
                          className={`${inputClassName} border-border`}
                        >
                          {PACKAGING_PACKET_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {(() => {
                          const meta = PACKAGING_PACKET_TYPE_OPTIONS.find(
                            (o) => o.value === formData.packet_type
                          );
                          if (!meta) return null;
                          return (
                            <div className="mt-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5">
                              <p className="text-[11px] leading-relaxed text-muted-foreground">
                                <span className="font-medium text-foreground/90">Why this matters: </span>
                                {meta.description}
                                {meta.typicalCapacity ? (
                                  <span className="block pt-1 text-muted-foreground/90">
                                    Typical range: {meta.typicalCapacity}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    icon={Store}
                    title="Vendor & purchase"
                    description="Choose who supplies these bags. Optionally record a one-time ordered weight reference."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Packaging vendor <span className="text-destructive">*</span>
                        </label>
                        <select
                          value={formData.packaging_vendor_id || ''}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              packaging_vendor_id: e.target.value ? e.target.value : null,
                            });
                            if (errors.packaging_vendor_id) {
                              setErrors({ ...errors, packaging_vendor_id: '' });
                            }
                          }}
                          className={`${inputClassName} ${errors.packaging_vendor_id ? 'border-destructive' : 'border-border'}`}
                        >
                          <option value="">Select packaging vendor</option>
                          {packagingVendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </option>
                          ))}
                        </select>
                        {errors.packaging_vendor_id && (
                          <p className="text-xs font-medium text-destructive">{errors.packaging_vendor_id}</p>
                        )}
                        <p className={fieldHintClass}>Supplier for this packaging line.</p>
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              getPackagingVendorsNewWindowUrl(),
                              '_blank',
                              'noopener,noreferrer'
                            )
                          }
                          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          <Plus className="h-4 w-4 shrink-0" />
                          Add packaging vendor
                        </button>
                        <p className="text-[11px] text-muted-foreground/90">
                          Opens Packaging Vendors in a new tab. Add a vendor there if needed, then return here and select it (list refreshes when this tab is focused).
                        </p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">Ordered weight (kg)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.ordered_weight || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              ordered_weight: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className={`${inputClassName} border-border`}
                          placeholder="0"
                        />
                        <p className={fieldHintClass}>
                          One-off reference weight from the vendor (not auto-synced with stock).
                        </p>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    icon={FileText}
                    title="Packaging bill"
                    description="Optional vendor bill number, date, and a scanned bill (JPEG, PNG, GIF, or PDF, max 10MB)."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">Bill number</label>
                        <input
                          type="text"
                          value={billNumber}
                          onChange={(e) => {
                            setBillNumber(e.target.value);
                            if (errors.packaging_bill) setErrors({ ...errors, packaging_bill: '' });
                          }}
                          className={`${inputClassName} border-border`}
                          placeholder="e.g. INV-1024"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">Bill date</label>
                        <input
                          type="date"
                          value={billDate}
                          onChange={(e) => {
                            setBillDate(e.target.value);
                            if (errors.packaging_bill) setErrors({ ...errors, packaging_bill: '' });
                          }}
                          className={`${inputClassName} border-border`}
                        />
                      </div>
                    </div>
                    {packagingId && editingPackaging?.packaging_bill_url && (
                      <a
                        href={editingPackaging.packaging_bill_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        View current bill
                      </a>
                    )}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        {packagingId ? 'Replace bill file' : 'Attach bill file'}
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setPackagingBillFile(f);
                          if (errors.packaging_bill) setErrors({ ...errors, packaging_bill: '' });
                        }}
                        className={`block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary ${errors.packaging_bill ? 'rounded-xl border border-destructive p-1' : ''}`}
                      />
                      {packagingBillFile && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Selected: {packagingBillFile.name}
                        </p>
                      )}
                      {errors.packaging_bill && (
                        <p className="mt-1.5 text-xs font-medium text-destructive">{errors.packaging_bill}</p>
                      )}
                      <p className={fieldHintClass}>
                        Upload runs when you save. Bill number and date are also sent with the file when attached.
                      </p>
                    </div>
                  </SectionCard>

                  {packagingId && (
                    <SectionCard
                      icon={Receipt}
                      title="Empty bag costing"
                      description={`Master weight and rate for empty bags; GST is ${EMPTY_BAG_GST_PERCENT}%. Snapshot below was fixed at first stock-in.`}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-foreground">Empty bag weight (kg)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={formData.empty_bag_weight_kg ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setFormData({
                                ...formData,
                                empty_bag_weight_kg: raw === '' ? null : parseFloat(raw),
                              });
                              if (errors.empty_bag_weight_kg) {
                                setErrors({ ...errors, empty_bag_weight_kg: '' });
                              }
                            }}
                            className={`${inputClassName} ${errors.empty_bag_weight_kg ? 'border-destructive' : 'border-border'}`}
                            placeholder="—"
                          />
                          {errors.empty_bag_weight_kg && (
                            <p className="mt-1.5 text-xs font-medium text-destructive">{errors.empty_bag_weight_kg}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-foreground">Rate per kg</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.empty_bag_rate_per_kg ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setFormData({
                                ...formData,
                                empty_bag_rate_per_kg: raw === '' ? null : parseFloat(raw),
                              });
                              if (errors.empty_bag_rate_per_kg) {
                                setErrors({ ...errors, empty_bag_rate_per_kg: '' });
                              }
                            }}
                            className={`${inputClassName} ${errors.empty_bag_rate_per_kg ? 'border-destructive' : 'border-border'}`}
                            placeholder="—"
                          />
                          {errors.empty_bag_rate_per_kg && (
                            <p className="mt-1.5 text-xs font-medium text-destructive">{errors.empty_bag_rate_per_kg}</p>
                          )}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 text-sm">
                        <span className="font-medium text-foreground">GST on empty bags: </span>
                        <span className="font-mono font-semibold tabular-nums">{EMPTY_BAG_GST_PERCENT}%</span>
                        <span className="text-muted-foreground"> (fixed)</span>
                      </div>
                      {editingPackaging && packagingHasAnyEmptyBagSnapshot(editingPackaging) && (
                        <EmptyBagSnapshotDisplay
                          title="Recorded at first stock-in (server snapshot)"
                          values={editingPackaging}
                        />
                      )}
                    </SectionCard>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t border-border/60 bg-muted/25 px-5 py-4 sm:px-6">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary inline-flex min-h-[42px] items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <LoadingSpinner />
                    ) : packagingId ? (
                      'Save changes'
                    ) : (
                      'Create packaging'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />
    </>
  );
}

