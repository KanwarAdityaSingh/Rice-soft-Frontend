import { useState, useEffect, useCallback } from 'react';
import { kaantasAPI } from '../services/kaantas.api';
import type { Kaanta, CreateKaantaRequest, UpdateKaantaRequest } from '../types/entities';

export function useKaantas(sauda_id?: string, inward_slip_pass_id?: string) {
  const [kaantas, setKaantas] = useState<Kaanta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKaantas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kaantasAPI.getAllKaantas(sauda_id, inward_slip_pass_id);
      setKaantas(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sauda_id, inward_slip_pass_id]);

  useEffect(() => {
    fetchKaantas();
  }, [fetchKaantas]);

  const createKaanta = async (data: CreateKaantaRequest) => {
    try {
      const newKaanta = await kaantasAPI.createKaanta(data);
      await fetchKaantas();
      return newKaanta;
    } catch (err: any) {
      throw err;
    }
  };

  const updateKaanta = async (id: string, data: UpdateKaantaRequest) => {
    try {
      const updatedKaanta = await kaantasAPI.updateKaanta(id, data);
      await fetchKaantas();
      return updatedKaanta;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteKaanta = async (id: string) => {
    try {
      await kaantasAPI.deleteKaanta(id);
      setKaantas(kaantas.filter((k) => k.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    kaantas,
    loading,
    error,
    createKaanta,
    updateKaanta,
    deleteKaanta,
    refetch: fetchKaantas,
  };
}

