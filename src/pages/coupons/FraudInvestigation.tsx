import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CouponPageHeader,
  CouponLoading,
  CouponEmpty,
  CouponPagination,
} from '../../components/coupons/shared/CouponUi';
import { AnalyticsDateFilter } from '../../components/coupons/analytics/AnalyticsDateFilter';
import { couponsAPI } from '../../services/coupons.api';
import { couponsAnalyticsAPI } from '../../services/coupons.analytics.api';
import { useDatedAnalytics } from '../../hooks/useDatedAnalytics';
import { formatRangeLabel } from '../../utils/analyticsDateFilter';
import type { RedemptionAttempt } from '../../types/coupons';
import { formatDateTime, FAILURE_REASON_LABELS } from '../../utils/couponFormat';

export default function FraudInvestigationPage() {
  const { data: signals, loading: signalsLoading, preset, setPreset, range } = useDatedAnalytics(
    (fromDate, toDate) => couponsAnalyticsAPI.getFraudSignals(fromDate, toDate)
  );
  const rangeLabel = formatRangeLabel(range, preset);
  const [attempts, setAttempts] = useState<RedemptionAttempt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [failureReason, setFailureReason] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    couponsAPI
      .getRedemptionAttempts({
        failureReason: failureReason || undefined,
        code: code || undefined,
        phone: phone || undefined,
        fromDate: range.fromDate,
        toDate: range.toDate,
        page,
        limit: 50,
      })
      .then((r) => {
        setAttempts(r.rows);
        setTotal(r.total);
      })
      .finally(() => setLoading(false));
  }, [failureReason, code, phone, page, range.fromDate, range.toDate, preset]);

  return (
    <div className="coupon-page">
      <CouponPageHeader
        title="Fraud Investigation"
        subtitle="Failed redemption attempts and suspicious activity"
        badge="Security"
      />

      <AnalyticsDateFilter
        preset={preset}
        onPresetChange={(p) => {
          setPreset(p);
          setPage(1);
        }}
        rangeLabel={rangeLabel}
        hint="Applies to fraud signal cards and the failed-attempts table below."
      />
      {signalsLoading && <p className="text-xs text-violet-500 mb-4">Loading fraud signals…</p>}

      {signals && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="coupon-card p-4 text-center">
            <p className="text-3xl font-bold text-rose-600">{signals.failedAttempts}</p>
            <p className="text-xs text-violet-500 uppercase font-semibold">Failed attempts</p>
          </div>
          {Object.entries(signals.failureReasonBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([reason, count]) => (
              <button
                key={reason}
                type="button"
                className="coupon-card p-4 text-center hover:ring-2 hover:ring-violet-200 transition"
                onClick={() => {
                  setFailureReason(reason);
                  setPage(1);
                }}
              >
                <p className="text-2xl font-bold text-violet-800">{count}</p>
                <p className="text-xs text-violet-500">{FAILURE_REASON_LABELS[reason] ?? reason}</p>
              </button>
            ))}
        </div>
      )}

      {signals && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="coupon-card p-4">
            <h4 className="text-sm font-bold text-violet-800 mb-2">Top failed code prefixes</h4>
            <ul className="text-sm space-y-1">
              {signals.topFailedCodes.map((c) => (
                <li key={c.codePrefix} className="flex justify-between">
                  <button type="button" className="font-mono text-violet-700 hover:underline" onClick={() => { setCode(c.codePrefix); setPage(1); }}>
                    {c.codePrefix}…
                  </button>
                  <span>{c.attempts}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="coupon-card p-4">
            <h4 className="text-sm font-bold text-violet-800 mb-2">High-volume phones</h4>
            <ul className="text-sm space-y-1">
              {signals.phonesWithHighRedemptions.map((p) => (
                <li key={p.phone} className="flex justify-between">
                  <Link to={`/coupons/redeemers?phone=${p.phone}`} className="text-violet-700 hover:underline">
                    {p.phone}
                  </Link>
                  <span>{p.count} redeems</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="coupon-card p-4 mb-4 flex flex-wrap gap-3">
        <select className="coupon-select w-48" value={failureReason} onChange={(e) => { setFailureReason(e.target.value); setPage(1); }}>
          <option value="">All failure reasons</option>
          {Object.keys(FAILURE_REASON_LABELS).map((r) => (
            <option key={r} value={r}>{FAILURE_REASON_LABELS[r]}</option>
          ))}
        </select>
        <input className="coupon-input w-32" placeholder="Code prefix" value={code} onChange={(e) => { setCode(e.target.value); setPage(1); }} />
        <input className="coupon-input w-32" placeholder="Phone" value={phone} onChange={(e) => { setPhone(e.target.value); setPage(1); }} />
      </div>

      <div className="coupon-card overflow-hidden">
        {loading ? (
          <CouponLoading />
        ) : attempts.length === 0 ? (
          <CouponEmpty message="No failed attempts match filters" />
        ) : (
          <>
            <table className="coupon-table w-full">
              <thead>
                <tr>
                  <th>Code attempted</th>
                  <th>Phone</th>
                  <th>IP</th>
                  <th>Reason</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.redemption_attempt_id}>
                    <td className="font-mono">{a.code_attempted}</td>
                    <td>{a.phone ?? '—'}</td>
                    <td className="font-mono text-xs">{a.ip ?? '—'}</td>
                    <td>
                      <span className="text-rose-600 text-sm">
                        {FAILURE_REASON_LABELS[a.failure_reason] ?? a.failure_reason}
                      </span>
                    </td>
                    <td className="text-violet-400 text-xs">{formatDateTime(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <CouponPagination page={page} total={total} limit={50} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
