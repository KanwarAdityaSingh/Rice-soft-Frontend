import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { useProducts } from '../../../hooks/useProducts';
import { productsAPI } from '../../../services/products.api';
import { HOLDING_CAPACITIES } from '../../../constants/packaging';
import type { CreateProductRequest, UpdateProductRequest, ProductRateInput } from '../../../types/entities';

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
    rice_type: null,
  });
  const [brands, setBrands] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const brandsFetchedRef = useRef(false);
  /** Rate rows: (holding_capacity, rate) per bag size. Saved via PUT /products/:id/rates after create/update. */
  const [rateRows, setRateRows] = useState<ProductRateInput[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Fetch brands when modal opens (only once per modal session)
  useEffect(() => {
    if (!open) {
      // Reset when modal closes
      brandsFetchedRef.current = false;
      return;
    }
    
    // Only fetch once per modal open
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
      fetchBrands();
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
          rice_type: product.rice_type || null,
        });
      }
    } else if (open) {
      setFormData({ name: '', description: '', brand: '', rice_type: null });
      setRateRows([]);
    }
  }, [productId, open, products]);

  // Load product rates when editing
  useEffect(() => {
    if (!open || !productId) return;
    setLoadingRates(true);
    productsAPI
      .getProductRates(productId)
      .then((list) => setRateRows(list.map((r) => ({ holding_capacity: r.holding_capacity, rate: r.rate }))))
      .catch(() => setRateRows([]))
      .finally(() => setLoadingRates(false));
  }, [open, productId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
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
      let resolvedId = productId;
      if (productId) {
        await updateProduct(productId, formData as UpdateProductRequest);
        resolvedId = productId;
        setAlertType('success');
        setAlertTitle('Product Updated');
        setAlertMessage('Product has been updated successfully.');
      } else {
        const created = await createProduct(formData);
        resolvedId = created.id;
        setAlertType('success');
        setAlertTitle('Product Created');
        setAlertMessage('Product has been created successfully.');
      }
      const validRates = rateRows.filter(
        (r) => HOLDING_CAPACITIES.includes(r.holding_capacity) && Number.isFinite(Number(r.rate))
      );
      if (resolvedId) {
        await productsAPI.setProductRates(resolvedId, { rates: validRates });
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
                  </p>
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

