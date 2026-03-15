import { useState, useCallback, useEffect } from 'react';
import { inventoryLedgerAPI, type InventoryLedgerParams } from '../services/inventoryLedger.api';
import type { InventoryLedgerEntry } from '../types/sales';

export function useInventoryLedger(params?: InventoryLedgerParams) {
  const [entries, setEntries] = useState<InventoryLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryLedgerAPI.list(params);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory ledger');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [
    params?.product_id,
    params?.source_type,
    params?.from_date,
    params?.to_date,
    params?.limit,
    params?.offset,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return {
    entries,
    loading,
    error,
    refetch: fetchList,
  };
}
