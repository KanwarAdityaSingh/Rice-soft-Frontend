import { useEffect, useState } from 'react';
import { CouponLoading } from '../../../components/coupons/shared/CouponUi';
import { AnalyticsPageHeader } from '../../../components/coupons/analytics/AnalyticsHub';
import { RedeemerLeaderboardSection } from '../../../components/coupons/analytics/AnalyticsPanels';
import { couponsAnalyticsAPI } from '../../../services/coupons.analytics.api';
import type { RedeemerLeaderboardEntry } from '../../../types/coupons';

export default function AnalyticsLeaderboardPage() {
  const [sortBy, setSortBy] = useState<'count' | 'amount'>('count');
  const [entries, setEntries] = useState<RedeemerLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    couponsAnalyticsAPI
      .getRedeemerLeaderboard(25, sortBy)
      .then((r) => {
        if (!cancelled) setEntries(r.redeemers ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sortBy]);

  if (loading && entries.length === 0) return <CouponLoading />;

  return (
    <div className="coupon-page coupon-analytics-page max-w-3xl">
      <AnalyticsPageHeader
        badge="Analytics"
        title="Redeemer leaderboard"
        subtitle="Top customers by lifetime redemption count or earnings (all time)"
      />
      {loading && <p className="text-xs text-violet-500 mb-4">Loading leaderboard…</p>}
      <RedeemerLeaderboardSection
        entries={entries}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
    </div>
  );
}
