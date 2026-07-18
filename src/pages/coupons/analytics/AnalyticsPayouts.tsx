import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CouponLoading } from '../../../components/coupons/shared/CouponUi';
import { AnalyticsPageHeader } from '../../../components/coupons/analytics/AnalyticsHub';
import { PayoutBreakdownChart } from '../../../components/coupons/analytics/AnalyticsPanels';
import { couponsAnalyticsAPI } from '../../../services/coupons.analytics.api';
import type { PayoutSummary } from '../../../types/coupons';
import { formatRupees } from '../../../utils/couponFormat';

export default function AnalyticsPayoutsPage() {
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    couponsAnalyticsAPI.getPayoutSummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  if (loading) return <CouponLoading />;

  return (
    <div className="coupon-page coupon-analytics-page">
      <AnalyticsPageHeader
        badge="Analytics"
        title="Payout analytics"
        subtitle="Settlement breakdown — pending, manual, and Razorpay"
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="coupon-card p-5 text-center">
          <p className="text-xs font-bold uppercase text-amber-600">Pending</p>
          <p className="text-3xl font-bold text-violet-950 mt-1">
            {formatRupees(summary?.pending.amountPaise ?? 0)}
          </p>
          <p className="text-sm text-violet-500">{summary?.pending.count ?? 0} redemptions</p>
          <Link to="/coupons/pending-payouts" className="coupon-btn-primary text-xs mt-3 inline-block">
            Process queue →
          </Link>
        </div>
        <div className="coupon-card p-5 text-center">
          <p className="text-xs font-bold uppercase text-emerald-600">Paid (manual)</p>
          <p className="text-3xl font-bold text-violet-950 mt-1">
            {formatRupees(summary?.paidManual.amountPaise ?? 0)}
          </p>
          <p className="text-sm text-violet-500">{summary?.paidManual.count ?? 0} settlements</p>
        </div>
        <div className="coupon-card p-5 text-center">
          <p className="text-xs font-bold uppercase text-violet-600">Paid (Razorpay)</p>
          <p className="text-3xl font-bold text-violet-950 mt-1">
            {formatRupees(summary?.paidRazorpay.amountPaise ?? 0)}
          </p>
          <p className="text-sm text-violet-500">
            {summary?.razorpayFailedAttempts ?? 0} failed attempts
          </p>
          {(summary?.razorpayFailedAttempts ?? 0) > 0 && (
            <Link
              to="/coupons/pending-payouts?failedOnly=1"
              className="text-xs text-amber-700 hover:underline mt-2 inline-block font-semibold"
            >
              View auto-pay failures →
            </Link>
          )}
          <Link to="/coupons/settings" className="text-xs text-violet-600 hover:underline mt-3 inline-block">
            Payout settings →
          </Link>
        </div>
      </div>

      {summary && (
        <div className="max-w-md">
          <PayoutBreakdownChart summary={summary} />
        </div>
      )}
    </div>
  );
}
