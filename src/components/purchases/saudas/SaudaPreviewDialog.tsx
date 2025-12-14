import * as Dialog from '@radix-ui/react-dialog';
import { X, Package, DollarSign, User, Percent } from 'lucide-react';
import { useState, useEffect } from 'react';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import type { Sauda, RiceCode, RiceType } from '../../../types/entities';

interface SaudaPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sauda: Sauda | null;
}

export function SaudaPreviewDialog({ open, onOpenChange, sauda }: SaudaPreviewDialogProps) {
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);

  useEffect(() => {
    const fetchRiceCodes = async () => {
      try {
        const data = await riceCodesAPI.getAllRiceCodes();
        setRiceCodes(data);
      } catch (error) {
        console.error('Failed to fetch rice codes:', error);
      }
    };
    const fetchRiceTypes = async () => {
      try {
        const data = await riceCodesAPI.getRiceTypes();
        setRiceTypes(data);
      } catch (error) {
        console.error('Failed to fetch rice types:', error);
      }
    };
    if (open && sauda) {
      fetchRiceCodes();
      fetchRiceTypes();
    }
  }, [open, sauda]);

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '';
  };

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
                {sauda.rice_code_id && (
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">Rice Code</label>
                    <p className="mt-1 text-sm font-medium">{getRiceCodeName(sauda.rice_code_id)}</p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Rice Type</label>
                  <p className="mt-1 text-sm font-medium">{getRiceTypeLabel(sauda.rice_type, riceTypes) || 'Not specified'}</p>
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

