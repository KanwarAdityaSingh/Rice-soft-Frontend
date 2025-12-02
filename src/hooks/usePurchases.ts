import { useState, useEffect } from 'react';
import { purchasesAPI } from '../services/purchases.api';
import type { 
  Purchase, 
  CreatePurchaseRequest, 
  UpdatePurchaseRequest,
  LinkedEntitiesResponse,
  LinkSaudasRequest,
  LinkInwardSlipPassesRequest,
  LinkLotsRequest
} from '../types/entities';

export function usePurchases(vendor_id?: string) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await purchasesAPI.getAllPurchases(vendor_id);
      setPurchases(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [vendor_id]);

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

  const linkSaudas = async (id: string, data: LinkSaudasRequest) => {
    try {
      await purchasesAPI.linkSaudas(id, data);
      await fetchPurchases();
    } catch (err: any) {
      throw err;
    }
  };

  const linkInwardSlipPasses = async (id: string, data: LinkInwardSlipPassesRequest) => {
    try {
      await purchasesAPI.linkInwardSlipPasses(id, data);
      await fetchPurchases();
    } catch (err: any) {
      throw err;
    }
  };

  const linkLots = async (id: string, data: LinkLotsRequest) => {
    try {
      await purchasesAPI.linkLots(id, data);
      await fetchPurchases();
    } catch (err: any) {
      throw err;
    }
  };

  const unlinkSauda = async (id: string, saudaId: string) => {
    try {
      await purchasesAPI.unlinkSauda(id, saudaId);
      await fetchPurchases();
    } catch (err: any) {
      throw err;
    }
  };

  const unlinkInwardSlipPass = async (id: string, ispId: string) => {
    try {
      await purchasesAPI.unlinkInwardSlipPass(id, ispId);
      await fetchPurchases();
    } catch (err: any) {
      throw err;
    }
  };

  const unlinkLot = async (id: string, lotId: string) => {
    try {
      await purchasesAPI.unlinkLot(id, lotId);
      await fetchPurchases();
    } catch (err: any) {
      throw err;
    }
  };

  const getLinkedEntities = async (id: string): Promise<LinkedEntitiesResponse> => {
    try {
      return await purchasesAPI.getLinkedEntities(id);
    } catch (err: any) {
      throw err;
    }
  };

  const recalculateTotals = async (id: string) => {
    try {
      const updatedPurchase = await purchasesAPI.recalculateTotals(id);
      await fetchPurchases();
      return updatedPurchase;
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
    linkSaudas,
    linkInwardSlipPasses,
    linkLots,
    unlinkSauda,
    unlinkInwardSlipPass,
    unlinkLot,
    getLinkedEntities,
    recalculateTotals,
    refetch: fetchPurchases,
  };
}

