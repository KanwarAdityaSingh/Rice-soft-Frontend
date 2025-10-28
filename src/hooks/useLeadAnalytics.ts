import { useState, useEffect } from 'react';
import { leadsAPI } from '../services/leads.api';
import type { LeadAnalytics } from '../types/entities';

export function useLeadAnalytics() {
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadsAPI.getLeadAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const conversionRate = analytics?.stats
    ? ((analytics.stats.converted_leads / analytics.stats.total_leads) * 100).toFixed(1)
    : '0';

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
    metrics: {
      conversionRate,
    },
  };
}

