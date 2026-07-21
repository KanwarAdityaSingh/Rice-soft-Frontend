import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Plus, Truck } from 'lucide-react';
import { salesSaudasAPI } from '../../../services/salesSaudas.api';
import { invoiceDispatchesAPI } from '../../../services/invoiceDispatches.api';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { BillShipToAddresses } from '../shared/BillShipToAddresses';
import type { InvoiceDispatch, SalesSauda } from '../../../types/sales';
import {
  formatBagsInput,
  formatQty,
  fulfillmentLabelText,
  getSaudaLineAllocated,
  getSaudaLineOrdered,
  getSaudaLineOrderedBags,
  getSaudaLineRemaining,
  getSaudaLineRemainingBags,
  getSaudaLineReturned,
  hasSaudaRemaining,
  isSaudaFullyDispatched,
  summarizeSaudaFulfillment,
} from '../../../utils/salesSaudaFulfillment';
import { isGodownTransfer } from '../../../constants/sales-movement-types';
import { useGodowns } from '../../../hooks/useGodowns';

interface SalesSaudaDetailModalProps {
  saudaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getCustomerName: (id: string) => string;
  getProductName: (id: string) => string;
  /** Open create-dispatch with this sauda preselected (parent owns the form modal). */
  onCreateDispatch?: (saudaId: string) => void;
}

export function SalesSaudaDetailModal({
  saudaId,
  open,
  onOpenChange,
  getCustomerName,
  getProductName,
  onCreateDispatch,
}: SalesSaudaDetailModalProps) {
  const [sauda, setSauda] = useState<SalesSauda | null>(null);
  const [loading, setLoading] = useState(false);
  const [relatedDispatches, setRelatedDispatches] = useState<InvoiceDispatch[]>([]);
  const [loadingDispatches, setLoadingDispatches] = useState(false);
  const { godowns } = useGodowns(true);
  const godownName = (id: string | null | undefined) =>
    id ? godowns.find((g) => g.id === id)?.name ?? id.slice(0, 8) : '–';

  const reloadSauda = useCallback(() => {
    if (!saudaId) return;
    setLoading(true);
    salesSaudasAPI
      .getById(saudaId)
      .then(setSauda)
      .catch(() => setSauda(null))
      .finally(() => setLoading(false));
  }, [saudaId]);

  const reloadDispatches = useCallback(() => {
    if (!saudaId) {
      setRelatedDispatches([]);
      return;
    }
    setLoadingDispatches(true);
    invoiceDispatchesAPI
      .list({ sales_sauda_id: saudaId })
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        list.sort((a, b) => (b.dispatch_date || '').localeCompare(a.dispatch_date || ''));
        setRelatedDispatches(list);
      })
      .catch(() => setRelatedDispatches([]))
      .finally(() => setLoadingDispatches(false));
  }, [saudaId]);

  useEffect(() => {
    if (open && saudaId) {
      reloadSauda();
      reloadDispatches();
    } else {
      setSauda(null);
      setRelatedDispatches([]);
    }
  }, [open, saudaId, reloadSauda, reloadDispatches]);

  const lineTotals = (sauda?.lines ?? []).reduce(
    (acc, line) => {
      acc.base += Number(line.amount) || 0;
      acc.discount += Number(line.discount_amount) || 0;
      acc.gst += Number(line.gst_amount) || 0;
      acc.final += Number(line.final_amount) || 0;
      return acc;
    },
    { base: 0, discount: 0, gst: 0, final: 0 }
  );

  const sortedLines = useMemo(() => {
    const lines = sauda?.lines ?? [];
    return [...lines].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [sauda?.lines]);

  const fullyDispatched = isSaudaFullyDispatched(sauda);
  const fulfillment = useMemo(() => summarizeSaudaFulfillment(sauda), [sauda]);
  const canCreateDispatch =
    Boolean(onCreateDispatch) &&
    sauda?.status === 'order' &&
    hasSaudaRemaining(sauda);

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
              {sauda.status === 'order' && fulfillment.hasLines && (
                <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          fulfillment.label === 'fully_dispatched'
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                            : fulfillment.label === 'partial'
                              ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {fulfillmentLabelText(fulfillment.label)}
                      </span>
                      {fullyDispatched && (
                        <span className="text-xs text-muted-foreground">
                          No remaining quantity to dispatch
                        </span>
                      )}
                    </div>
                    {canCreateDispatch && saudaId && (
                      <button
                        type="button"
                        onClick={() => onCreateDispatch?.(saudaId)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {relatedDispatches.length > 0
                          ? 'Create another dispatch'
                          : 'Create dispatch'}
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Ordered</p>
                      <p className="font-medium tabular-nums">
                        {fulfillment.hasBags && fulfillment.orderedBags != null
                          ? `${formatBagsInput(fulfillment.orderedBags)} bags`
                          : formatQty(fulfillment.ordered)}
                      </p>
                      {fulfillment.hasBags && (
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {formatQty(fulfillment.ordered)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Allocated</p>
                      <p className="font-medium tabular-nums">
                        {fulfillment.hasBags && fulfillment.allocatedBags != null
                          ? `${formatBagsInput(fulfillment.allocatedBags)} bags`
                          : formatQty(fulfillment.allocated)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Returned</p>
                      <p className="font-medium tabular-nums">{formatQty(fulfillment.returned)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p className="font-semibold tabular-nums">
                        {fulfillment.hasBags && fulfillment.remainingBags != null
                          ? `${formatBagsInput(fulfillment.remainingBags) || '0'} bags`
                          : formatQty(fulfillment.remaining)}
                      </p>
                      {fulfillment.hasBags && (
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {formatQty(fulfillment.remaining)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {sauda.status === 'order' && !fulfillment.hasLines && (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    No line fulfillment data on this sauda (GET by id returned empty lines).
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Movement</span>
                  <p className="font-medium">
                    {isGodownTransfer(sauda) ? 'Godown transfer' : 'Sale'}
                  </p>
                </div>
                {isGodownTransfer(sauda) ? (
                  <>
                    <div>
                      <span className="text-muted-foreground">From → To</span>
                      <p className="font-medium">
                        {godownName(sauda.from_godown_id)} → {godownName(sauda.to_godown_id)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Linked party (to godown)</span>
                      <p className="font-medium">
                        {sauda.sales_party_name?.trim() ||
                          getCustomerName(sauda.sales_party_id) ||
                          '–'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-muted-foreground">Sales Party</span>
                      <p className="font-medium">
                        {sauda.sales_party_name?.trim() || getCustomerName(sauda.sales_party_id)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Salesman</span>
                      <p className="font-medium">{sauda.salesman_name?.trim() || '–'}</p>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">{sauda.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sauda type</span>
                  <p className="font-medium uppercase">{sauda.sauda_type ?? '–'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Order number</span>
                  <p className="font-medium">{sauda.order_number ?? '–'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Financial year</span>
                  <p className="font-medium">{sauda.financial_year ?? '–'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {isGodownTransfer(sauda) ? 'Transfer date' : 'Sauda date'}
                  </span>
                  <p className="font-medium">{sauda.sauda_date}</p>
                </div>
                {!isGodownTransfer(sauda) && (
                  <div>
                    <span className="text-muted-foreground">Payment terms</span>
                    <p className="font-medium">
                      {sauda.payment_terms === null || sauda.payment_terms === undefined
                        ? '–'
                        : `${sauda.payment_terms} days`}
                    </p>
                  </div>
                )}
                <div className="col-span-2">
                  <BillShipToAddresses
                    billingAddress={sauda.billing_address}
                    deliveryAddress={sauda.delivery_address}
                  />
                </div>
              </div>
              {sortedLines.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Lines</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left p-2 font-medium">Product</th>
                          <th className="text-right p-2 font-medium">Ordered</th>
                          <th className="text-right p-2 font-medium">Allocated</th>
                          <th className="text-right p-2 font-medium">Returned</th>
                          <th className="text-right p-2 font-medium">Bags left</th>
                          <th className="text-right p-2 font-medium">Remaining</th>
                          <th className="text-right p-2 font-medium">Rate</th>
                          <th className="text-right p-2 font-medium">Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedLines.map((l) => {
                          const ordered = getSaudaLineOrdered(l);
                          const allocated = getSaudaLineAllocated(l);
                          const returned = getSaudaLineReturned(l);
                          const remaining = getSaudaLineRemaining(l);
                          const orderedBags = getSaudaLineOrderedBags(l);
                          const remainingBags = getSaudaLineRemainingBags(l);
                          return (
                            <tr key={l.id} className="border-b last:border-0">
                              <td className="p-2">{getProductName(l.product_id)}</td>
                              <td className="p-2 text-right tabular-nums">
                                {orderedBags != null
                                  ? `${formatBagsInput(orderedBags)} bags`
                                  : formatQty(ordered, l.quantity_unit)}
                              </td>
                              <td className="p-2 text-right tabular-nums">
                                {formatQty(allocated)}
                              </td>
                              <td className="p-2 text-right tabular-nums">
                                {formatQty(returned)}
                              </td>
                              <td className="p-2 text-right tabular-nums font-medium">
                                {remainingBags != null
                                  ? formatBagsInput(remainingBags) || '0'
                                  : '–'}
                              </td>
                              <td className="p-2 text-right tabular-nums">
                                {formatQty(remaining, l.quantity_unit)}
                              </td>
                              <td className="p-2 text-right tabular-nums">{l.rate}</td>
                              <td className="p-2 text-right tabular-nums">{l.final_amount}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md border border-border/50 bg-muted/20 px-2 py-1 text-muted-foreground">
                      Base: <span className="font-medium text-foreground">₹ {lineTotals.base.toFixed(2)}</span>
                    </span>
                    <span className="rounded-md border border-border/50 bg-muted/20 px-2 py-1 text-muted-foreground">
                      Discount: <span className="font-medium text-foreground">₹ {lineTotals.discount.toFixed(2)}</span>
                    </span>
                    <span className="rounded-md border border-border/50 bg-muted/20 px-2 py-1 text-muted-foreground">
                      GST: <span className="font-medium text-foreground">₹ {lineTotals.gst.toFixed(2)}</span>
                    </span>
                    <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-primary">
                      Final: <span className="font-semibold">₹ {lineTotals.final.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              )}

              {sauda.status === 'order' && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Truck className="h-4 w-4" /> Invoice dispatches
                  </h4>
                  {loadingDispatches ? (
                    <p className="text-xs text-muted-foreground">Loading dispatches…</p>
                  ) : relatedDispatches.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                      No dispatches yet
                      {canCreateDispatch ? ' — create one to reserve quantity.' : '.'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50 text-left">
                            <th className="p-2 font-medium">Invoice</th>
                            <th className="p-2 font-medium">Date</th>
                            <th className="p-2 font-medium">Status</th>
                            <th className="p-2 text-right font-medium">Lines</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relatedDispatches.map((d) => (
                            <tr key={d.id} className="border-b last:border-0">
                              <td className="p-2 font-medium tabular-nums">
                                {d.internal_invoice_number}
                              </td>
                              <td className="p-2">{d.dispatch_date}</td>
                              <td className="p-2 capitalize">
                                <span
                                  className={
                                    d.status === 'confirmed'
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : d.status === 'cancelled'
                                        ? 'text-red-700 dark:text-red-400'
                                        : 'text-amber-800 dark:text-amber-300'
                                  }
                                >
                                  {d.status}
                                </span>
                              </td>
                              <td className="p-2 text-right tabular-nums">
                                {d.lines?.length ?? '–'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {relatedDispatches.some((d) => d.status === 'draft') && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Draft dispatches reserve quantity. Delete a draft to free remaining for a new
                      dispatch.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end border-t pt-3">
                <p className="text-sm font-semibold">
                  Sauda amount: ₹ {(sauda.amount ?? sauda.total_amount ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Could not load sauda.</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
