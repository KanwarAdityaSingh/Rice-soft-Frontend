import { useCallback, useEffect, useState } from 'react';
import { useAnalyticsPreset } from '../components/coupons/analytics/AnalyticsDateFilter';

export function useDatedAnalytics<T>(
  fetcher: (fromDate?: string, toDate?: string) => Promise<T>,
  extraDeps: unknown[] = []
) {
  const { preset, range, setPreset } = useAnalyticsPreset();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(range.fromDate, range.toDate);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetcher, range.fromDate, range.toDate]);

  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.fromDate, range.toDate, preset, ...extraDeps]);

  return { data, loading, error, preset, setPreset, refetch, range };
}
