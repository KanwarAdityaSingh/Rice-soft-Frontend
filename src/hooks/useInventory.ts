import { useState, useEffect, useCallback, useMemo } from 'react';
import { inventoryAPI } from '../services/inventory.api';
import type { FinishedGoodsInventory, PacketsInventory, LotsInventory, BagsInventory, InventorySummary, InventoryFilters, HierarchicalInventory } from '../types/entities';
import { getUniqueFilterValues } from '../utils/inventoryTransform';

export function useInventory() {
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodsInventory[]>([]);
  const [packets, setPackets] = useState<PacketsInventory[]>([]);
  const [lots, setLots] = useState<LotsInventory[]>([]);
  const [bags, setBags] = useState<BagsInventory[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [hierarchical, setHierarchical] = useState<HierarchicalInventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinishedGoods = useCallback(async (filters?: InventoryFilters) => {
    try {
      const data = await inventoryAPI.getFinishedGoods(filters);
      setFinishedGoods(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchPackets = useCallback(async (filters?: InventoryFilters) => {
    try {
      const data = await inventoryAPI.getPackets(filters);
      setPackets(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchLots = useCallback(async (filters?: InventoryFilters) => {
    try {
      const data = await inventoryAPI.getLots(filters);
      setLots(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchBags = useCallback(async (filters?: InventoryFilters) => {
    try {
      const data = await inventoryAPI.getBags(filters);
      setBags(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchSummary = useCallback(async (filters?: InventoryFilters) => {
    try {
      const data = await inventoryAPI.getSummary(filters);
      setSummary(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchHierarchicalInventory = useCallback(async (filters?: InventoryFilters) => {
    try {
      const data = await inventoryAPI.getHierarchicalInventory(filters);
      setHierarchical(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchAll = useCallback(async (filters?: InventoryFilters) => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchFinishedGoods(filters),
        fetchPackets(filters),
        fetchLots(filters),
        fetchBags(filters),
        fetchSummary(filters),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFinishedGoods, fetchPackets, fetchLots, fetchBags, fetchSummary]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Get unique filter values from hierarchical data
  const uniqueFilterValues = useMemo(() => {
    if (!hierarchical || hierarchical.length === 0) {
      return {
        brands: [],
        rice_types: [],
        capacities: [],
        packet_types: [],
        vendors: [],
      };
    }
    return getUniqueFilterValues(hierarchical);
  }, [hierarchical]);

  // Helper functions for filter options
  const getUniqueBrands = useCallback(() => {
    return uniqueFilterValues.brands;
  }, [uniqueFilterValues]);

  const getUniqueRiceTypes = useCallback(() => {
    return uniqueFilterValues.rice_types;
  }, [uniqueFilterValues]);

  const getUniqueCapacities = useCallback(() => {
    return uniqueFilterValues.capacities;
  }, [uniqueFilterValues]);

  const getUniquePacketTypes = useCallback(() => {
    return uniqueFilterValues.packet_types;
  }, [uniqueFilterValues]);

  const getUniqueVendors = useCallback(() => {
    return uniqueFilterValues.vendors;
  }, [uniqueFilterValues]);

  return {
    finishedGoods,
    packets,
    lots,
    bags,
    summary,
    hierarchical,
    loading,
    error,
    fetchFinishedGoods,
    fetchPackets,
    fetchLots,
    fetchBags,
    fetchSummary,
    fetchHierarchicalInventory,
    refetch: fetchAll,
    // Filter helpers
    uniqueFilterValues,
    getUniqueBrands,
    getUniqueRiceTypes,
    getUniqueCapacities,
    getUniquePacketTypes,
    getUniqueVendors,
  };
}
