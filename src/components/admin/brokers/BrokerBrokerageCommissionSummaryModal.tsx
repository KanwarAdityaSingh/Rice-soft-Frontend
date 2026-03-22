import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useState } from 'react';
import { FileQuestion, IndianRupee, X } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { GodownFilterSelect } from '../../shared/GodownFilterSelect';
import { brokersAPI } from '../../../services/brokers.api';
import type { BrokerCommissionSummary, BrokerCommissionType } from '../../../types/entities';

function formatCommissionCell(
  value: number | null,
  type: BrokerCommissionType | null | undefined
): string {
  if (value == null) return '—';
  if (type === 'rupees') return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === 'weight')
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/Kg`;
  return `${value}%`;
}

function formatMoney(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface BrokerBrokerageCommissionSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brokerId: string | null;
  brokerName?: string | null;
}

export function BrokerBrokerageCommissionSummaryModal({
  open,
  onOpenChange,
  brokerId,
  brokerName,
}: BrokerBrokerageCommissionSummaryModalProps) {
  const [godownId, setGodownId] = useState<string | undefined>();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [data, setData] = useState<BrokerCommissionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!brokerId) return;
    setLoading(true);
    setError(null);
    try {
      const summary = await brokersAPI.getBrokerageCommissionSummary(brokerId, {
        godown_id: godownId,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setData(summary);
    } catch (e: any) {
      setData(null);
      setError(e?.message || 'Failed to load brokerage summary');
    } finally {
      setLoading(false);
    }
  }, [brokerId, godownId, fromDate, toDate]);

  useEffect(() => {
    if (!open || !brokerId) {
      if (!open) {
        setData(null);
        setError(null);
      }
      return;
    }
    void fetchSummary();
    // Intentionally only when the dialog opens or broker changes; filter changes use Apply
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, brokerId]);

  const titleName = brokerName?.trim() || 'Broker';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[92vw] md:max-w-5xl translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-primary/15 rounded-lg shrink-0">
                  <IndianRupee className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <Dialog.Title className="text-lg sm:text-xl font-semibold truncate">
                    Brokerage summary
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground truncate">
                    {titleName} · purchase saudas (same rules as purchase summary)
                  </Dialog.Description>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-2 hover:bg-muted/50 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-border/60">
              <GodownFilterSelect value={godownId} onChange={setGodownId} label="Godown" />
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
                <input
                  type="date"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
                <input
                  type="date"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button type="button" className="btn-primary rounded-lg px-4 py-2 text-sm" onClick={() => void fetchSummary()}>
                  Apply
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {loading && (
                <div className="flex justify-center py-16">
                  <LoadingSpinner />
                </div>
              )}
              {!loading && error && (
                <p className="text-sm text-destructive text-center py-8">{error}</p>
              )}
              {!loading && !error && data && data.lines.length === 0 && (
                <EmptyState
                  icon={FileQuestion}
                  title="No matching saudas"
                  description="Try widening the date range or clearing filters."
                />
              )}
              {!loading && !error && data && data.lines.length > 0 && (
                <>
                  <div className="overflow-x-auto overflow-y-auto max-h-[min(52vh,480px)] rounded-lg border border-border/60">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-[1]">
                        <tr className="border-b border-border text-left">
                          <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Sauda</th>
                          <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Date</th>
                          <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Status</th>
                          <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-right">Rate / %</th>
                          <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-right">After discount</th>
                          <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lines.map((row) => (
                          <tr key={row.sauda_id} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                              {row.sauda_display_id || row.sauda_id.slice(0, 8)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                              {row.sauda_date
                                ? new Date(row.sauda_date + 'T12:00:00').toLocaleDateString('en-IN')
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 capitalize whitespace-nowrap">{row.status}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums">
                              {formatCommissionCell(row.broker_commission, row.broker_commission_type)}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums">
                              {formatMoney(row.amount_after_discount)}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                              {formatMoney(row.broker_commission_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-end items-center gap-3 pt-3 border-t border-border/60">
                    <span className="text-sm text-muted-foreground">Total brokerage</span>
                    <span className="text-lg font-bold tabular-nums">{formatMoney(data.total_broker_commission)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
