import { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/inventory.api';
import type { FinishedGoodsInventory, PacketsInventory, LotsInventory, BagsInventory, InventorySummary, InventoryFilters } from '../types/entities';

export function useInventory() {
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodsInventory[]>([]);
  const [packets, setPackets] = useState<PacketsInventory[]>([]);
  const [lots, setLots] = useState<LotsInventory[]>([]);
  const [bags, setBags] = useState<BagsInventory[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinishedGoods = async (filters?: InventoryFilters) => {
    try {
      const data = await inventoryAPI.getFinishedGoods(filters);
      setFinishedGoods(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchPackets = async () => {
    try {
      const data = await inventoryAPI.getPackets();
      setPackets(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchLots = async () => {
    try {
      const data = await inventoryAPI.getLots();
      setLots(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchBags = async (filters?: InventoryFilters) => {
    try {
      const data = await inventoryAPI.getBags(filters);
      setBags(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await inventoryAPI.getSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchAll = async (filters?: InventoryFilters) => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchFinishedGoods(filters),
        fetchPackets(),
        fetchLots(),
        fetchBags(filters),
        fetchSummary(),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return {
    finishedGoods,
    packets,
    lots,
    bags,
    summary,
    loading,
    error,
    fetchFinishedGoods,
    fetchPackets,
    fetchLots,
    fetchBags,
    fetchSummary,
    refetch: fetchAll,
  };
}

