import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { useProducts } from '../../../hooks/useProducts';
import { productsAPI } from '../../../services/products.api';
import { HOLDING_CAPACITIES } from '../../../constants/packaging';
import { DateInputWithSteppers } from '../../shared/DateInputWithSteppers';
import type { CreateProductRequest, UpdateProductRequest, ProductRateInput } from '../../../types/entities';

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

const RICE_TYPES = [
  { value: 'raw_basmati', label: 'Raw Basmati' },
  { value: 'steam_basmati', label: 'Steam Basmati' },
  { value: 'white_sella', label: 'White Sella' },
  { value: 'golden_sella', label: 'Golden Sella' },
];

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string | null;
}

export function ProductFormModal({ open, onOpenChange, productId }: ProductFormModalProps) {
  const { createProduct, updateProduct, products, refetch } = useProducts();
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: '',
    description: '',
    brand: '',
    hsn_code: null,
    rice_type: null,
  });
  const [brands, setBrands] = useState<Array<{ value: string; label: string }>>([]);
  const [hsnCodes, setHsnCodes] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingHsnCodes, setLoadingHsnCodes] = useState(false);
  const brandsFetchedRef = useRef(false);
  const hsnCodesFetchedRef = useRef(false);
  /** Rate rows: (holding_capacity, rate) per bag size. Saved via PUT /products/:id/rates after create/update. */
  const [rateRows, setRateRows] = useState<ProductRateInput[]>([]);
  /** YYYY-MM-DD for the rates batch (required by API when saving rates) */
  const [ratesEffectiveDate, setRatesEffectiveDate] = useState(todayIsoDate);
  const [loadingRates, setLoadingRates] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Fetch brands + HSN codes when modal opens (once per modal session)
  useEffect(() => {
    if (!open) {
      brandsFetchedRef.current = false;
      hsnCodesFetchedRef.current = false;
      return;
    }

    if (!brandsFetchedRef.current) {
      brandsFetchedRef.current = true;
      const fetchBrands = async () => {
        setLoadingBrands(true);
        try {
          const brandsData = await productsAPI.getBrands();
          setBrands(brandsData);
        } catch (error) {
          console.error('Failed to fetch brands:', error);
        } finally {
          setLoadingBrands(false);
        }
      };
      void fetchBrands();
    }

    if (!hsnCodesFetchedRef.current) {
      hsnCodesFetchedRef.current = true;
      const fetchHsnCodes = async () => {
        setLoadingHsnCodes(true);
        try {
          const data = await productsAPI.getHsnCodes();
          setHsnCodes(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Failed to fetch HSN codes:', error);
          setHsnCodes([]);
        } finally {
          setLoadingHsnCodes(false);
        }
      };
      void fetchHsnCodes();
    }
  }, [open]);

  useEffect(() => {
    if (productId && open) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setFormData({
          name: product.name,
          description: product.description || '',
          brand: product.brand || '',
          hsn_code: product.hsn_code || null,
          rice_type: product.rice_type || null,
        });
      }
    } else if (open) {
      setFormData({ name: '', description: '', brand: '', hsn_code: null, rice_type: null });
      setRateRows([]);
      setRatesEffectiveDate(todayIsoDate());
    }
  }, [productId, open, products]);

  // Load product rates when editing
  useEffect(() => {
    if (!open || !productId) {
      if (open && !productId) setRatesEffectiveDate(todayIsoDate());
      return;
    }
    setLoadingRates(true);
    productsAPI
      .getProductRates(productId)
      .then((list) => {
        setRateRows(list.map((r) => ({ holding_capacity: r.holding_capacity, rate: Number(r.rate) })));
        const latest = list
          .map((r) => r.effective_date)
          .filter((d): d is string => !!d)
          .sort()
          .at(-1);
        setRatesEffectiveDate(latest || todayIsoDate());
      })
      .catch(() => {
        setRateRows([]);
        setRatesEffectiveDate(todayIsoDate());
      })
      .finally(() => setLoadingRates(false));
  }, [open, productId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (formData.hsn_code) {
      const allowed = new Set(hsnCodes.map((c) => c.value));
      if (allowed.size > 0 && !allowed.has(formData.hsn_code)) {
        newErrors.hsn_code = 'Select a valid HSN code';
      }
    }
    const hasRates = rateRows.some(
      (r) => HOLDING_CAPACITIES.includes(r.holding_capacity) && Number.isFinite(Number(r.rate))
    );
    if (hasRates && !ratesEffectiveDate) {
      newErrors.rates_effective_date = 'Effective date is required when saving rates';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addRateRow = () => {
    const used = new Set(rateRows.map((r) => r.holding_capacity));
    const next = HOLDING_CAPACITIES.find((kg) => !used.has(kg));
    if (next !== undefined) {
      setRateRows((prev) => [...prev, { holding_capacity: next, rate: 0 }]);
    }
  };

  const updateRateRow = (index: number, field: 'holding_capacity' | 'rate', value: number) => {
    setRateRows((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeRateRow = (index: number) => {
    setRateRows((prev) => prev.filter((_, i) => i !== index));
  };

  const usedCapacities = new Set(rateRows.map((r) => r.holding_capacity));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        hsn_code: formData.hsn_code?.trim() || null,
      };
      let resolvedId = productId;
      if (productId) {
        await updateProduct(productId, payload as UpdateProductRequest);
        resolvedId = productId;
        setAlertType('success');
        setAlertTitle('Product Updated');
        setAlertMessage('Product has been updated successfully.');
      } else {
        const created = await createProduct(payload);
        resolvedId = created.id;
        setAlertType('success');
        setAlertTitle('Product Created');
        setAlertMessage('Product has been created successfully.');
      }
      const validRates = rateRows.filter(
        (r) => HOLDING_CAPACITIES.includes(r.holding_capacity) && Number.isFinite(Number(r.rate))
      );
      if (resolvedId && validRates.length > 0) {
        await productsAPI.setProductRates(resolvedId, {
          effective_date: ratesEffectiveDate,
          rates: validRates,
        });
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        refetch();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to save product. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-2xl shadow-xl z-50 w-full max-w-4xl border border-border/60">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-2xl font-bold">
                  {productId ? 'Edit Product' : 'Create Product'}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Brand</label>
                    <select
                      value={formData.brand || ''}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={loadingBrands}
                    >
                      <option value="">Select a brand (optional)</option>
                      {brands.map((brand) => (
                        <option key={brand.value} value={brand.value}>
                          {brand.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">HSN code</label>
                    <select
                      value={formData.hsn_code || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          hsn_code: e.target.value || null,
                        });
                        if (errors.hsn_code) setErrors({ ...errors, hsn_code: '' });
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={loadingHsnCodes}
                    >
                      <option value="">Select HSN code (optional)</option>
                      {hsnCodes.map((code) => (
                        <option key={code.value} value={code.value}>
                          {code.label}
                        </option>
                      ))}
                    </select>
                    {errors.hsn_code && (
                      <p className="mt-1 text-sm text-destructive">{errors.hsn_code}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Premium Mixed Rice"
                  />
                  {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Rice Type</label>
                  <select
                    value={formData.rice_type || ''}
                    onChange={(e) => setFormData({ ...formData, rice_type: e.target.value || null })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a rice type (optional)</option>
                    {RICE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional: Categorize the product by rice type
                  </p>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Rates (₹/kg by holding capacity)</label>
                    {loadingRates ? (
                      <span className="text-xs text-muted-foreground">Loading…</span>
                    ) : (
                      <button
                        type="button"
                        onClick={addRateRow}
                        disabled={usedCapacities.size >= HOLDING_CAPACITIES.length}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        <Plus className="h-4 w-4" /> Add rate
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Optional. Used to suggest rate in sales sauda when product and bag are selected.
                    Saving writes history for the chosen effective date (same day overwrites that day’s line).
                  </p>
                  {(rateRows.length > 0 || loadingRates) && (
                    <div className="mb-3 max-w-xs">
                      <label className="block text-xs font-medium mb-1">
                        Effective date <span className="text-red-500">*</span>
                      </label>
                      <DateInputWithSteppers
                        className="w-full"
                        inputClassName="py-2 text-sm"
                        invalid={Boolean(errors.rates_effective_date)}
                        value={ratesEffectiveDate}
                        onChange={(v) => {
                          setRatesEffectiveDate(v);
                          if (errors.rates_effective_date) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.rates_effective_date;
                              return next;
                            });
                          }
                        }}
                      />
                      {errors.rates_effective_date && (
                        <p className="mt-1 text-xs text-destructive">{errors.rates_effective_date}</p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Current rates update only if this date is on or after the existing rate date.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {rateRows.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <select
                          value={row.holding_capacity}
                          onChange={(e) =>
                            updateRateRow(idx, 'holding_capacity', Number(e.target.value))
                          }
                          className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {HOLDING_CAPACITIES.map((kg) => (
                            <option key={kg} value={kg} disabled={usedCapacities.has(kg) && rateRows[idx].holding_capacity !== kg}>
                              {kg} kg
                            </option>
                          ))}
                        </select>
                        <span className="text-muted-foreground text-sm">₹</span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.rate || ''}
                          onChange={(e) =>
                            updateRateRow(idx, 'rate', parseFloat(e.target.value) || 0)
                          }
                          className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Rate"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">/ kg</span>
                        <button
                          type="button"
                          onClick={() => removeRateRow(idx)}
                          className="ml-auto p-1.5 rounded-lg hover:bg-destructive/15 text-destructive transition-colors shrink-0"
                          aria-label="Remove rate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {rateRows.length === 0 && !loadingRates && (
                      <p className="text-sm text-muted-foreground">No rates. Click “Add rate” to set ₹/kg for a bag size.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Dialog.Close asChild>
                    <button type="button" className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <LoadingSpinner /> : productId ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
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

