import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CouponPageHeader,
  CouponLoading,
  CouponStatCard,
} from '../../components/coupons/shared/CouponUi';
import { couponsAnalyticsAPI } from '../../services/coupons.analytics.api';
import type { PayoutSummary } from '../../types/coupons';
import { formatRupees } from '../../utils/couponFormat';
import { Wallet, CreditCard, AlertCircle } from 'lucide-react';

export default function CouponSettingsPage() {
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    couponsAnalyticsAPI.getPayoutSummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  if (loading) return <CouponLoading />;

  return (
    <div className="coupon-page">
      <CouponPageHeader
        title="Coupon Settings"
        subtitle="Razorpay payout operations and system configuration"
        badge="Phase 3"
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <CouponStatCard
          title="Pending payouts"
          value={summary?.pending.count ?? 0}
          subtitle={formatRupees(summary?.pending.amountPaise ?? 0)}
          icon={Wallet}
          variant="coral"
        />
        <CouponStatCard
          title="Paid (manual)"
          value={summary?.paidManual.count ?? 0}
          subtitle={formatRupees(summary?.paidManual.amountPaise ?? 0)}
          icon={CreditCard}
          variant="mint"
        />
        <CouponStatCard
          title="Paid (Razorpay)"
          value={summary?.paidRazorpay.count ?? 0}
          subtitle={formatRupees(summary?.paidRazorpay.amountPaise ?? 0)}
          icon={CreditCard}
          variant="violet"
        />
      </div>

      <div className="coupon-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-violet-900">Razorpay auto-payout</h3>
            <p className="text-sm text-violet-600 mt-1">
              Razorpay payouts are controlled server-side via <code className="text-xs bg-violet-50 px-1 rounded">COUPON_PAYOUT_ENABLED</code>.
              When enabled, failed payouts appear in the pending queue with an error badge.
            </p>
            <p className="text-sm text-violet-500 mt-2">
              Failed Razorpay attempts: <strong>{summary?.razorpayFailedAttempts ?? 0}</strong>
            </p>
            <Link to="/coupons/pending-payouts" className="coupon-btn-primary inline-block mt-4 text-sm">
              Go to pending payouts →
            </Link>
          </div>
        </div>
      </div>

      <div className="coupon-card p-6 mt-6">
        <h3 className="font-bold text-violet-900 mb-2">Retry failed payouts</h3>
        <p className="text-sm text-violet-600">
          For redemptions with <code className="text-xs bg-violet-50 px-1 rounded">last_payout_error</code>,
          use the <strong>Retry Razorpay</strong> button on the redemption detail page,
          or mark paid manually after paying via UPI/bank.
        </p>
      </div>
    </div>
  );
}
