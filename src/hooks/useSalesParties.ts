import { useState, useEffect, useRef } from 'react';
import { salesPartiesAPI } from '../services/salesParties.api';
import type { SalesParty, CreateSalesPartyRequest, UpdateSalesPartyRequest } from '../types/entities';

export function useSalesParties() {
  const [salesParties, setSalesParties] = useState<SalesParty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialFetchDone = useRef(false);

  const fetchSalesParties = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesPartiesAPI.getAll();
      // Handle both raw array and wrapped { data: [...] } from backend
      const list = Array.isArray(data) ? data : (data as any)?.data;
      setSalesParties(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.message);
      setSalesParties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    fetchSalesParties();
  }, []);

  const createSalesParty = async (data: CreateSalesPartyRequest) => {
    try {
      const created = await salesPartiesAPI.create(data);
      await fetchSalesParties();
      return created;
    } catch (err: any) {
      throw err;
    }
  };

  const updateSalesParty = async (id: string, data: UpdateSalesPartyRequest) => {
    try {
      const updated = await salesPartiesAPI.update(id, data);
      await fetchSalesParties();
      return updated;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteSalesParty = async (id: string) => {
    try {
      await salesPartiesAPI.delete(id);
      setSalesParties((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    salesParties,
    loading,
    error,
    createSalesParty,
    updateSalesParty,
    deleteSalesParty,
    refetch: fetchSalesParties,
  };
}
