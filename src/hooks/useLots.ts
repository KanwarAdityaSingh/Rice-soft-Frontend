import { useState, useEffect } from 'react';
import { lotsAPI } from '../services/lots.api';
import type { Lot, CreateLotRequest, UpdateLotRequest } from '../types/entities';

export function useLots(sauda_id?: string) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLots = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await lotsAPI.getAllLots(sauda_id);
      setLots(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, [sauda_id]);

  const createLot = async (data: CreateLotRequest) => {
    try {
      const newLot = await lotsAPI.createLot(data);
      await fetchLots();
      return newLot;
    } catch (err: any) {
      throw err;
    }
  };

  const updateLot = async (id: string, data: UpdateLotRequest) => {
    try {
      const updatedLot = await lotsAPI.updateLot(id, data);
      await fetchLots();
      return updatedLot;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteLot = async (id: string) => {
    try {
      await lotsAPI.deleteLot(id);
      setLots(lots.filter((l) => l.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    lots,
    loading,
    error,
    createLot,
    updateLot,
    deleteLot,
    refetch: fetchLots,
  };
}

