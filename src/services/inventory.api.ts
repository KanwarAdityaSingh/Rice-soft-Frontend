import { apiService } from './api';
import type { FinishedGoodsInventory, PacketsInventory, LotsInventory, BagsInventory, InventorySummary, InventoryFilters } from '../types/entities';

export const inventoryAPI = {
  // Get finished goods inventory
  getFinishedGoods: (filters?: InventoryFilters) => {
    let url = '/inventory/finished-goods';
    const params = new URLSearchParams();
    if (filters?.product_id) params.append('product_id', filters.product_id);
    if (filters?.batch_id) params.append('batch_id', filters.batch_id);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<FinishedGoodsInventory[]>(url);
  },

  // Get packets inventory (empty packets)
  getPackets: () => {
    return apiService.get<PacketsInventory[]>('/inventory/packets');
  },

  // Get lots inventory
  getLots: () => {
    return apiService.get<LotsInventory[]>('/inventory/lots');
  },

  // Get bags inventory
  getBags: (filters?: InventoryFilters) => {
    let url = '/inventory/bags';
    const params = new URLSearchParams();
    if (filters?.bag_type) params.append('bag_type', filters.bag_type);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<BagsInventory[]>(url);
  },

  // Get inventory summary
  getSummary: () => {
    return apiService.get<InventorySummary>('/inventory/summary');
  },
};

