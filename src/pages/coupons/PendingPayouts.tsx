import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import {
  CouponPageHeader,
  CouponLoading,
  CouponEmpty,
  CouponPagination,
} from '../../components/coupons/shared/CouponUi';
import { MarkPaidModal, BulkMarkPaidModal } from '../../components/coupons/redemptions/MarkPaidModal';
import {
  PayoutDestinationCell,
  PayoutQueueStatusBlock,
} from '../../components/coupons/redemptions/PayoutQueueUi';
import { couponsAPI } from '../../services/coupons.api';
import type { Redemption } from '../../types/coupons';
import { formatRupees, formatDateTime, isRazorpayPayoutFailed } from '../../utils/couponFormat';

export default function PendingPayoutsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const failedOnly = searchParams.get('failedOnly') === '1';

  const [rows, setRows] = useState<Redemption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [markPaidRow, setMarkPaidRow] = useState<Redemption | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await couponsAPI.getPendingPayouts(page, 50);
      setRows(res.rows);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  const failedOnPage = useMemo(() => rows.filter(isRazorpayPayoutFailed).length, [rows]);

  const displayedRows = useMemo(
    () => (failedOnly ? rows.filter(isRazorpayPayoutFailed) : rows),
    [rows, failedOnly]
  );

  const setFailedOnly = (on: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (on) next.set('failedOnly', '1');
      else next.delete('failedOnly');
      return next;
    });
  };

  const handleMarkPaid = async (ref: string, notes?: string) => {
    if (!markPaidRow) return;
    await couponsAPI.markRedemptionPaid(markPaidRow.redemption_id, {
      payment_reference: ref,
      notes,
    });
    await load();
  };

  const handleBulkPaid = async (
    items: { redemption_id: string; payment_reference: string }[],
    notes?: string
  ) => {
    const res = await couponsAPI.bulkMarkRedemptionsPaid({ items, notes });
    await load();
    setSelected(new Set());
    return {
      succeeded: res.succeeded.length,
      failed: res.failed.length,
    };
  };

  const handleRetry = async (r: Redemption) => {
    setRetryingId(r.redemption_id);
    try {
      await couponsAPI.retryPayout(r.redemption_id);
      await load();
    } finally {
      setRetryingId(null);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const pageRowIds = useMemo(
    () => displayedRows.map((r) => r.redemption_id),
    [displayedRows]
  );
  const allPageSelected =
    pageRowIds.length > 0 && pageRowIds.every((id) => selected.has(id));
  const somePageSelected = pageRowIds.some((id) => selected.has(id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageRowIds.forEach((id) => next.delete(id));
      } else {
        pageRowIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const setSelectAllRef = (el: HTMLInputElement | null) => {
    selectAllRef.current = el;
  };

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  return (
    <div className="coupon-page">
      <CouponPageHeader
        title="Pending Payouts"
        subtitle={
          failedOnPage > 0
            ? `${failedOnPage} auto-pay failure${failedOnPage === 1 ? '' : 's'} on this page — retry or mark paid manually`
            : 'Daily workflow — pay customers externally, then mark paid'
        }
        badge="Payouts"
        actions={
          selected.size > 0 ? (
            <button type="button" className="coupon-btn-primary" onClick={() => setBulkOpen(true)}>
              Bulk mark paid ({selected.size})
            </button>
          ) : undefined
        }
      />

      <div className="coupon-card p-4 mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-violet-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={failedOnly}
            onChange={(e) => setFailedOnly(e.target.checked)}
            className="rounded border-violet-300"
          />
          Auto-pay failed only
        </label>
        {failedOnly && (
          <span className="text-xs text-violet-400">
            Filtering current page ({displayedRows.length} of {rows.length} rows)
          </span>
        )}
        {!loading && displayedRows.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-violet-700 cursor-pointer select-none sm:ml-auto">
            <input
              type="checkbox"
              ref={setSelectAllRef}
              checked={allPageSelected}
              onChange={toggleSelectAll}
              aria-label="Select all payouts on this page"
            />
            Select all on this page
            {selected.size > 0 && (
              <span className="text-xs text-violet-400">({selected.size} selected)</span>
            )}
          </label>
        )}
      </div>

      <div className="coupon-card overflow-hidden">
        {loading ? (
          <CouponLoading />
        ) : displayedRows.length === 0 ? (
          <CouponEmpty
            message={
              failedOnly
                ? 'No auto-pay failures on this page — try another page or turn off the filter'
                : 'No pending payouts — all caught up!'
            }
          />
        ) : (
          <>
            <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.4fr)_5rem_minmax(0,1fr)_minmax(0,0.9fr)_auto] gap-x-4 px-5 py-2.5 border-b border-violet-100 text-[10px] font-bold uppercase tracking-wide text-violet-400">
              <span className="pl-7">Redemption</span>
              <span className="text-right">Amount</span>
              <span>Pay to</span>
              <span>Status</span>
              <span className="text-right pr-1">Actions</span>
            </div>
            <div className="divide-y divide-violet-100">
              {displayedRows.map((r) => {
                const failed = isRazorpayPayoutFailed(r);
                const isRetrying = retryingId === r.redemption_id;

                return (
                  <article
                    key={r.redemption_id}
                    className={`p-4 sm:p-5 ${failed ? 'bg-amber-50/70' : 'bg-white'}`}
                  >
                    <div className="flex flex-wrap items-start gap-x-4 gap-y-3 lg:grid lg:grid-cols-[minmax(0,1.4fr)_5rem_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:items-center lg:gap-x-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1 basis-[12rem]">
                        <input
                          type="checkbox"
                          className="mt-1 shrink-0"
                          checked={selected.has(r.redemption_id)}
                          onChange={() => toggleSelected(r.redemption_id)}
                          aria-label={`Select ${r.public_ref}`}
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/coupons/redemptions/${r.redemption_id}`}
                            className="font-semibold text-violet-800 hover:underline"
                          >
                            {r.public_ref}
                          </Link>
                          <p className="font-mono text-xs text-violet-500 mt-0.5">{r.code}</p>
                          <p className="text-[11px] text-violet-400 mt-1">
                            Redeemed {formatDateTime(r.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 lg:text-right">
                        <p className="text-lg font-bold text-emerald-700 leading-none">
                          {formatRupees(r.total_amount_paise)}
                        </p>
                      </div>

                      <div className="flex-1 basis-[10rem] min-w-[10rem] max-w-xs">
                        <PayoutDestinationCell redemption={r} />
                      </div>

                      <div className="flex-1 basis-[8rem] min-w-[7rem] max-w-[11rem]">
                        <PayoutQueueStatusBlock redemption={r} />
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-auto lg:ml-0 lg:justify-end">
                        {failed && (
                          <button
                            type="button"
                            className="coupon-btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                            disabled={isRetrying}
                            onClick={() => void handleRetry(r)}
                          >
                            <RotateCcw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                            {isRetrying ? 'Retrying…' : 'Retry'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="coupon-btn-primary text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                          onClick={() => setMarkPaidRow(r)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark paid
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <CouponPagination page={page} total={total} limit={50} onPageChange={setPage} />
          </>
        )}
      </div>

      {markPaidRow && (
        <MarkPaidModal
          open
          publicRef={markPaidRow.public_ref}
          amountLabel={formatRupees(markPaidRow.total_amount_paise)}
          onClose={() => setMarkPaidRow(null)}
          onSubmit={handleMarkPaid}
        />
      )}

      <BulkMarkPaidModal
        open={bulkOpen}
        count={selected.size}
        redemptionIds={[...selected]}
        onClose={() => setBulkOpen(false)}
        onSubmit={handleBulkPaid}
      />
    </div>
  );
}
