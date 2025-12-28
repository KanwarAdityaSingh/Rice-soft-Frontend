import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { useProducts } from '../../../hooks/useProducts';
import { productsAPI } from '../../../services/products.api';
import type { CreateProductRequest, UpdateProductRequest } from '../../../types/entities';

const RICE_TYPES = [
  { value: 'basmati', label: 'Basmati' },
  { value: 'non_basmati', label: 'Non Basmati' },
  { value: 'parboiled', label: 'Parboiled' },
  { value: 'raw', label: 'Raw' },
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
    }
  }, [productId, open, products]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (productId) {
        await updateProduct(productId, formData as UpdateProductRequest);
        setAlertType('success');
        setAlertTitle('Product Updated');
        setAlertMessage('Product has been updated successfully.');
      } else {
        await createProduct(formData);
        setAlertType('success');
        setAlertTitle('Product Created');
        setAlertMessage('Product has been created successfully.');
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
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-2xl shadow-xl z-50 w-full max-w-2xl border border-border/60">
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
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder="Product description..."
                  />
                </div>

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

