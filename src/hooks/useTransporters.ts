import { useState, useEffect, useCallback } from 'react';
import { transportersAPI, type GetAllTransportersOptions } from '../services/transporters.api';
import type { Transporter, CreateTransporterRequest, UpdateTransporterRequest } from '../types/entities';

export function useTransporters(options?: boolean | GetAllTransportersOptions) {
  const includeInactive = typeof options === 'boolean' ? options : options?.includeInactive ?? false;
  const isVerified = typeof options === 'boolean' ? undefined : options?.isVerified;
  const bankVerified = typeof options === 'boolean' ? undefined : options?.bankVerified;
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransporters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await transportersAPI.getAllTransporters({ includeInactive, isVerified, bankVerified });
      setTransporters(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [includeInactive, isVerified, bankVerified]);

  useEffect(() => {
    void fetchTransporters();
  }, [fetchTransporters]);

  const createTransporter = async (data: CreateTransporterRequest) => {
    const result = await transportersAPI.createTransporter(data);
    await fetchTransporters();
    return result;
  };

  const updateTransporter = async (id: string, data: UpdateTransporterRequest) => {
    const result = await transportersAPI.updateTransporter(id, data);
    await fetchTransporters();
    return result;
  };

  const deleteTransporter = async (id: string) => {
    await transportersAPI.deleteTransporter(id);
    await fetchTransporters();
  };

  return {
    transporters,
    loading,
    error,
    createTransporter,
    updateTransporter,
    deleteTransporter,
    refetch: fetchTransporters,
  };
}
