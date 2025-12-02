import * as Dialog from '@radix-ui/react-dialog';
import { X, Package, DollarSign, User, Percent } from 'lucide-react';
import type { Sauda } from '../../../types/entities';

interface SaudaPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sauda: Sauda | null;
}

export function SaudaPreviewDialog({ open, onOpenChange, sauda }: SaudaPreviewDialogProps) {
  if (!sauda) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                    Sauda Details
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground mt-1">
                    View sauda information
                  </Dialog.Description>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Sauda Type</label>
                  <p className="mt-1 text-sm font-medium">{sauda.sauda_type === 'xgodown' ? 'X Godown' : 'FOR'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Rice Quality</label>
                  <p className="mt-1 text-sm font-medium">{sauda.rice_quality}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Rate
                  </label>
                  <p className="mt-1 text-sm font-medium">₹{(sauda.rate ?? 0).toFixed(2)}</p>
                </div>
                {sauda.quantity && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">Quantity</label>
                    <p className="mt-1 text-sm font-medium">{sauda.quantity}</p>
                  </div>
                )}
                {sauda.broker_commission && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Broker Commission
                    </label>
                    <p className="mt-1 text-sm font-medium">{sauda.broker_commission}%</p>
                  </div>
                )}
                {sauda.cash_discount != null && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">Cash Discount</label>
                    <p className="mt-1 text-sm font-medium">₹{sauda.cash_discount.toFixed(2)}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <p>Created: {new Date(sauda.created_at).toLocaleString()}</p>
                  {sauda.updated_at !== sauda.created_at && (
                    <p className="mt-1">Updated: {new Date(sauda.updated_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

