import { apiService } from './api';
import type { InventoryLedgerEntry, InventoryLedgerSourceType } from '../types/sales';

const BASE = '/inventory-ledger';

export interface InventoryLedgerParams {
  godown_id?: string;
  product_id?: string;
  source_type?: InventoryLedgerSourceType;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export const inventoryLedgerAPI = {
  list: (params?: InventoryLedgerParams) => {
    const search = new URLSearchParams();
    if (params?.godown_id) search.set('godown_id', params.godown_id);
    if (params?.product_id) search.set('product_id', params.product_id);
    if (params?.source_type) search.set('source_type', params.source_type);
    if (params?.from_date) search.set('from_date', params.from_date);
    if (params?.to_date) search.set('to_date', params.to_date);
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.offset != null) search.set('offset', String(params.offset));
    const q = search.toString();
    return apiService.get<InventoryLedgerEntry[]>(q ? `${BASE}?${q}` : BASE);
  },
};
