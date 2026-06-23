import { useState, useEffect, useCallback } from 'react';
import { transportersAPI, type GetAllTransportersOptions } from '../services/transporters.api';
import type { Transporter, CreateTransporterRequest, UpdateTransporterRequest } from '../types/entities';

export function useTransporters(options?: boolean | GetAllTransportersOptions) {
  const includeInactive = typeof options === 'boolean' ? options : options?.includeInactive ?? false;
  const isVerified = typeof options === 'boolean' ? undefined : options?.isVerified;
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransporters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await transportersAPI.getAllTransporters({ includeInactive, isVerified });
      setTransporters(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [includeInactive, isVerified]);

  useEffect(() => {
    void fetchTransporters();
  }, [fetchTransporters]);

  const createTransporter = async (data: CreateTransporterRequest) => {
    const newTransporter = await transportersAPI.createTransporter(data);
    await fetchTransporters();
    return newTransporter;
  };

  const updateTransporter = async (id: string, data: UpdateTransporterRequest) => {
    const updatedTransporter = await transportersAPI.updateTransporter(id, data);
    await fetchTransporters();
    return updatedTransporter;
  };

  const deleteTransporter = async (id: string) => {
    await transportersAPI.deactivateTransporter(id);
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
