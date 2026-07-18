import { useEffect, useState } from 'react';
import { CouponLoading, CouponPagination } from '../../../components/coupons/shared/CouponUi';
import { AnalyticsPageHeader } from '../../../components/coupons/analytics/AnalyticsHub';
import { BatchPerformanceSection } from '../../../components/coupons/analytics/AnalyticsPanels';
import { couponsAnalyticsAPI } from '../../../services/coupons.analytics.api';
import type { BatchPerformanceRow } from '../../../types/coupons';

const PAGE_SIZE = 20;

export default function AnalyticsBatchesPage() {
  const [batches, setBatches] = useState<BatchPerformanceRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    couponsAnalyticsAPI
      .getBatchPerformance({ page, limit: PAGE_SIZE })
      .then((r) => {
        if (!cancelled) {
          setBatches(r.rows);
          setTotal(r.total);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  if (loading && batches.length === 0) return <CouponLoading />;

  return (
    <div className="coupon-page coupon-analytics-page">
      <AnalyticsPageHeader
        badge="Analytics"
        title="Batch performance"
        subtitle="Redemption rates and payout exposure per coupon campaign (all time)"
      />
      {loading && <p className="text-xs text-violet-500 mb-4">Loading batches…</p>}
      <BatchPerformanceSection
        batches={batches}
        page={page}
        total={total}
        limit={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
