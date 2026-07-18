import { Link } from 'react-router-dom';
import { CouponLoading } from '../../../components/coupons/shared/CouponUi';
import { AnalyticsDateFilter } from '../../../components/coupons/analytics/AnalyticsDateFilter';
import { AnalyticsPageHeader } from '../../../components/coupons/analytics/AnalyticsHub';
import { RulePerformanceSection } from '../../../components/coupons/analytics/AnalyticsPanels';
import { couponsAnalyticsAPI } from '../../../services/coupons.analytics.api';
import { useDatedAnalytics } from '../../../hooks/useDatedAnalytics';
import { formatRangeLabel } from '../../../utils/analyticsDateFilter';

export default function AnalyticsRulesPage() {
  const { data, loading, preset, setPreset, range } = useDatedAnalytics((fromDate, toDate) =>
    couponsAnalyticsAPI.getPromotionRulePerformance(fromDate, toDate)
  );

  if (loading && !data) return <CouponLoading />;

  return (
    <div className="coupon-page coupon-analytics-page">
      <AnalyticsPageHeader
        badge="Analytics"
        title="Rule performance"
        subtitle="How often each promotion rule fires and total bonus paid"
      />
      <Link to="/coupons/rules" className="coupon-btn-secondary text-sm mb-4 inline-block">
        Manage rules →
      </Link>
      <AnalyticsDateFilter
        preset={preset}
        onPresetChange={setPreset}
        rangeLabel={formatRangeLabel(range, preset)}
        hint="Application counts and bonus totals within the selected period."
      />
      {loading && <p className="text-xs text-violet-500 mb-4">Loading rules…</p>}
      <RulePerformanceSection rules={data?.rules ?? []} />
    </div>
  );
}
