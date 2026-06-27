import { useState, useEffect, useCallback } from 'react';
import { brokersAPI } from '../services/brokers.api';
import type { Broker, CreateBrokerRequest, UpdateBrokerRequest } from '../types/entities';

export interface UseBrokersOptions {
  /** When true, returns active + inactive. Default list is active only. */
  includeInactive?: boolean;
}

export function useBrokers(options?: UseBrokersOptions) {
  const includeInactive = options?.includeInactive ?? false;
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrokers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await brokersAPI.getAllBrokers(includeInactive);
      setBrokers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void fetchBrokers();
  }, [fetchBrokers]);

  const createBroker = async (data: CreateBrokerRequest) => {
    try {
      const result = await brokersAPI.createBroker(data);
      await fetchBrokers();
      return result;
    } catch (err: any) {
      throw err;
    }
  };

  const updateBroker = async (id: string, data: UpdateBrokerRequest) => {
    try {
      const result = await brokersAPI.updateBroker(id, data);
      await fetchBrokers();
      return result;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteBroker = async (id: string) => {
    try {
      await brokersAPI.deleteBroker(id);
      setBrokers((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    brokers,
    loading,
    error,
    createBroker,
    updateBroker,
    deleteBroker,
    refetch: fetchBrokers,
  };
}
