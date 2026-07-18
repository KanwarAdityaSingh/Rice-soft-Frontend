import { Link } from 'react-router-dom';
import { Ticket, TrendingUp, Wallet, Gift, RefreshCw } from 'lucide-react';
import { CouponLoading } from '../../components/coupons/shared/CouponUi';
import { AnalyticsKpi } from '../../components/coupons/analytics/AnalyticsUi';
import { AnalyticsDateFilter } from '../../components/coupons/analytics/AnalyticsDateFilter';
import { AnalyticsHubCards } from '../../components/coupons/analytics/AnalyticsHub';
import {
  CouponLifecycleFunnel,
  PeriodRedemptionStrip,
} from '../../components/coupons/analytics/AnalyticsPanels';
import { couponsAnalyticsAPI } from '../../services/coupons.analytics.api';
import { useDatedAnalytics } from '../../hooks/useDatedAnalytics';
import { formatRupees } from '../../utils/couponFormat';
import { presetLabel, formatRangeLabel } from '../../utils/analyticsDateFilter';

export default function CouponDashboard() {
  const { data: overview, loading, error, preset, setPreset, refetch, range } = useDatedAnalytics(
    (fromDate, toDate) => couponsAnalyticsAPI.getOverview(fromDate, toDate)
  );

  if (loading && !overview) return <CouponLoading />;

  const c = overview?.coupons;
  const p = overview?.payouts;

  return (
    <div className="coupon-page coupon-analytics-page">
      <header className="analytics-hero mb-6">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-violet-700 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Overview
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Coupon Studio</h1>
            <p className="mt-1 text-slate-500 text-sm">
              Inventory & payouts are all-time — period filter applies to redemption totals below.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/coupons/pending-payouts"
              className="coupon-btn-secondary text-sm"
            >
              Pending ({p?.pendingCount ?? 0})
            </Link>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={loading}
              className="coupon-btn-secondary px-3 py-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <AnalyticsDateFilter
        preset={preset}
        onPresetChange={setPreset}
        rangeLabel={formatRangeLabel(range, preset)}
        hint="Filters the period redemption summary. Coupon inventory and payout queue counts are always all-time."
      />

      {error && (
        <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {loading && overview && (
        <p className="text-xs text-violet-500 mb-4">Updating metrics…</p>
      )}

      {overview && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2">
            All-time snapshot
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AnalyticsKpi
              index={0}
              title="Generated"
              value={c?.totalGenerated?.toLocaleString() ?? '0'}
              subtitle={`${c?.allotted?.toLocaleString() ?? 0} allotted`}
              icon={Ticket}
            />
            <AnalyticsKpi
              index={1}
              title="Redemption rate"
              value={`${c?.redemptionRate?.toFixed(1) ?? 0}%`}
              subtitle={`${c?.redeemed?.toLocaleString() ?? 0} redeemed`}
              icon={TrendingUp}
              highlight
            />
            <AnalyticsKpi
              index={2}
              title="Pending payouts"
              value={formatRupees(p?.pendingAmountPaise ?? 0)}
              subtitle={`${p?.pendingCount ?? 0} awaiting`}
              icon={Wallet}
              href="/coupons/pending-payouts"
            />
            <AnalyticsKpi
              index={3}
              title="Settled"
              value={formatRupees(p?.paidAmountPaise ?? 0)}
              subtitle={`${p?.paidCount?.toLocaleString() ?? 0} paid`}
              icon={Gift}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <PeriodRedemptionStrip overview={overview} periodLabel={presetLabel(preset)} />
            <CouponLifecycleFunnel overview={overview} />
          </div>
        </>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-bold text-violet-950">Analytics</h2>
        <p className="text-sm text-violet-500">Explore detailed reports by topic</p>
      </div>
      <AnalyticsHubCards />
    </div>
  );
}
