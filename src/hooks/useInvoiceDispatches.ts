import { useState, useEffect, useCallback } from 'react';
import { invoiceDispatchesAPI } from '../services/invoiceDispatches.api';
import type {
  InvoiceDispatch,
  CreateInvoiceDispatchRequest,
  PatchInvoiceDispatchRequest,
  InvoiceDispatchStatus,
  EInvoice,
  EWayBill,
  CreateEWayBillRequest,
} from '../types/sales';

interface UseInvoiceDispatchesParams {
  sales_sauda_id?: string;
  status?: InvoiceDispatchStatus;
  godown_id?: string;
  financial_year?: string;
}

export function useInvoiceDispatches(params?: UseInvoiceDispatchesParams) {
  const [list, setList] = useState<InvoiceDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoiceDispatchesAPI.list({
        sales_sauda_id: params?.sales_sauda_id,
        status: params?.status,
        godown_id: params?.godown_id,
        financial_year: params?.financial_year,
      });
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice dispatches');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [params?.sales_sauda_id, params?.status, params?.godown_id, params?.financial_year]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const getById = useCallback(async (id: string) => {
    return invoiceDispatchesAPI.getById(id);
  }, []);

  const create = useCallback(async (data: CreateInvoiceDispatchRequest) => {
    const created = await invoiceDispatchesAPI.create(data);
    await fetchList();
    return created;
  }, [fetchList]);

  const patch = useCallback(
    async (id: string, data: PatchInvoiceDispatchRequest) => {
      const updated = await invoiceDispatchesAPI.patch(id, data);
      await fetchList();
      return updated;
    },
    [fetchList]
  );

  const confirm = useCallback(async (id: string) => {
    const updated = await invoiceDispatchesAPI.confirm(id);
    await fetchList();
    return updated;
  }, [fetchList]);

  const getEInvoice = useCallback(async (id: string): Promise<EInvoice | null> => {
    return invoiceDispatchesAPI.getEInvoice(id);
  }, []);

  const getEWayBills = useCallback(async (id: string): Promise<EWayBill[]> => {
    return invoiceDispatchesAPI.getEWayBills(id);
  }, []);

  const generateEInvoice = useCallback(async (id: string): Promise<EInvoice> => {
    return invoiceDispatchesAPI.generateEInvoice(id);
  }, []);

  const generateEWayBill = useCallback(
    async (
      id: string,
      options?: { body?: CreateEWayBillRequest; force?: boolean }
    ): Promise<EWayBill> => {
      return invoiceDispatchesAPI.generateEWayBill(id, options);
    },
    []
  );

  const uploadBilti = useCallback(async (id: string, file: File) => {
    const result = await invoiceDispatchesAPI.uploadBilti(id, file);
    await fetchList();
    return result;
  }, [fetchList]);

  return {
    invoiceDispatches: list,
    loading,
    error,
    refetch: fetchList,
    getById,
    create,
    patch,
    confirm,
    uploadBilti,
    getEInvoice,
    getEWayBills,
    generateEInvoice,
    generateEWayBill,
  };
}
