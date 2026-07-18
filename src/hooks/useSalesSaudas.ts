import { useState, useEffect, useCallback, useRef } from 'react';
import { salesSaudasAPI } from '../services/salesSaudas.api';
import type {
  SalesSauda,
  CreateSalesSaudaRequest,
  UpdateSalesSaudaRequest,
  SalesSaudaStatus,
} from '../types/sales';

interface UseSalesSaudasParams {
  sales_party_id?: string;
  status?: SalesSaudaStatus;
  financial_year?: string;
}

export function useSalesSaudas(params?: UseSalesSaudasParams) {
  const [list, setList] = useState<SalesSauda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedParamsRef = useRef<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesSaudasAPI.list(params);
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales saudas');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [params?.sales_party_id, params?.status, params?.financial_year]);

  const paramsKey = `${params?.sales_party_id ?? ''}:${params?.status ?? ''}:${params?.financial_year ?? ''}`;

  useEffect(() => {
    if (lastFetchedParamsRef.current === paramsKey) return;
    lastFetchedParamsRef.current = paramsKey;
    fetchList();
  }, [fetchList, paramsKey]);

  const getById = useCallback(async (id: string) => {
    return salesSaudasAPI.getById(id);
  }, []);

  const create = useCallback(async (data: CreateSalesSaudaRequest) => {
    const created = await salesSaudasAPI.create(data);
    await fetchList();
    return created;
  }, [fetchList]);

  const update = useCallback(async (id: string, data: UpdateSalesSaudaRequest) => {
    const updated = await salesSaudasAPI.update(id, data);
    await fetchList();
    return updated;
  }, [fetchList]);

  const finalize = useCallback(async (id: string) => {
    const updated = await salesSaudasAPI.finalize(id);
    await fetchList();
    return updated;
  }, [fetchList]);

  const remove = useCallback(async (id: string) => {
    await salesSaudasAPI.delete(id);
    setList((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    salesSaudas: list,
    loading,
    error,
    refetch: fetchList,
    getById,
    create,
    update,
    finalize,
    deleteSauda: remove,
  };
}
