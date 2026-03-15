import { useState, useEffect, useCallback } from 'react';
import { invoiceDispatchesAPI } from '../services/invoiceDispatches.api';
import type {
  InvoiceDispatch,
  CreateInvoiceDispatchRequest,
  InvoiceDispatchStatus,
  EInvoice,
  EWayBill,
  CreateEWayBillRequest,
} from '../types/sales';

interface UseInvoiceDispatchesParams {
  sales_sauda_id?: string;
  status?: InvoiceDispatchStatus;
}

export function useInvoiceDispatches(params?: UseInvoiceDispatchesParams) {
  const [list, setList] = useState<InvoiceDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoiceDispatchesAPI.list(params);
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice dispatches');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [params?.sales_sauda_id, params?.status]);

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
    async (id: string, body?: CreateEWayBillRequest): Promise<EWayBill> => {
      return invoiceDispatchesAPI.generateEWayBill(id, body);
    },
    []
  );

  return {
    invoiceDispatches: list,
    loading,
    error,
    refetch: fetchList,
    getById,
    create,
    confirm,
    getEInvoice,
    getEWayBills,
    generateEInvoice,
    generateEWayBill,
  };
}
