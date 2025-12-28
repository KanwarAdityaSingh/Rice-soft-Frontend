import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { usePackaging } from '../../../hooks/usePackaging';
import { usePackagingVendors } from '../../../hooks/usePackagingVendors';
import { useProducts } from '../../../hooks/useProducts';
import type { CreatePackagingRequest, UpdatePackagingRequest, PacketType } from '../../../types/entities';

interface PackagingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packagingId?: string | null;
}

const PACKET_TYPES: PacketType[] = ['PP Bag', 'Jute Bag', 'HDPE Bag'];

export function PackagingFormModal({ open, onOpenChange, packagingId }: PackagingFormModalProps) {
  const { createPackaging, updatePackaging, packaging } = usePackaging();
  const { packagingVendors } = usePackagingVendors();
  const { products } = useProducts();
  const [formData, setFormData] = useState<CreatePackagingRequest>({
    product_id: '',
    holding_capacity: 0,
    packet_type: 'PP Bag',
    packaging_vendor_id: null,
    ordered_weight: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (packagingId && open) {
      const pkg = packaging.find((p) => p.id === packagingId);
      if (pkg) {
        setFormData({
          product_id: pkg.product_id,
          holding_capacity: pkg.holding_capacity,
          packet_type: pkg.packet_type,
          packaging_vendor_id: pkg.packaging_vendor_id,
          ordered_weight: pkg.ordered_weight,
        });
      }
    } else if (open) {
      setFormData({
        product_id: '',
        holding_capacity: 0,
        packet_type: 'PP Bag',
        packaging_vendor_id: null,
        ordered_weight: null,
      });
    }
  }, [packagingId, open, packaging]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.product_id) {
      newErrors.product_id = 'Product is required';
    }
    if (formData.holding_capacity <= 0) {
      newErrors.holding_capacity = 'Holding capacity must be greater than 0';
    }
    if (formData.holding_capacity !== 10 && formData.holding_capacity !== 25 && formData.holding_capacity !== 50) {
      newErrors.holding_capacity = 'Holding capacity must be 10, 25, or 50 kg';
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
        await updatePackaging(packagingId, formData as UpdatePackagingRequest);
        setAlertType('success');
        setAlertTitle('Packaging Updated');
        setAlertMessage('Packaging has been updated successfully.');
      } else {
        await createPackaging(formData);
        setAlertType('success');
        setAlertTitle('Packaging Created');
        setAlertMessage('Packaging has been created successfully.');
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
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-2xl shadow-xl z-50 w-full max-w-2xl border border-border/60">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-2xl font-bold">
                  {packagingId ? 'Edit Packaging' : 'Create Packaging'}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Product *</label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => {
                      setFormData({ ...formData, product_id: e.target.value });
                      if (errors.product_id) setErrors({ ...errors, product_id: '' });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  {errors.product_id && (
                    <p className="mt-1 text-sm text-destructive">{errors.product_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Holding Capacity (kg) *</label>
                  <select
                    value={formData.holding_capacity || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, holding_capacity: parseFloat(e.target.value) || 0 });
                      if (errors.holding_capacity) setErrors({ ...errors, holding_capacity: '' });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select capacity</option>
                    <option value="10">10 kg</option>
                    <option value="25">25 kg</option>
                    <option value="50">50 kg</option>
                  </select>
                  {errors.holding_capacity && (
                    <p className="mt-1 text-sm text-destructive">{errors.holding_capacity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Packet Type *</label>
                  <select
                    value={formData.packet_type}
                    onChange={(e) => setFormData({ ...formData, packet_type: e.target.value as PacketType })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PACKET_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Packaging Vendor</label>
                  <select
                    value={formData.packaging_vendor_id || ''}
                    onChange={(e) => setFormData({ ...formData, packaging_vendor_id: e.target.value || null })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a vendor (optional)</option>
                    {packagingVendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ordered Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.ordered_weight || ''}
                    onChange={(e) => setFormData({ ...formData, ordered_weight: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Initial ordered quantity from vendor"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Initial quantity ordered from vendor (static, not incremented/decremented)
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
                    {loading ? <LoadingSpinner /> : packagingId ? 'Update Packaging' : 'Create Packaging'}
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

