import { useCallback, useState } from 'react';
import { riceLengthsAPI } from '../services/riceLengths.api';
import type { CreateRiceLengthRequest, UpdateRiceLengthRequest } from '../services/riceLengths.api';
import type { RiceLengthRecord } from '../types/entities';

export function useRiceLengths() {
  const [riceLengths, setRiceLengths] = useState<RiceLengthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRiceLengths = useCallback(async (includeInactive = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await riceLengthsAPI.getAllRiceLengths(includeInactive);
      setRiceLengths(data);
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load rice lengths';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRiceLength = async (data: CreateRiceLengthRequest) => {
    const created = await riceLengthsAPI.createRiceLength(data);
    await fetchRiceLengths(true);
    return created;
  };

  const updateRiceLength = async (id: string, data: UpdateRiceLengthRequest) => {
    const updated = await riceLengthsAPI.updateRiceLength(id, data);
    await fetchRiceLengths(true);
    return updated;
  };

  const deleteRiceLength = async (id: string) => {
    await riceLengthsAPI.deleteRiceLength(id);
    await fetchRiceLengths(true);
  };

  return {
    riceLengths,
    loading,
    error,
    fetchRiceLengths,
    createRiceLength,
    updateRiceLength,
    deleteRiceLength,
  };
};
