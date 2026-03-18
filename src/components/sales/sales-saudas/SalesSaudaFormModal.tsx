import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useSalesSaudasData } from './SalesSaudasDataContext';
import { salesSaudasAPI } from '../../../services/salesSaudas.api';
import { productsAPI } from '../../../services/products.api';
import { inventoryAPI } from '../../../services/inventory.api';
import { packagingAPI } from '../../../services/packaging.api';
import type { Packaging } from '../../../types/entities';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { toast } from '../../../utils/toast';
import type {
  CreateSalesSaudaRequest,
  SalesSaudaLineInput,
  SalesSauda,
} from '../../../types/sales';

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

const defaultLine = (): SalesSaudaLineInput => ({
  product_id: '',
  packaging_id: undefined,
  quantity: 0,
  quantity_unit: 'kg',
  rate: 0,
  sort_order: 0,
});

export function SalesSaudaFormModal({
  open,
  onOpenChange,
  saudaId,
  onSuccess,
}: SalesSaudaFormModalProps) {
  const { salesParties, products } = useSalesSaudasData();
  const isEdit = !!saudaId;
  const salesPartyOptions = salesParties;

  const [brands, setBrands] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  /** Packaging options per product_id; loaded on demand when user selects a product */
  const [packagingByProduct, setPackagingByProduct] = useState<Record<string, Packaging[]>>({});
  const requestedProductIds = useRef<Set<string>>(new Set());
  const [formData, setFormData] = useState<CreateSalesSaudaRequest>({
    sales_party_id: '',
    status: 'draft',
    sauda_date: new Date().toISOString().split('T')[0],
    lines: [defaultLine()],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingSauda, setLoadingSauda] = useState(false);
  const [fgiByProduct, setFgiByProduct] = useState<Record<string, number>>({});
  /** Key: `${product_id}:${packaging_id}` → available kg for that bag */
  const [fgiByProductAndPackaging, setFgiByProductAndPackaging] = useState<
    Record<string, number>
  >({});
  const [loadingFgi, setLoadingFgi] = useState(false);
  /** Line index → true when rate was autofilled from suggested-rate API (rate input disabled). */
  const [rateAutofilledForLine, setRateAutofilledForLine] = useState<Record<number, boolean>>({});

  const selectedSalesParty = formData.sales_party_id
    ? salesPartyOptions.find((s) => s.id === formData.sales_party_id)
    : null;

  useEffect(() => {
    if (open && saudaId) {
      loadSauda();
    } else if (open && !saudaId) {
      setFormData({
        sales_party_id: '',
        status: 'draft',
        sauda_date: new Date().toISOString().split('T')[0],
        lines: [defaultLine()],
      });
      setErrors({});
      setRateAutofilledForLine({});
    }
  }, [open, saudaId]);

  useEffect(() => {
    if (!open) {
      setPackagingByProduct({});
      requestedProductIds.current = new Set();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      productsAPI
        .getBrands()
        .then(setBrands)
        .catch(() => setBrands([]));
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
        .getAllPackaging(pid)
        .then((data) => {
          setPackagingByProduct((prev) => ({ ...prev, [pid]: data }));
        })
        .catch(() => {
          setPackagingByProduct((prev) => ({ ...prev, [pid]: [] }));
        });
    }
  }, [open, formData.lines]);

  useEffect(() => {
    if (!open) {
      setFgiByProduct({});
      setFgiByProductAndPackaging({});
      return;
    }
    setLoadingFgi(true);
    inventoryAPI
      .getHierarchicalInventory()
      .then((hierarchy) => {
        const byProduct: Record<string, number> = {};
        const byProductAndPackaging: Record<string, number> = {};
        const list = Array.isArray(hierarchy) ? hierarchy : [];
        for (const brandGroup of list) {
          for (const product of brandGroup.products ?? []) {
            const productId = product.product_id;
            if (!productId) continue;
            let productTotal = 0;
            for (const pack of product.packaging ?? []) {
              const packagingId = pack.packaging_id;
              let packTotal = 0;
              for (const fg of pack.finished_goods ?? []) {
                const w = Number(fg.weight);
                if (Number.isFinite(w)) {
                  packTotal += w;
                  productTotal += w;
                }
              }
              if (packagingId) {
                const key = `${productId}:${packagingId}`;
                byProductAndPackaging[key] = (byProductAndPackaging[key] ?? 0) + packTotal;
              }
            }
            byProduct[productId] = productTotal;
          }
        }
        setFgiByProduct(byProduct);
        setFgiByProductAndPackaging(byProductAndPackaging);
      })
      .catch(() => {
        setFgiByProduct({});
        setFgiByProductAndPackaging({});
      })
      .finally(() => setLoadingFgi(false));
  }, [open]);

  const loadSauda = async () => {
    if (!saudaId) return;
    setLoadingSauda(true);
    try {
      const s = await salesSaudasAPI.getById(saudaId);
      setFormData({
        sales_party_id: s.sales_party_id,
        status: 'draft',
        sauda_date: s.sauda_date,
        lines:
          s.lines?.map((l) => ({
            product_id: l.product_id,
            packaging_id: l.packaging_id,
            quantity: l.quantity,
            quantity_unit: l.quantity_unit,
            rate: l.rate,
            sort_order: l.sort_order,
          })) ?? [defaultLine()],
      });
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : 'Failed to load sauda' });
    } finally {
      setLoadingSauda(false);
    }
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

  const updateLine = (index: number, field: keyof SalesSaudaLineInput, value: string | number) => {
    setFormData((prev) => {
      const lines = [...(prev.lines ?? [])];
      if (!lines[index]) return prev;
      const next = { ...lines[index], [field]: value };
      // When product changes, clear bag so it stays product-specific
      if (field === 'product_id') {
        next.packaging_id = undefined;
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
    if (!formData.sales_party_id) e.sales_party_id = 'Select a sales party';
    if (!formData.sauda_date) e.sauda_date = 'Date is required';
    const lines = formData.lines ?? [];
    if (lines.length === 0 || lines.every((l) => !l.product_id || l.quantity <= 0)) {
      e.lines = 'Add at least one line with product and quantity';
    }
    lines.forEach((l, i) => {
      if (!l.product_id) e[`line_${i}_product`] = 'Product required';
      if (l.quantity <= 0) e[`line_${i}_qty`] = 'Quantity must be > 0';
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
        formData.lines?.filter((l) => l.product_id && l.quantity > 0) ?? [];
      const total_amount = filteredLines.reduce((sum, l) => {
        const qty = Number(l.quantity) || 0;
        const rate = Number(l.rate) || 0;
        return sum + Math.round(qty * rate * 100) / 100;
      }, 0);
      const payload = {
        ...formData,
        total_amount,
        lines: filteredLines.map((l) => ({
          ...l,
          packaging_id: l.packaging_id || undefined,
        })),
      };
      if (isEdit && saudaId) {
        await salesSaudasAPI.update(saudaId, payload);
      } else {
        await salesSaudasAPI.create(payload);
        toast.success(
          'Sales Sauda created',
          'Verify and finalize it before creating an invoice dispatch.'
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] max-w-5xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-none border border-border/80 bg-background shadow-2xl">
          {/* Document-style header */}
          <div className="sticky top-0 z-10 border-b-2 border-primary/30 bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Dialog.Title className="text-xl font-semibold tracking-tight text-foreground">
                  {isEdit ? 'Edit Sales Sauda' : 'Sales Sauda'}
                </Dialog.Title>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Trade agreement
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
              <div className="flex-1 px-6 py-5 space-y-6">
                {/* Party & date section */}
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1.5">
                    Party & date
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Sales Party</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={formData.sales_party_id}
                        onChange={(e) => setFormData((p) => ({ ...p, sales_party_id: e.target.value }))}
                      >
                        <option value="">Select sales party</option>
                        {salesPartyOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.business_name}
                          </option>
                        ))}
                      </select>
                      {errors.sales_party_id && (
                        <p className="mt-1 text-xs text-destructive">{errors.sales_party_id}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Sauda Date</label>
                      <input
                        type="date"
                        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={formData.sauda_date}
                        onChange={(e) => setFormData((p) => ({ ...p, sauda_date: e.target.value }))}
                      />
                      {errors.sauda_date && (
                        <p className="mt-1 text-xs text-destructive">{errors.sauda_date}</p>
                      )}
                    </div>
                  </div>
                </section>

                {selectedSalesParty && (
                  <section className="rounded-md border border-border/60 bg-muted/20 p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sales party details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
                        <input
                          type="text"
                          disabled
                          className="w-full rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-sm text-foreground cursor-not-allowed"
                          value={
                            selectedSalesParty.address
                              ? [
                                  selectedSalesParty.address.street,
                                  selectedSalesParty.address.city,
                                  selectedSalesParty.address.state,
                                  selectedSalesParty.address.pincode,
                                  selectedSalesParty.address.country,
                                ]
                                  .filter(Boolean)
                                  .join(', ') || '–'
                              : '–'
                          }
                          readOnly
                          aria-readonly
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">GST number</label>
                        <input
                          type="text"
                          disabled
                          className="w-full rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-sm text-foreground cursor-not-allowed"
                          value={selectedSalesParty.business_details?.gst_number ?? '–'}
                          readOnly
                          aria-readonly
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">PAN number</label>
                        <input
                          type="text"
                          disabled
                          className="w-full rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-sm text-foreground cursor-not-allowed"
                          value={selectedSalesParty.business_details?.pan_number ?? '–'}
                          readOnly
                          aria-readonly
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* Line items – table-style */}
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1.5">
                      Line items
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="min-w-[160px]">
                        <label className="sr-only">Brand</label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Plus className="h-4 w-4" /> Add line
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Select brand to filter products below.</p>
                  {errors.lines && (
                    <p className="text-xs text-destructive">{errors.lines}</p>
                  )}
                  <div className="rounded-md border border-border/60 overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                      {(formData.lines ?? []).map((line, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-end gap-3 border-b border-border/40 last:border-0 p-3 bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Product</label>
                            <select
                              className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                            {line.product_id && (
                              <p className="mt-1.5 text-xs text-muted-foreground">
                                {loadingFgi ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                                  </span>
                                ) : line.packaging_id ? (
                                  <>Available (this bag): {(Number.isFinite(Number(fgiByProductAndPackaging[`${line.product_id}:${line.packaging_id}`])) ? Number(fgiByProductAndPackaging[`${line.product_id}:${line.packaging_id}`]) : 0).toFixed(2)} kg</>
                                ) : (
                                  <>Available: {(Number.isFinite(Number(fgiByProduct[line.product_id])) ? Number(fgiByProduct[line.product_id]) : 0).toFixed(2)} kg</>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="min-w-[120px]">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Bag (packaging)</label>
                            <select
                              className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
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
                                  {p.holding_capacity} kg ({p.packet_type})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="w-20">
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Qty</label>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={line.quantity || ''}
                                onChange={(e) =>
                                  updateLine(i, 'quantity', parseFloat(e.target.value) || 0)
                                }
                              />
                            </div>
                            <div className="w-16">
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Unit</label>
                              <select
                                className="w-full rounded-md border border-input bg-background px-1.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={(line.quantity_unit || 'kg') as LineQuantityUnit}
                                onChange={(e) =>
                                  changeLineUnit(i, e.target.value as LineQuantityUnit)
                                }
                              >
                                <option value="kg">Kg</option>
                                <option value="quintal">Qtl</option>
                                <option value="ton">Ton</option>
                              </select>
                            </div>
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Rate (₹/{(line.quantity_unit || 'kg') === 'quintal' ? 'Qtl' : (line.quantity_unit || 'kg') === 'ton' ? 'Ton' : 'kg'})
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              value={line.rate ?? ''}
                              onChange={(e) =>
                                updateLine(i, 'rate', parseFloat(e.target.value) || 0)
                              }
                              disabled={!!rateAutofilledForLine[i]}
                              title={rateAutofilledForLine[i] ? 'Rate was filled from product rates; change product or bag to edit.' : undefined}
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (₹)</label>
                            <div className="rounded-md border border-border/40 bg-muted/30 px-2.5 py-2 text-sm font-medium tabular-nums">
                              {(() => {
                                const qty = Number(line.quantity) || 0;
                                const rate = Number(line.rate) || 0;
                                return (qty * rate).toFixed(2);
                              })()}
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
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              {/* Total amount */}
              {(() => {
                const totalAmount = (formData.lines ?? []).reduce((sum, l) => {
                  const qty = Number(l.quantity) || 0;
                  const rate = Number(l.rate) || 0;
                  return sum + qty * rate;
                }, 0);
                return (
                  <div className="px-6 py-3 border-t border-border/60 bg-muted/20 flex justify-end">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-muted-foreground">Total amount</span>
                      <span className="text-lg font-semibold tabular-nums">₹ {totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              {errors.submit && (
                <p className="px-6 text-sm text-destructive">{errors.submit}</p>
              )}
              {/* Document footer – actions */}
              <div className="sticky bottom-0 border-t border-border/80 bg-muted/30 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-md px-4 py-2.5 text-sm font-medium border border-input bg-background hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-opacity"
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
  );
}
