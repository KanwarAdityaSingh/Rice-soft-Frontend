import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, User } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateSalesmanRequest } from '../../../types/entities';

interface SalespersonPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateSalesmanRequest;
  onConfirm: (data: CreateSalesmanRequest) => Promise<void>;
}

export function SalespersonPreviewDialog({ open, onOpenChange, formData, onConfirm }: SalespersonPreviewDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create salesperson:', error);
      // Re-throw error so parent component can handle it
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const InfoSection = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </div>
      <div className="pl-6 space-y-2 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between items-start">
        <span className="text-muted-foreground min-w-[120px]">{label}:</span>
        <span className="text-foreground font-medium text-right flex-1">{value}</span>
      </div>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                    Review Salesperson Details
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground mt-1">
                    Please review all the details before creating the salesperson
                  </Dialog.Description>
                </div>
              </div>
              <button 
                onClick={() => onOpenChange(false)} 
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <InfoSection title="Salesperson Information" icon={User}>
                <InfoRow label="Name" value={formData.name} />
                <InfoRow label="Email" value={formData.email} />
                <InfoRow label="Phone" value={formData.phone} />
                <InfoRow 
                  label="Status" 
                  value={formData.is_active !== false ? 'Active' : 'Inactive'} 
                />
              </InfoSection>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Creating Salesperson...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Create Salesperson</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

