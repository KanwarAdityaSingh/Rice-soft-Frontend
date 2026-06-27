import { useState, useEffect, useCallback } from 'react';
import { salesPartiesAPI, type GetAllSalesPartiesOptions } from '../services/salesParties.api';
import type { SalesParty, CreateSalesPartyRequest, UpdateSalesPartyRequest } from '../types/entities';

export type UseSalesPartiesOptions = GetAllSalesPartiesOptions;

export function useSalesParties(options: UseSalesPartiesOptions = {}) {
  const { includeInactive = false, registrationType, isVerified } = options;
  const [salesParties, setSalesParties] = useState<SalesParty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesParties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesPartiesAPI.getAll({
        includeInactive,
        registrationType,
        isVerified,
      });
      const list = Array.isArray(data) ? data : (data as { data?: SalesParty[] })?.data;
      setSalesParties(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.message);
      setSalesParties([]);
    } finally {
      setLoading(false);
    }
  }, [includeInactive, registrationType, isVerified]);

  useEffect(() => {
    void fetchSalesParties();
  }, [fetchSalesParties]);

  const createSalesParty = async (data: CreateSalesPartyRequest) => {
    const created = await salesPartiesAPI.create(data);
    await fetchSalesParties();
    return created;
  };

  const updateSalesParty = async (id: string, data: UpdateSalesPartyRequest) => {
    const updated = await salesPartiesAPI.update(id, data);
    await fetchSalesParties();
    return updated;
  };

  const deleteSalesParty = async (id: string) => {
    await salesPartiesAPI.delete(id);
    setSalesParties((prev) => prev.filter((s) => s.id !== id));
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
