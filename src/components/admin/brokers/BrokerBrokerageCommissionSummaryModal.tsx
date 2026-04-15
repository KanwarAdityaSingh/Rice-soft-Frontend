import * as Dialog from '@radix-ui/react-dialog';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, FileQuestion, IndianRupee, X } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { GodownFilterSelect } from '../../shared/GodownFilterSelect';
import { brokersAPI } from '../../../services/brokers.api';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { paymentAdvicesAPI } from '../../../services/paymentAdvices.api';
import { useTransporters } from '../../../hooks/useTransporters';
import { InwardSlipPassPreviewDialog } from '../../purchases/inward-slip-passes/InwardSlipPassPreviewDialog';
import { PaymentAdvicePreviewDialog } from '../../purchases/payment-advices/PaymentAdvicePreviewDialog';
import type {
  BrokerCommissionSummary,
  BrokerCommissionSummaryLine,
  BrokerCommissionType,
  InwardSlipPass,
  PaymentAdvice,
} from '../../../types/entities';

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

function formatDateLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN');
}

interface BrokerBrokerageCommissionSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brokerId: string | null;
  brokerName?: string | null;
}

function BreakdownPanel({ row }: { row: BrokerCommissionSummaryLine }) {
  const party = row.party;
  return (
    <div className="rounded-lg border border-border/60 bg-background/80 p-4 space-y-3">
      <h4 className="text-sm font-semibold">Commission breakdown</h4>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Amount after cash discount (basis)</dt>
          <dd className="font-medium tabular-nums mt-0.5">{formatMoney(row.amount_after_discount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Brokerage rule</dt>
          <dd className="font-medium mt-0.5">{formatCommissionCell(row.broker_commission, row.broker_commission_type)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Broker commission amount</dt>
          <dd className="text-base font-semibold text-primary tabular-nums mt-0.5">
            {formatMoney(row.broker_commission_amount)}
          </dd>
        </div>
        {party && (
          <div className="sm:col-span-2 pt-2 border-t border-border/50">
            <dt className="text-xs text-muted-foreground">Purchase party</dt>
            <dd className="font-medium mt-0.5">{party.business_name}</dd>
            {party.gst_number && (
              <dd className="text-xs text-muted-foreground mt-1">GST: {party.gst_number}</dd>
            )}
          </div>
        )}
      </dl>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Commission is computed by the server from purchase summary rules; rupees/weight rules may differ from a simple
        percentage of the line above.
      </p>
    </div>
  );
}

export function BrokerBrokerageCommissionSummaryModal({
  open,
  onOpenChange,
  brokerId,
  brokerName,
}: BrokerBrokerageCommissionSummaryModalProps) {
  const { transporters } = useTransporters(true);
  const [godownId, setGodownId] = useState<string | undefined>();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [data, setData] = useState<BrokerCommissionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailSaudaId, setDetailSaudaId] = useState<string | null>(null);

  const [ispPreviewOpen, setIspPreviewOpen] = useState(false);
  const [ispPreview, setIspPreview] = useState<InwardSlipPass | null>(null);
  const [ispPreviewLoadingId, setIspPreviewLoadingId] = useState<string | null>(null);

  const [paPreviewOpen, setPaPreviewOpen] = useState(false);
  const [paPreview, setPaPreview] = useState<PaymentAdvice | null>(null);
  const [paPreviewLoadingId, setPaPreviewLoadingId] = useState<string | null>(null);

  /** Load failures for ISP / PA preview opened from this modal */
  const [previewFetchError, setPreviewFetchError] = useState<string | null>(null);

  const openIspPreview = useCallback(async (ispId: string) => {
    setPreviewFetchError(null);
    setPaPreviewOpen(false);
    setPaPreview(null);
    setIspPreviewLoadingId(ispId);
    try {
      const full = await inwardSlipPassesAPI.getInwardSlipPassById(ispId);
      setIspPreview(full);
      setIspPreviewOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load inward slip pass';
      setPreviewFetchError(msg);
    } finally {
      setIspPreviewLoadingId(null);
    }
  }, []);

  const openPaPreview = useCallback(async (paymentAdviceId: string) => {
    setPreviewFetchError(null);
    setIspPreviewOpen(false);
    setIspPreview(null);
    setPaPreviewLoadingId(paymentAdviceId);
    try {
      const full = await paymentAdvicesAPI.getPaymentAdviceById(paymentAdviceId);
      setPaPreview(full);
      setPaPreviewOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load payment advice';
      setPreviewFetchError(msg);
    } finally {
      setPaPreviewLoadingId(null);
    }
  }, []);

  const transporterLabel = (id: string | null | undefined): string => {
    if (!id) return '—';
    const t = transporters.find((x) => x.id === id);
    return t?.business_name ?? id;
  };

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
      setDetailSaudaId(null);
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
        setDetailSaudaId(null);
        setIspPreviewOpen(false);
        setIspPreview(null);
        setIspPreviewLoadingId(null);
        setPaPreviewOpen(false);
        setPaPreview(null);
        setPaPreviewLoadingId(null);
        setPreviewFetchError(null);
      }
      return;
    }
    void fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, brokerId]);

  const titleName = brokerName?.trim() || 'Broker';

  const periodNote =
    data?.period_from || data?.period_to
      ? `Period: ${formatDateLabel(data.period_from)} — ${formatDateLabel(data.period_to)}`
      : null;

  return (
    <>
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[92vw] md:max-w-6xl translate-x-[-50%] translate-y-[-50%]">
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
                    {titleName} · purchase saudas linked to this broker
                  </Dialog.Description>
                  {periodNote && (
                    <p className="text-xs text-muted-foreground mt-1 truncate" title={periodNote}>
                      {periodNote}
                    </p>
                  )}
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
              {previewFetchError && (
                <p className="text-sm text-destructive mb-3 shrink-0" role="alert">
                  {previewFetchError}
                </p>
              )}
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
                  <div className="overflow-x-auto overflow-y-auto max-h-[min(52vh,520px)] rounded-lg border border-border/60">
                    <table className="w-full text-sm min-w-[680px]">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-[1]">
                        <tr className="border-b border-border text-left">
                          <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Sauda</th>
                          <th className="py-2.5 px-3 font-semibold min-w-[10rem]">Party</th>
                          <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-right">Rule</th>
                          <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-right">Commission</th>
                          <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">ISPs</th>
                          <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">PAs</th>
                          <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap w-[1%]">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lines.map((row) => {
                          const isps = row.isps ?? [];
                          const pas = row.payment_advices ?? [];
                          const expanded = detailSaudaId === row.sauda_id;
                          return (
                            <Fragment key={row.sauda_id}>
                              <tr className="border-b border-border/50 hover:bg-muted/20">
                                <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                                  {row.sauda_display_id?.trim() || row.sauda_id.slice(0, 8)}
                                </td>
                                <td className="py-2.5 px-3 max-w-[14rem]">
                                  <span className="block truncate" title={row.party?.business_name ?? ''}>
                                    {row.party?.business_name ?? '—'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums">
                                  {formatCommissionCell(row.broker_commission, row.broker_commission_type)}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                                  {formatMoney(row.broker_commission_amount)}
                                </td>
                                <td className="py-2.5 px-3 text-center tabular-nums text-muted-foreground">{isps.length}</td>
                                <td className="py-2.5 px-3 text-center tabular-nums text-muted-foreground">{pas.length}</td>
                                <td className="py-2.5 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setDetailSaudaId(expanded ? null : row.sauda_id)}
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                                  >
                                    {expanded ? (
                                      <>
                                        Hide <ChevronUp className="h-3.5 w-3.5" />
                                      </>
                                    ) : (
                                      <>
                                        View <ChevronDown className="h-3.5 w-3.5" />
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                              {expanded && (
                                <tr className="border-b border-border/50 bg-muted/15">
                                  <td colSpan={7} className="p-4 sm:p-5 align-top">
                                    <div className="space-y-5 max-w-full">
                                      <BreakdownPanel row={row} />

                                      <div>
                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                          Inward slip passes ({isps.length})
                                        </h5>
                                        {isps.length === 0 ? (
                                          <p className="text-sm text-muted-foreground">No ISPs in this summary line.</p>
                                        ) : (
                                          <div className="overflow-x-auto rounded-lg border border-border/50">
                                            <table className="w-full text-xs">
                                              <thead>
                                                <tr className="border-b bg-muted/40 text-left">
                                                  <th className="py-2 px-2 font-semibold">Slip</th>
                                                  <th className="py-2 px-2 font-semibold">Date</th>
                                                  <th className="py-2 px-2 font-semibold">Vehicle</th>
                                                  <th className="py-2 px-2 font-semibold">Party</th>
                                                  <th className="py-2 px-2 font-semibold">Transporter</th>
                                                  <th className="py-2 px-2 font-semibold text-right">Transport</th>
                                                  <th className="py-2 px-2 font-semibold text-center w-[1%]">Open</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {isps.map((isp) => (
                                                  <tr key={isp.id} className="border-b border-border/40 last:border-0">
                                                    <td className="py-2 px-2 font-mono whitespace-nowrap">{isp.slip_number}</td>
                                                    <td className="py-2 px-2 whitespace-nowrap">{formatDateLabel(isp.date)}</td>
                                                    <td className="py-2 px-2 font-mono uppercase whitespace-nowrap">
                                                      {isp.vehicle_number?.trim() || '—'}
                                                    </td>
                                                    <td className="py-2 px-2 max-w-[12rem] truncate" title={isp.party_name}>
                                                      {isp.party_name}
                                                    </td>
                                                    <td className="py-2 px-2 text-muted-foreground max-w-[10rem] truncate">
                                                      {transporterLabel(isp.transporter_id)}
                                                    </td>
                                                    <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">
                                                      {isp.transportation_cost != null
                                                        ? formatMoney(isp.transportation_cost)
                                                        : '—'}
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                      <button
                                                        type="button"
                                                        title="Open ISP preview"
                                                        disabled={ispPreviewLoadingId === isp.id}
                                                        onClick={() => void openIspPreview(isp.id)}
                                                        className="inline-flex items-center justify-center rounded-lg p-1.5 text-primary hover:bg-primary/10 disabled:opacity-50"
                                                      >
                                                        {ispPreviewLoadingId === isp.id ? (
                                                          <span className="h-4 w-4 inline-block border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                          <Eye className="h-4 w-4" />
                                                        )}
                                                      </button>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>

                                      <div>
                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                          Payment advices ({pas.length})
                                        </h5>
                                        {pas.length === 0 ? (
                                          <p className="text-sm text-muted-foreground">No payment advices in this summary line.</p>
                                        ) : (
                                          <div className="overflow-x-auto rounded-lg border border-border/50">
                                            <table className="w-full text-xs">
                                              <thead>
                                                <tr className="border-b bg-muted/40 text-left">
                                                  <th className="py-2 px-2 font-semibold">Amount</th>
                                                  <th className="py-2 px-2 font-semibold">Payment date</th>
                                                  <th className="py-2 px-2 font-semibold">Status</th>
                                                  <th className="py-2 px-2 font-semibold">SR #</th>
                                                  <th className="py-2 px-2 font-semibold">Linked ISP</th>
                                                  <th className="py-2 px-2 font-semibold text-center w-[1%]">Open</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {pas.map((pa) => {
                                                  const linkedSlip =
                                                    pa.inward_slip_pass_id &&
                                                    isps.find((i) => i.id === pa.inward_slip_pass_id)?.slip_number;
                                                  return (
                                                    <tr key={pa.id} className="border-b border-border/40 last:border-0">
                                                      <td className="py-2 px-2 tabular-nums font-medium">{formatMoney(pa.amount)}</td>
                                                      <td className="py-2 px-2 whitespace-nowrap">
                                                        {formatDateLabel(pa.date_of_payment)}
                                                      </td>
                                                      <td className="py-2 px-2 capitalize">{pa.status}</td>
                                                      <td className="py-2 px-2 font-mono">{pa.sr_number ?? '—'}</td>
                                                      <td className="py-2 px-2 whitespace-nowrap">
                                                        {pa.inward_slip_pass_id ? (
                                                          <button
                                                            type="button"
                                                            title="Open linked ISP"
                                                            disabled={ispPreviewLoadingId === pa.inward_slip_pass_id}
                                                            onClick={() => void openIspPreview(pa.inward_slip_pass_id!)}
                                                            className="font-mono text-[11px] text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                                                          >
                                                            {linkedSlip ?? `${pa.inward_slip_pass_id.slice(0, 8)}…`}
                                                            <Eye className="h-3 w-3 shrink-0 opacity-70" />
                                                          </button>
                                                        ) : (
                                                          '—'
                                                        )}
                                                      </td>
                                                      <td className="py-2 px-2 text-center">
                                                        <button
                                                          type="button"
                                                          title="Open payment advice preview"
                                                          disabled={paPreviewLoadingId === pa.id}
                                                          onClick={() => void openPaPreview(pa.id)}
                                                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-primary hover:bg-primary/10 disabled:opacity-50"
                                                        >
                                                          {paPreviewLoadingId === pa.id ? (
                                                            <span className="h-4 w-4 inline-block border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                          ) : (
                                                            <Eye className="h-4 w-4" />
                                                          )}
                                                        </button>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
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
    <InwardSlipPassPreviewDialog
      open={ispPreviewOpen}
      onOpenChange={(next) => {
        setIspPreviewOpen(next);
        if (!next) {
          setIspPreview(null);
          setPreviewFetchError(null);
        }
      }}
      isp={ispPreview}
    />
    <PaymentAdvicePreviewDialog
      open={paPreviewOpen}
      onOpenChange={(next) => {
        setPaPreviewOpen(next);
        if (!next) {
          setPaPreview(null);
          setPreviewFetchError(null);
        }
      }}
      paymentAdvice={paPreview}
    />
    </>
  );
}
