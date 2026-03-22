import { apiService } from './api';
import type { FinishedGoodsInventory, PacketsInventory, LotsInventory, BagsInventory, InventorySummary, InventoryFilters, HierarchicalInventory } from '../types/entities';

export const inventoryAPI = {
  // Get finished goods inventory
  getFinishedGoods: (filters?: InventoryFilters) => {
    let url = '/inventory/finished-goods';
    const params = new URLSearchParams();
    if (filters?.godown_id) params.append('godown_id', filters.godown_id);
    if (filters?.product_id) params.append('product_id', filters.product_id);
    if (filters?.batch_id) params.append('batch_id', filters.batch_id);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<FinishedGoodsInventory[]>(url);
  },

  // Get packets inventory (empty packets)
  getPackets: (filters?: InventoryFilters) => {
    let url = '/inventory/packets';
    const params = new URLSearchParams();
    if (filters?.godown_id) params.append('godown_id', filters.godown_id);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<PacketsInventory[]>(url);
  },

  // Get lots inventory
  getLots: (filters?: InventoryFilters) => {
    let url = '/inventory/lots';
    const params = new URLSearchParams();
    if (filters?.godown_id) params.append('godown_id', filters.godown_id);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<LotsInventory[]>(url);
  },

  // Get bags inventory
  getBags: (filters?: InventoryFilters) => {
    let url = '/inventory/bags';
    const params = new URLSearchParams();
    if (filters?.godown_id) params.append('godown_id', filters.godown_id);
    if (filters?.bag_type) params.append('bag_type', filters.bag_type);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<BagsInventory[]>(url);
  },

  // Get inventory summary
  getSummary: (filters?: InventoryFilters) => {
    let url = '/inventory/summary';
    const params = new URLSearchParams();
    if (filters?.godown_id) params.append('godown_id', filters.godown_id);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<InventorySummary>(url);
  },

  // Get hierarchical inventory
  getHierarchicalInventory: (filters?: InventoryFilters) => {
    let url = '/inventory/hierarchical';
    const params = new URLSearchParams();
    if (filters?.godown_id) params.append('godown_id', filters.godown_id);
    if (filters?.date_range?.from) params.append('date_from', filters.date_range.from);
    if (filters?.date_range?.to) params.append('date_to', filters.date_range.to);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<HierarchicalInventory[]>(url);
  },
};

