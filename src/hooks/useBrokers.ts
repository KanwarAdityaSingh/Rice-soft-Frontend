import { useState, useEffect } from 'react';
import { brokersAPI } from '../services/brokers.api';
import type { Broker, CreateBrokerRequest, UpdateBrokerRequest } from '../types/entities';

export function useBrokers() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Toast removed for now

  const fetchBrokers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await brokersAPI.getAllBrokers();
      setBrokers(data);
    } catch (err: any) {
      setError(err.message);
      // showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokers();
  }, []);

  const createBroker = async (data: CreateBrokerRequest) => {
    try {
      const newBroker = await brokersAPI.createBroker(data);
      // Refetch all brokers to ensure we have the latest data from the server
      await fetchBrokers();
      return newBroker;
    } catch (err: any) {
      // showError(err.message || 'Failed to create broker');
      throw err;
    }
  };

  const updateBroker = async (id: string, data: UpdateBrokerRequest) => {
    try {
      const updatedBroker = await brokersAPI.updateBroker(id, data);
      setBrokers(brokers.map((b) => (b.id === id ? updatedBroker : b)));
      // success('Broker updated successfully');
      return updatedBroker;
    } catch (err: any) {
      // showError(err.message || 'Failed to update broker');
      throw err;
    }
  };

  const deleteBroker = async (id: string) => {
    try {
      await brokersAPI.deleteBroker(id);
      setBrokers(brokers.filter((b) => b.id !== id));
      // success('Broker deleted successfully');
    } catch (err: any) {
      // showError(err.message || 'Failed to delete broker');
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

