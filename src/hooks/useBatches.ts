import { useState, useEffect } from 'react';
import { batchesAPI } from '../services/batches.api';
import type { Batch, BatchWithDetails, CreateBatchRequest, UpdateBatchRequest } from '../types/entities';

export function useBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await batchesAPI.getAllBatches();
      setBatches(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const createBatch = async (data: CreateBatchRequest) => {
    try {
      const newBatch = await batchesAPI.createBatch(data);
      await fetchBatches();
      return newBatch;
    } catch (err: any) {
      throw err;
    }
  };

  const updateBatch = async (id: string, data: UpdateBatchRequest) => {
    try {
      const updatedBatch = await batchesAPI.updateBatch(id, data);
      setBatches(batches.map((b) => (b.id === id ? updatedBatch : b)));
      return updatedBatch;
    } catch (err: any) {
      throw err;
    }
  };

  const getBatchDetails = async (id: string) => {
    try {
      return await batchesAPI.getBatchById(id);
    } catch (err: any) {
      throw err;
    }
  };

  const deleteBatch = async (id: string) => {
    try {
      await batchesAPI.deleteBatch(id);
      await fetchBatches();
    } catch (err: any) {
      throw err;
    }
  };

  return {
    batches,
    loading,
    error,
    createBatch,
    updateBatch,
    getBatchDetails,
    deleteBatch,
    refetch: fetchBatches,
  };
}

