import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import {
  CouponPageHeader,
  CouponLoading,
  CouponEmpty,
  CouponPagination,
} from '../../components/coupons/shared/CouponUi';
import {
  PayoutQueueStatus,
  PayoutErrorText,
} from '../../components/coupons/redemptions/PayoutQueueUi';
import {
  AnalyticsDateFilter,
  useAnalyticsPreset,
} from '../../components/coupons/analytics/AnalyticsDateFilter';
import { RedemptionDetailDialog } from '../../components/coupons/redemptions/RedemptionDetailDialog';
import { couponsAPI } from '../../services/coupons.api';
import type { Redemption } from '../../types/coupons';
import { formatRupees, formatDateTime, isRazorpayPayoutFailed } from '../../utils/couponFormat';
import { useUserDisplayNames } from '../../hooks/useUserDisplayNames';
import { PaidByText } from '../../components/coupons/redemptions/PaidByText';

export default function RedemptionsPage() {
  const { preset, range, setPreset, rangeLabel } = useAnalyticsPreset();
  const { resolve: resolveUserName } = useUserDisplayNames();
  const [rows, setRows] = useState<Redemption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [payoutStatus, setPayoutStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [failedOnly, setFailedOnly] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const displayedRows = failedOnly
    ? rows.filter(isRazorpayPayoutFailed)
    : rows;

  useEffect(() => {
    setLoading(true);
    couponsAPI
      .getAllRedemptions({
        payoutStatus: payoutStatus || undefined,
        phone: phone || undefined,
        code: code || undefined,
        fromDate: range.fromDate,
        toDate: range.toDate,
        page,
        limit: 50,
      })
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
      })
      .finally(() => setLoading(false));
  }, [payoutStatus, phone, code, page, range.fromDate, range.toDate, preset]);

  return (
    <div className="coupon-page">
      <CouponPageHeader
        title="All Redemptions"
        subtitle="Filterable history of coupon redemptions and payouts"
        badge="Redemptions"
      />

      <AnalyticsDateFilter
        preset={preset}
        onPresetChange={(p) => {
          setPreset(p);
          setPage(1);
        }}
        rangeLabel={rangeLabel}
      />

      <div className="coupon-card p-4 mb-4 flex flex-wrap gap-3">
        <select className="coupon-select w-36" value={payoutStatus} onChange={(e) => { setPayoutStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
        <input className="coupon-input w-36" placeholder="Phone" value={phone} onChange={(e) => { setPhone(e.target.value); setPage(1); }} />
        <input className="coupon-input w-36" placeholder="Coupon code" value={code} onChange={(e) => { setCode(e.target.value); setPage(1); }} />
        {(payoutStatus === 'pending' || payoutStatus === '') && (
          <label className="flex items-center gap-2 text-sm text-violet-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={failedOnly}
              onChange={(e) => setFailedOnly(e.target.checked)}
              className="rounded border-violet-300"
            />
            Auto-pay failed only
          </label>
        )}
      </div>

      <div className="coupon-card overflow-hidden">
        {loading ? (
          <CouponLoading />
        ) : displayedRows.length === 0 ? (
          <CouponEmpty message={failedOnly ? 'No auto-pay failures on this page' : 'No redemptions found'} />
        ) : (
          <>
            <table className="coupon-table w-full">
              <thead>
                <tr>
                  <th className="w-10" />
                  <th>Reference</th>
                  <th>Code</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Error</th>
                  <th>Paid via</th>
                  <th>Paid by</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((r) => {
                  const failed = isRazorpayPayoutFailed(r);
                  return (
                  <tr key={r.redemption_id} className={failed ? 'bg-amber-50/60' : undefined}>
                    <td>
                      <button
                        type="button"
                        onClick={() => setViewId(r.redemption_id)}
                        className="p-1.5 rounded-lg text-violet-500 hover:text-violet-800 hover:bg-violet-50 transition"
                        title="View details"
                        aria-label={`View ${r.public_ref}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                    <td>
                      <Link to={`/coupons/redemptions/${r.redemption_id}`} className="font-semibold text-violet-700 hover:underline">
                        {r.public_ref}
                      </Link>
                    </td>
                    <td className="font-mono text-sm">{r.code}</td>
                    <td className="font-semibold">{formatRupees(r.total_amount_paise)}</td>
                    <td><PayoutQueueStatus redemption={r} /></td>
                    <td className="max-w-[180px]">
                      <PayoutErrorText error={failed ? r.last_payout_error : null} />
                    </td>
                    <td className="text-violet-500 text-sm capitalize">{r.paid_via ?? '—'}</td>
                    <td className="max-w-[160px]">
                      {r.payout_status === 'paid' ? (
                        <PaidByText
                          userId={r.paid_by}
                          name={resolveUserName(r.paid_by)}
                          paymentReference={r.payment_reference}
                        />
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="text-violet-400 text-xs whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            <CouponPagination page={page} total={total} limit={50} onPageChange={setPage} />
          </>
        )}
      </div>

      <RedemptionDetailDialog
        redemptionId={viewId}
        onClose={() => setViewId(null)}
        onUpdated={() => {
          setLoading(true);
          couponsAPI
            .getAllRedemptions({
              payoutStatus: payoutStatus || undefined,
              phone: phone || undefined,
              code: code || undefined,
              fromDate: range.fromDate,
              toDate: range.toDate,
              page,
              limit: 50,
            })
            .then((r) => {
              setRows(r.rows);
              setTotal(r.total);
            })
            .finally(() => setLoading(false));
        }}
      />
    </div>
  );
}
