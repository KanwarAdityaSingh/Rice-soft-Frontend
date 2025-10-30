import { useState, useEffect } from 'react';
import { riceCodesAPI } from '../services/riceCodes.api';
import type { CreateRiceCodeRequest, UpdateRiceCodeRequest } from '../services/riceCodes.api';
import type { RiceCode } from '../types/entities';

export function useRiceCodes() {
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRiceCodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await riceCodesAPI.getAllRiceCodes();
      setRiceCodes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiceCodes();
  }, []);

  const createRiceCode = async (data: CreateRiceCodeRequest) => {
    try {
      const newRiceCode = await riceCodesAPI.createRiceCode(data);
      // Refetch to ensure we have the latest data from server
      await fetchRiceCodes();
      return newRiceCode;
    } catch (err: any) {
      throw err;
    }
  };

  const updateRiceCode = async (id: string, data: UpdateRiceCodeRequest) => {
    try {
      const updatedRiceCode = await riceCodesAPI.updateRiceCode(id, data);
      // Refetch to ensure we have the latest data from server
      await fetchRiceCodes();
      return updatedRiceCode;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteRiceCode = async (id: string) => {
    try {
      await riceCodesAPI.deleteRiceCode(id);
      // Refetch to ensure we have the latest data from server
      await fetchRiceCodes();
    } catch (err: any) {
      throw err;
    }
  };

  return {
    riceCodes,
    loading,
    error,
    createRiceCode,
    updateRiceCode,
    deleteRiceCode,
    refetch: fetchRiceCodes,
  };
}

