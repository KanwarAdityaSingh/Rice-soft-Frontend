import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { useCreditNotes } from '../../../hooks/useCreditNotes';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreditNote } from '../../../types/sales';

interface CreditNoteDetailModalProps {
  creditNoteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  getProductName: (id: string) => string;
}

export function CreditNoteDetailModal({
  creditNoteId,
  open,
  onOpenChange,
  onSuccess,
  getProductName,
}: CreditNoteDetailModalProps) {
  const { getById, confirm } = useCreditNotes();
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (open && creditNoteId) {
      setLoading(true);
      getById(creditNoteId)
        .then(setCreditNote)
        .catch(() => setCreditNote(null))
        .finally(() => setLoading(false));
    } else {
      setCreditNote(null);
    }
  }, [open, creditNoteId, getById]);

  const handleConfirm = async () => {
    if (!creditNote) return;
    setActionLoading(true);
    try {
      await confirm(creditNote.id);
      const updated = await getById(creditNoteId!);
      setCreditNote(updated);
      onSuccess?.();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border bg-background p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Credit Note</Dialog.Title>
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
          ) : creditNote ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Credit note #</span>
                  <p className="font-medium">{creditNote.credit_note_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">{creditNote.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">{creditNote.credit_note_date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Financial year</span>
                  <p className="font-medium">{creditNote.financial_year ?? '–'}</p>
                </div>
                {creditNote.reason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Reason</span>
                    <p className="font-medium">{creditNote.reason}</p>
                  </div>
                )}
              </div>
              {creditNote.lines && creditNote.lines.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Lines</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left p-2 font-medium">Product</th>
                          <th className="text-right p-2 font-medium">Qty returned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditNote.lines.map((l) => (
                          <tr key={l.id} className="border-b last:border-0">
                            <td className="p-2">{getProductName(l.product_id)}</td>
                            <td className="p-2 text-right">{l.quantity_returned}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {creditNote.status === 'draft' && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleConfirm}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {actionLoading && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <CheckCircle className="h-4 w-4" /> Confirm Credit Note
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Could not load credit note.</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
