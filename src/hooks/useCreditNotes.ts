import { useState, useEffect, useCallback } from 'react';
import { creditNotesAPI } from '../services/creditNotes.api';
import type {
  CreditNote,
  CreateCreditNoteRequest,
  CreditNoteStatus,
} from '../types/sales';

interface UseCreditNotesParams {
  invoice_dispatch_id?: string;
  status?: CreditNoteStatus;
  financial_year?: string;
}

export function useCreditNotes(params?: UseCreditNotesParams) {
  const [list, setList] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await creditNotesAPI.list(params);
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch credit notes');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [params?.invoice_dispatch_id, params?.status, params?.financial_year]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const getById = useCallback(async (id: string) => {
    return creditNotesAPI.getById(id);
  }, []);

  const create = useCallback(async (data: CreateCreditNoteRequest) => {
    const created = await creditNotesAPI.create(data);
    await fetchList();
    return created;
  }, [fetchList]);

  const confirm = useCallback(async (id: string) => {
    const updated = await creditNotesAPI.confirm(id);
    await fetchList();
    return updated;
  }, [fetchList]);

  return {
    creditNotes: list,
    loading,
    error,
    refetch: fetchList,
    getById,
    create,
    confirm,
  };
}
