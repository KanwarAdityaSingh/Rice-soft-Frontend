import { useState, useEffect } from 'react';
import { purchasesAPI } from '../services/purchases.api';
import type { Purchase, CreatePurchaseRequest, UpdatePurchaseRequest } from '../types/entities';

interface UsePurchasesParams {
  vendor_id?: string;
  sauda_id?: string;
}

export function usePurchases(params?: UsePurchasesParams) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await purchasesAPI.getAllPurchases(params);
      // getAllPurchases always returns Purchase[]
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching purchases:', err);
      setError(err.message);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [params?.vendor_id, params?.sauda_id]);

  const createPurchase = async (data: CreatePurchaseRequest) => {
    try {
      const newPurchase = await purchasesAPI.createPurchase(data);
      await fetchPurchases();
      return newPurchase;
    } catch (err: any) {
      throw err;
    }
  };

  const updatePurchase = async (id: string, data: UpdatePurchaseRequest) => {
    try {
      const updatedPurchase = await purchasesAPI.updatePurchase(id, data);
      await fetchPurchases();
      return updatedPurchase;
    } catch (err: any) {
      throw err;
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      await purchasesAPI.deletePurchase(id);
      setPurchases(purchases.filter((p) => p.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    purchases,
    loading,
    error,
    createPurchase,
    updatePurchase,
    deletePurchase,
    refetch: fetchPurchases,
  };
}

