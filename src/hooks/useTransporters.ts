import { useState, useEffect } from 'react';
import { transportersAPI } from '../services/transporters.api';
import type { Transporter, CreateTransporterRequest, UpdateTransporterRequest } from '../types/entities';

export function useTransporters(includeInactive: boolean = false) {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransporters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await transportersAPI.getAllTransporters(includeInactive);
      setTransporters(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransporters();
  }, [includeInactive]);

  const createTransporter = async (data: CreateTransporterRequest) => {
    try {
      const newTransporter = await transportersAPI.createTransporter(data);
      await fetchTransporters();
      return newTransporter;
    } catch (err: any) {
      throw err;
    }
  };

  const updateTransporter = async (id: string, data: UpdateTransporterRequest) => {
    try {
      const updatedTransporter = await transportersAPI.updateTransporter(id, data);
      await fetchTransporters();
      return updatedTransporter;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteTransporter = async (id: string) => {
    try {
      await transportersAPI.deleteTransporter(id);
      setTransporters(transporters.filter((t) => t.id !== id));
    } catch (err: any) {
      throw err;
    }
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

