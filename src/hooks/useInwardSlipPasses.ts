import { useState, useEffect } from 'react';
import { inwardSlipPassesAPI } from '../services/inwardSlipPasses.api';
import type { InwardSlipPass, CreateInwardSlipPassRequest, UpdateInwardSlipPassRequest } from '../types/entities';

export function useInwardSlipPasses(sauda_id?: string) {
  const [inwardSlipPasses, setInwardSlipPasses] = useState<InwardSlipPass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInwardSlipPasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inwardSlipPassesAPI.getAllInwardSlipPasses(sauda_id);
      setInwardSlipPasses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInwardSlipPasses();
  }, [sauda_id]);

  const createInwardSlipPass = async (data: CreateInwardSlipPassRequest) => {
    try {
      const newISP = await inwardSlipPassesAPI.createInwardSlipPass(data);
      await fetchInwardSlipPasses();
      return newISP;
    } catch (err: any) {
      throw err;
    }
  };

  const updateInwardSlipPass = async (id: string, data: UpdateInwardSlipPassRequest) => {
    try {
      const updatedISP = await inwardSlipPassesAPI.updateInwardSlipPass(id, data);
      await fetchInwardSlipPasses();
      return updatedISP;
    } catch (err: any) {
      throw err;
    }
  };

  const updateInwardSlipPassStatus = async (id: string, status: 'pending' | 'completed') => {
    try {
      const updatedISP = await inwardSlipPassesAPI.updateInwardSlipPassStatus(id, status);
      await fetchInwardSlipPasses();
      return updatedISP;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteInwardSlipPass = async (id: string) => {
    try {
      await inwardSlipPassesAPI.deleteInwardSlipPass(id);
      setInwardSlipPasses(inwardSlipPasses.filter((isp) => isp.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    inwardSlipPasses,
    loading,
    error,
    createInwardSlipPass,
    updateInwardSlipPass,
    updateInwardSlipPassStatus,
    deleteInwardSlipPass,
    refetch: fetchInwardSlipPasses,
  };
}

