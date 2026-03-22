import { useState, useEffect, useCallback } from 'react';
import { godownsAPI } from '../services/godowns.api';
import type { Godown, CreateGodownRequest, UpdateGodownRequest } from '../types/entities';

export function useGodowns(includeInactive = false) {
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGodowns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await godownsAPI.getAll({ include_inactive: includeInactive });
      setGodowns(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchGodowns();
  }, [fetchGodowns]);

  const createGodown = async (data: CreateGodownRequest) => {
    const created = await godownsAPI.create(data);
    await fetchGodowns();
    return created;
  };

  const updateGodown = async (id: string, data: UpdateGodownRequest) => {
    const updated = await godownsAPI.update(id, data);
    await fetchGodowns();
    return updated;
  };

  const deleteGodown = async (id: string) => {
    await godownsAPI.delete(id);
    await fetchGodowns();
  };

  return {
    godowns,
    loading,
    error,
    refetch: fetchGodowns,
    createGodown,
    updateGodown,
    deleteGodown,
  };
}
