import { useState, useEffect, useCallback } from 'react';
import { salesmenAPI } from '../services/salesmen.api';
import type {
  Salesman,
  CreateSalesmanRequest,
  UpdateSalesmanRequest,
  SalesmanSalaryHistoryEntry,
} from '../types/entities';

export interface UseSalesmenOptions {
  /** When true, returns active + inactive. Default list is active only. */
  includeInactive?: boolean;
}

export function useSalesmen(options?: UseSalesmenOptions) {
  const includeInactive = options?.includeInactive ?? false;
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesmen = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesmenAPI.getAllSalesmen(includeInactive);
      setSalesmen(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
      setSalesmen([]);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void fetchSalesmen();
  }, [fetchSalesmen]);

  const createSalesman = async (data: CreateSalesmanRequest) => {
    const result = await salesmenAPI.createSalesman(data);
    await fetchSalesmen();
    return result;
  };

  const updateSalesman = async (id: string, data: UpdateSalesmanRequest) => {
    const result = await salesmenAPI.updateSalesman(id, data);
    setSalesmen((prev) => prev.map((s) => (s.id === id ? result.salesman : s)));
    return result;
  };

  const deleteSalesman = async (id: string) => {
    await salesmenAPI.deleteSalesman(id);
    setSalesmen((prev) => prev.filter((s) => s.id !== id));
  };

  const getSalaryHistory = async (id: string): Promise<SalesmanSalaryHistoryEntry[]> => {
    const data = await salesmenAPI.getSalaryHistory(id);
    return Array.isArray(data) ? data : [];
  };

  const confirmBankVerification = async (id: string) => {
    const updated = await salesmenAPI.confirmBankVerification(id);
    setSalesmen((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  return {
    salesmen,
    loading,
    error,
    createSalesman,
    updateSalesman,
    deleteSalesman,
    getSalaryHistory,
    confirmBankVerification,
    refetch: fetchSalesmen,
  };
}
