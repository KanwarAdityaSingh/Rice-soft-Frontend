import { useState, useEffect } from 'react';
import { batchesAPI } from '../services/batches.api';
import type {
  Batch,
  BatchWithDetails,
  CreateBatchRequest,
  UpdateBatchRequest,
  BatchProduct,
  BatchPackaging,
  AttachBatchProductRequest,
} from '../types/entities';

export function useBatches(godown_id?: string) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await batchesAPI.getAllBatches(godown_id);
      // Sort by created_at descending (latest first)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      setBatches(sorted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [godown_id]);

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

  // Batch Products (Stage 2)
  const addProductToBatch = async (batchId: string, data: AttachBatchProductRequest) => {
    try {
      const response = await batchesAPI.addProductToBatch(batchId, data);
      await fetchBatches();
      return response;
    } catch (err: any) {
      throw err;
    }
  };

  const getBatchProducts = async (batchId: string) => {
    try {
      return await batchesAPI.getBatchProducts(batchId);
    } catch (err: any) {
      throw err;
    }
  };

  const removeProductFromBatch = async (batchId: string, productId: string) => {
    try {
      await batchesAPI.removeProductFromBatch(batchId, productId);
      await fetchBatches();
    } catch (err: any) {
      throw err;
    }
  };

  // Batch Packaging (Stage 3)
  const addPackagingToBatch = async (batchId: string, productId: string, packagingId: string, quantity: number) => {
    try {
      await batchesAPI.addPackagingToBatch(batchId, { product_id: productId, packaging_id: packagingId, quantity });
      await fetchBatches();
    } catch (err: any) {
      throw err;
    }
  };

  const getBatchPackaging = async (batchId: string, productId?: string) => {
    try {
      return await batchesAPI.getBatchPackaging(batchId, productId);
    } catch (err: any) {
      throw err;
    }
  };

  const removePackagingFromBatch = async (batchId: string, packagingId: string) => {
    try {
      await batchesAPI.removePackagingFromBatch(batchId, packagingId);
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
    addProductToBatch,
    getBatchProducts,
    removeProductFromBatch,
    addPackagingToBatch,
    getBatchPackaging,
    removePackagingFromBatch,
    refetch: fetchBatches,
  };
}

