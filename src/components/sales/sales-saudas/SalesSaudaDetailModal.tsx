import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSalesSaudas } from '../../../hooks/useSalesSaudas';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { SalesSauda } from '../../../types/sales';

interface SalesSaudaDetailModalProps {
  saudaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getCustomerName: (id: string) => string;
  getProductName: (id: string) => string;
}

export function SalesSaudaDetailModal({
  saudaId,
  open,
  onOpenChange,
  getCustomerName,
  getProductName,
}: SalesSaudaDetailModalProps) {
  const { getById } = useSalesSaudas();
  const [sauda, setSauda] = useState<SalesSauda | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && saudaId) {
      setLoading(true);
      getById(saudaId)
        .then(setSauda)
        .catch(() => setSauda(null))
        .finally(() => setLoading(false));
    } else {
      setSauda(null);
    }
  }, [open, saudaId, getById]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border bg-background p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Sales Sauda Details</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : sauda ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer</span>
                  <p className="font-medium">{getCustomerName(sauda.customer_id)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">{sauda.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Order number</span>
                  <p className="font-medium">{sauda.order_number ?? '–'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sauda date</span>
                  <p className="font-medium">{sauda.sauda_date}</p>
                </div>
                {sauda.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Notes</span>
                    <p className="font-medium">{sauda.notes}</p>
                  </div>
                )}
              </div>
              {sauda.lines && sauda.lines.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Lines</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left p-2 font-medium">Product</th>
                          <th className="text-right p-2 font-medium">Qty</th>
                          <th className="text-right p-2 font-medium">Rate</th>
                          <th className="text-right p-2 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sauda.lines.map((l) => (
                          <tr key={l.id} className="border-b last:border-0">
                            <td className="p-2">{getProductName(l.product_id)}</td>
                            <td className="p-2 text-right">
                              {l.quantity} {l.quantity_unit}
                            </td>
                            <td className="p-2 text-right">{l.rate}</td>
                            <td className="p-2 text-right">{l.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Could not load sauda.</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
