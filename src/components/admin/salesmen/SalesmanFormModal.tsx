import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useSalesmen } from '../../../hooks/useSalesmen';
import { validateEmail } from '../../../utils/validation';
import { SalespersonPreviewDialog } from './SalespersonPreviewDialog';
import type { CreateSalesmanRequest } from '../../../types/entities';

interface SalesmanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesmanFormModal({ open, onOpenChange }: SalesmanFormModalProps) {
  const { createSalesman } = useSalesmen();
  const [formData, setFormData] = useState<CreateSalesmanRequest>({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Name is required';
    if (!validateEmail(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone) newErrors.phone = 'Phone is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and show preview instead of directly saving
    if (validateForm()) {
      // Close form modal and open preview dialog
      onOpenChange(false);
      setPreviewOpen(true);
    }
  };

  const handlePreviewConfirm = async (data: CreateSalesmanRequest) => {
    setLoading(true);
    try {
      await createSalesman(data);
      setPreviewOpen(false);
      setFormData({ name: '', email: '', phone: '' });
      setErrors({});
    } catch (error) {
      // Error handled by hook
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-w-md translate-x-[-50%] translate-y-[-50%] w-full">
          <div className="glass rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">Create Salesperson</Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => onOpenChange(false)} className="flex-1 rounded-lg border border-border bg-background/60 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  Create Salesperson
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
      {/* Preview Dialog */}
      <SalespersonPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            // If preview is closed without confirming, optionally reopen the form
            // For now, we'll just close it
          }
        }}
        formData={formData}
        onConfirm={handlePreviewConfirm}
      />
    </Dialog.Root>
  );
}

