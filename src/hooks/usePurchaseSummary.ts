import { useState, useCallback } from 'react';
import { purchaseSummaryAPI } from '../services/purchaseSummary.api';
import type { SaudaPurchaseSummary, ISPPurchaseSummary } from '../types/entities';

export function usePurchaseSummary() {
  const [saudaSummary, setSaudaSummary] = useState<SaudaPurchaseSummary | null>(null);
  const [ispSummary, setISPSummary] = useState<ISPPurchaseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSaudaSummary = useCallback(async (saudaId: string, igst_percentage?: number, godown_id?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await purchaseSummaryAPI.getSaudaSummary(saudaId, igst_percentage, godown_id);
      setSaudaSummary(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchISPSummary = useCallback(async (ispId: string, igst_percentage?: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await purchaseSummaryAPI.getISPSummary(ispId, igst_percentage);
      setISPSummary(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSummaries = useCallback(() => {
    setSaudaSummary(null);
    setISPSummary(null);
    setError(null);
  }, []);

  return {
    saudaSummary,
    ispSummary,
    loading,
    error,
    fetchSaudaSummary,
    fetchISPSummary,
    clearSummaries,
  };
}

// Hook to fetch multiple summaries for listing
export function usePurchaseSummaryList() {
  const [saudaSummaries, setSaudaSummaries] = useState<SaudaPurchaseSummary[]>([]);
  const [ispSummaries, setISPSummaries] = useState<ISPPurchaseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSaudaSummaries = useCallback(async (saudaIds: string[], igst_percentage?: number, godown_id?: string) => {
    setLoading(true);
    setError(null);
    try {
      const summaries = await Promise.all(
        saudaIds.map(id => purchaseSummaryAPI.getSaudaSummary(id, igst_percentage, godown_id))
      );
      setSaudaSummaries(summaries);
      return summaries;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchISPSummaries = useCallback(async (ispIds: string[], igst_percentage?: number) => {
    setLoading(true);
    setError(null);
    try {
      const summaries = await Promise.all(
        ispIds.map(id => purchaseSummaryAPI.getISPSummary(id, igst_percentage))
      );
      setISPSummaries(summaries);
      return summaries;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    saudaSummaries,
    ispSummaries,
    loading,
    error,
    fetchSaudaSummaries,
    fetchISPSummaries,
  };
}

