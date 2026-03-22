import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { usePackaging } from '../../../hooks/usePackaging';
import { formatPacketTypeLabel } from '../../../constants/bagAndPacketTypes';

interface AddPacketsInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packagingId: string | null;
}

export function AddPacketsInventoryModal({ open, onOpenChange, packagingId }: AddPacketsInventoryModalProps) {
  const { packaging, addPacketsInventory } = usePackaging();
  const [quantity, setQuantity] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const pkg = packagingId ? packaging.find((p) => p.id === packagingId) : null;

  useEffect(() => {
    if (open) {
      setQuantity(0);
      setErrors({});
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !packagingId) return;

    setLoading(true);
    try {
      await addPacketsInventory(packagingId, {
        packaging_id: packagingId,
        available_quantity: quantity,
      });
      setAlertType('success');
      setAlertTitle('Inventory Added');
      setAlertMessage(`${quantity} empty packets have been added to inventory.`);
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to add inventory. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  if (!pkg) return null;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-2xl shadow-xl z-50 w-full max-w-md border border-border/60">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-2xl font-bold">
                  Add Empty Packets Inventory
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Packaging Type</div>
                <div className="text-base font-semibold">{formatPacketTypeLabel(pkg.packet_type)}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Capacity: {pkg.holding_capacity} kg per packet
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Empty Packets *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity || ''}
                    onChange={(e) => {
                      setQuantity(parseInt(e.target.value) || 0);
                      if (errors.quantity) setErrors({ ...errors, quantity: '' });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter quantity"
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-destructive">{errors.quantity}</p>
                  )}
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
                    {loading ? <LoadingSpinner /> : 'Add Inventory'}
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

