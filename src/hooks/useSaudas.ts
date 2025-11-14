import { useState, useEffect } from 'react';
import { saudasAPI } from '../services/saudas.api';
import type { Sauda, CreateSaudaRequest, UpdateSaudaRequest, SaudaStatus } from '../types/entities';

interface UseSaudasParams {
  include_inactive?: boolean;
  status?: SaudaStatus;
  sauda_type?: 'xgodown' | 'for';
  purchaser_id?: string;
}

export function useSaudas(params?: UseSaudasParams) {
  const [saudas, setSaudas] = useState<Sauda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSaudas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await saudasAPI.getAllSaudas(params);
      setSaudas(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaudas();
  }, [params?.include_inactive, params?.status, params?.sauda_type, params?.purchaser_id]);

  const createSauda = async (data: CreateSaudaRequest) => {
    try {
      const newSauda = await saudasAPI.createSauda(data);
      await fetchSaudas();
      return newSauda;
    } catch (err: any) {
      throw err;
    }
  };

  const updateSauda = async (id: string, data: UpdateSaudaRequest) => {
    try {
      const updatedSauda = await saudasAPI.updateSauda(id, data);
      await fetchSaudas();
      return updatedSauda;
    } catch (err: any) {
      throw err;
    }
  };

  const updateSaudaStatus = async (id: string, status: SaudaStatus) => {
    try {
      const updatedSauda = await saudasAPI.updateSaudaStatus(id, status);
      await fetchSaudas();
      return updatedSauda;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteSauda = async (id: string) => {
    try {
      await saudasAPI.deleteSauda(id);
      setSaudas(saudas.filter((s) => s.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    saudas,
    loading,
    error,
    createSauda,
    updateSauda,
    updateSaudaStatus,
    deleteSauda,
    refetch: fetchSaudas,
  };
}

