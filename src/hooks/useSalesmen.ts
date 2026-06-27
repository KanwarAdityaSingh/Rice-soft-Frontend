import { useState, useEffect, useCallback } from 'react';
import { salesmenAPI } from '../services/salesmen.api';
import type { Salesman, CreateSalesmanRequest, UpdateSalesmanRequest } from '../types/entities';

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
      setSalesmen(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void fetchSalesmen();
  }, [fetchSalesmen]);

  const createSalesman = async (data: CreateSalesmanRequest) => {
    try {
      const newSalesman = await salesmenAPI.createSalesman(data);
      await fetchSalesmen();
      return newSalesman;
    } catch (err: any) {
      throw err;
    }
  };

  const updateSalesman = async (id: string, data: UpdateSalesmanRequest) => {
    try {
      const updatedSalesman = await salesmenAPI.updateSalesman(id, data);
      setSalesmen((prev) => prev.map((s) => (s.id === id ? updatedSalesman : s)));
      return updatedSalesman;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteSalesman = async (id: string) => {
    try {
      await salesmenAPI.deleteSalesman(id);
      setSalesmen((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    salesmen,
    loading,
    error,
    createSalesman,
    updateSalesman,
    deleteSalesman,
    refetch: fetchSalesmen,
  };
}
