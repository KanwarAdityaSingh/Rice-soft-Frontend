import * as Dialog from '@radix-ui/react-dialog';
import { X, Package, DollarSign, Scale } from 'lucide-react';
import type { Lot } from '../../../types/entities';

interface LotPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: Lot | null;
}

export function LotPreviewDialog({ open, onOpenChange, lot }: LotPreviewDialogProps) {
  if (!lot) return null;

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
                    Lot Details
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground mt-1">
                    {lot.lot_number}
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
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Lot Number</label>
                  <p className="mt-1 text-sm font-medium">{lot.lot_number}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Item Name</label>
                  <p className="mt-1 text-sm font-medium">{lot.item_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Number of Bags</label>
                  <p className="mt-1 text-sm font-medium">{lot.no_of_bags}</p>
                </div>
                {lot.bag_weight && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">Bag Weight</label>
                    <p className="mt-1 text-sm font-medium">{lot.bag_weight} kg</p>
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Scale className="h-3 w-3" />
                    Bill Weight
                  </label>
                  <p className="mt-1 text-sm font-medium">{lot.bill_weight} kg</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Scale className="h-3 w-3" />
                    Received Weight
                  </label>
                  <p className="mt-1 text-sm font-medium">{lot.received_weight} kg</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Rate
                  </label>
                  <p className="mt-1 text-sm font-medium">₹{(lot.rate ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Amount</label>
                  <p className="mt-1 text-sm font-semibold text-primary">₹{(lot.amount ?? 0).toFixed(2)}</p>
                </div>
                {lot.bardana && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">Bardana</label>
                    <p className="mt-1 text-sm font-medium">{lot.bardana}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <p>Created: {new Date(lot.created_at).toLocaleString()}</p>
                  {lot.updated_at !== lot.created_at && (
                    <p className="mt-1">Updated: {new Date(lot.updated_at).toLocaleString()}</p>
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

