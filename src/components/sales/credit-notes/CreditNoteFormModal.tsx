import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreditNotes } from '../../../hooks/useCreditNotes';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { useProducts } from '../../../hooks/useProducts';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreateCreditNoteRequest, CreditNoteLineInput } from '../../../types/sales';

interface CreditNoteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreditNoteFormModal({
  open,
  onOpenChange,
  onSuccess,
}: CreditNoteFormModalProps) {
  const { create } = useCreditNotes();
  const { invoiceDispatches, getById } = useInvoiceDispatches();
  const { products } = useProducts();
  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  const [invoiceDispatchId, setInvoiceDispatchId] = useState('');
  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [creditNoteDate, setCreditNoteDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<CreditNoteLineInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingDispatch, setLoadingDispatch] = useState(false);
  const [dispatchLines, setDispatchLines] = useState<Array<{ id: string; product_id: string; quantity: number }>>([]);
  const [salesSaudaId, setSalesSaudaId] = useState('');

  const confirmedDispatches = invoiceDispatches.filter((d) => d.status === 'confirmed');

  useEffect(() => {
    if (open) {
      setInvoiceDispatchId('');
      setCreditNoteNumber('');
      setCreditNoteDate(new Date().toISOString().split('T')[0]);
      setReason('');
      setLines([]);
      setDispatchLines([]);
      setSalesSaudaId('');
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!open || !invoiceDispatchId) {
      setDispatchLines([]);
      setSalesSaudaId('');
      setLines([]);
      return;
    }
    setLoadingDispatch(true);
    getById(invoiceDispatchId)
      .then((d) => {
        setSalesSaudaId(d.sales_sauda_id);
        const lineOptions = (d.lines ?? []).map((l) => ({
          id: l.id,
          product_id: l.product_id,
          quantity: l.quantity,
        }));
        setDispatchLines(lineOptions);
        setLines(
          lineOptions.map((l) => ({
            invoice_dispatch_line_id: l.id,
            product_id: l.product_id,
            quantity_returned: 0,
          }))
        );
      })
      .catch(() => {
        setDispatchLines([]);
        setLines([]);
      })
      .finally(() => setLoadingDispatch(false));
  }, [open, invoiceDispatchId, getById]);

  const updateLineReturnQty = (invoiceDispatchLineId: string, quantity_returned: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.invoice_dispatch_line_id === invoiceDispatchLineId
          ? { ...l, quantity_returned }
          : l
      )
    );
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!invoiceDispatchId) e.invoice_dispatch_id = 'Select an invoice dispatch';
    if (!salesSaudaId && invoiceDispatchId) {
      // loaded
    }
    if (!creditNoteNumber?.trim()) e.credit_note_number = 'Credit note number is required';
    if (!creditNoteDate) e.credit_note_date = 'Date is required';
    const validLines = lines.filter(
      (l) => l.quantity_returned > 0
    );
    if (validLines.length === 0) {
      e.lines = 'Enter at least one return quantity';
    }
    const dispatchLineMap = new Map(dispatchLines.map((d) => [d.id, d.quantity]));
    for (const l of validLines) {
      const max = dispatchLineMap.get(l.invoice_dispatch_line_id) ?? 0;
      if (l.quantity_returned > max) {
        e[`line_${l.invoice_dispatch_line_id}`] = `Cannot exceed dispatched quantity (${max})`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: CreateCreditNoteRequest = {
      invoice_dispatch_id: invoiceDispatchId,
      sales_sauda_id: salesSaudaId,
      credit_note_number: creditNoteNumber.trim(),
      credit_note_date: creditNoteDate,
      reason: reason.trim() || undefined,
      lines: lines.filter((l) => l.quantity_returned > 0),
    };
    setLoading(true);
    setErrors({});
    try {
      await create(payload);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border bg-background p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">New Credit Note</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Invoice Dispatch (confirmed)</label>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={invoiceDispatchId}
                onChange={(e) => setInvoiceDispatchId(e.target.value)}
              >
                <option value="">Select dispatch</option>
                {confirmedDispatches.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.internal_invoice_number} – {d.party_name}
                  </option>
                ))}
              </select>
              {errors.invoice_dispatch_id && (
                <p className="mt-1 text-xs text-red-600">{errors.invoice_dispatch_id}</p>
              )}
            </div>
            {loadingDispatch && (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Credit Note Number</label>
              <input
                type="text"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={creditNoteNumber}
                onChange={(e) => setCreditNoteNumber(e.target.value)}
              />
              {errors.credit_note_number && (
                <p className="mt-1 text-xs text-red-600">{errors.credit_note_number}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Credit Note Date</label>
              <input
                type="date"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={creditNoteDate}
                onChange={(e) => setCreditNoteDate(e.target.value)}
              />
              {errors.credit_note_date && (
                <p className="mt-1 text-xs text-red-600">{errors.credit_note_date}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {dispatchLines.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Return quantities</h4>
                {errors.lines && (
                  <p className="text-xs text-red-600 mb-2">{errors.lines}</p>
                )}
                <div className="space-y-2">
                  {dispatchLines.map((dl) => {
                    const line = lines.find(
                      (l) => l.invoice_dispatch_line_id === dl.id
                    );
                    const qty = line?.quantity_returned ?? 0;
                    return (
                      <div
                        key={dl.id}
                        className="flex items-center justify-between rounded-lg border p-2 bg-muted/30"
                      >
                        <span className="text-sm">{getProductName(dl.product_id)} (max {dl.quantity})</span>
                        <input
                          type="number"
                          min={0}
                          max={dl.quantity}
                          step="any"
                          className="w-24 rounded border bg-background px-2 py-1.5 text-sm"
                          value={qty || ''}
                          onChange={(e) =>
                            updateLineReturnQty(
                              dl.id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {errors.submit && (
              <p className="text-sm text-red-600">{errors.submit}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || loadingDispatch}
                className="rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
