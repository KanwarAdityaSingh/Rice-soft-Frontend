import { apiService } from './api';

// ============================================================================
// AUDIT RESPONSE TYPES
// ============================================================================

export interface LotInventoryAuditResponse {
  id: string;
  lot_inventory_id: string | null;
  lot_id: string;
  operation_type: 'addition' | 'reduction' | 'adjustment';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  batch_id: string | null;
  batch_number: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  lot?: {
    id: string;
    lot_number: string;
    rice_code_id: string | null;
    rice_type: string | null;
  };
  user?: {
    id: string;
    name: string;
  };
}

export interface PacketsInventoryAuditResponse {
  id: string;
  packets_inventory_id: string | null;
  packaging_id: string;
  operation_type: 'addition' | 'reduction' | 'adjustment';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  batch_id: string | null;
  batch_number: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  packaging?: {
    id: string;
    holding_capacity: number;
    packet_type: string;
  };
  user?: {
    id: string;
    name: string;
  };
}

export interface BagsInventoryAuditResponse {
  id: string;
  bags_inventory_id: string | null;
  bag_type: 'jute' | 'pp';
  bag_capacity: number;
  operation_type: 'addition' | 'reduction' | 'adjustment';
  field_changed: 'filled_bags' | 'empty_bags';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  batch_id: string | null;
  batch_number: string | null;
  kaanta_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  user?: {
    id: string;
    name: string;
  };
}

export interface FinishedGoodsInventoryAuditResponse {
  id: string;
  finished_goods_inventory_id: string | null;
  product_id: string;
  batch_id: string | null;
  batch_number: string | null;
  packaging_id: string | null;
  operation_type: 'addition' | 'reduction' | 'adjustment';
  packets_change: number;
  packets_before: number;
  packets_after: number;
  weight_change: number;
  weight_before: number;
  weight_after: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  product?: {
    id: string;
    name: string;
  };
  packaging?: {
    id: string;
    holding_capacity: number;
    packet_type: string;
  };
  user?: {
    id: string;
    name: string;
  };
}

export interface BatchAuditResponse {
  lot_inventory_audit: LotInventoryAuditResponse[];
  packets_inventory_audit: PacketsInventoryAuditResponse[];
  bags_inventory_audit: BagsInventoryAuditResponse[];
  finished_goods_inventory_audit: FinishedGoodsInventoryAuditResponse[];
  summary: {
    lot_operations: number;
    packets_operations: number;
    bags_operations: number;
    finished_goods_operations: number;
    total_operations: number;
  };
}

// ============================================================================
// INVENTORY AUDIT API
// ============================================================================

export const inventoryAuditAPI = {
  // -------------------------------------------------------------------------
  // LOT INVENTORY AUDIT
  // -------------------------------------------------------------------------
  
  getLotAuditRecent: (limit: number = 100) => {
    return apiService.get<LotInventoryAuditResponse[]>(
      `/inventory/audit/lots/recent?limit=${limit}`
    );
  },

  getLotAuditByLotId: (lotId: string, limit: number = 100) => {
    return apiService.get<LotInventoryAuditResponse[]>(
      `/inventory/audit/lots/lot/${lotId}?limit=${limit}`
    );
  },

  getLotAuditByInventoryId: (lotInventoryId: string, limit: number = 100) => {
    return apiService.get<LotInventoryAuditResponse[]>(
      `/inventory/audit/lots/${lotInventoryId}?limit=${limit}`
    );
  },

  // -------------------------------------------------------------------------
  // PACKETS INVENTORY AUDIT
  // -------------------------------------------------------------------------
  
  getPacketsAuditRecent: (limit: number = 100) => {
    return apiService.get<PacketsInventoryAuditResponse[]>(
      `/inventory/audit/packets/recent?limit=${limit}`
    );
  },

  getPacketsAuditByPackagingId: (packagingId: string, limit: number = 100) => {
    return apiService.get<PacketsInventoryAuditResponse[]>(
      `/inventory/audit/packets/packaging/${packagingId}?limit=${limit}`
    );
  },

  getPacketsAuditByInventoryId: (packetsInventoryId: string, limit: number = 100) => {
    return apiService.get<PacketsInventoryAuditResponse[]>(
      `/inventory/audit/packets/${packetsInventoryId}?limit=${limit}`
    );
  },

  // -------------------------------------------------------------------------
  // BAGS INVENTORY AUDIT
  // -------------------------------------------------------------------------
  
  getBagsAuditRecent: (limit: number = 100) => {
    return apiService.get<BagsInventoryAuditResponse[]>(
      `/inventory/audit/bags/recent?limit=${limit}`
    );
  },

  getBagsAuditByTypeAndCapacity: (bagType: 'jute' | 'pp', bagCapacity: number, limit: number = 100) => {
    return apiService.get<BagsInventoryAuditResponse[]>(
      `/inventory/audit/bags/type/${bagType}/capacity/${bagCapacity}?limit=${limit}`
    );
  },

  getBagsAuditByKaantaId: (kaantaId: string) => {
    return apiService.get<BagsInventoryAuditResponse[]>(
      `/inventory/audit/bags/kaanta/${kaantaId}`
    );
  },

  getBagsAuditByInventoryId: (bagsInventoryId: string, limit: number = 100) => {
    return apiService.get<BagsInventoryAuditResponse[]>(
      `/inventory/audit/bags/${bagsInventoryId}?limit=${limit}`
    );
  },

  // -------------------------------------------------------------------------
  // FINISHED GOODS INVENTORY AUDIT
  // -------------------------------------------------------------------------
  
  getFinishedGoodsAuditRecent: (limit: number = 100) => {
    return apiService.get<FinishedGoodsInventoryAuditResponse[]>(
      `/inventory/audit/finished-goods/recent?limit=${limit}`
    );
  },

  getFinishedGoodsAuditByProductId: (productId: string, limit: number = 100) => {
    return apiService.get<FinishedGoodsInventoryAuditResponse[]>(
      `/inventory/audit/finished-goods/product/${productId}?limit=${limit}`
    );
  },

  getFinishedGoodsAuditByBatchId: (batchId: string) => {
    return apiService.get<FinishedGoodsInventoryAuditResponse[]>(
      `/inventory/audit/finished-goods/batch/${batchId}`
    );
  },

  getFinishedGoodsAuditByInventoryId: (fgInventoryId: string, limit: number = 100) => {
    return apiService.get<FinishedGoodsInventoryAuditResponse[]>(
      `/inventory/audit/finished-goods/${fgInventoryId}?limit=${limit}`
    );
  },

  // -------------------------------------------------------------------------
  // COMBINED BATCH AUDIT
  // -------------------------------------------------------------------------
  
  getBatchAudit: (batchId: string) => {
    return apiService.get<BatchAuditResponse>(
      `/inventory/audit/batch/${batchId}`
    );
  },

  getBatchInventoryAudit: (batchId: string) => {
    return apiService.get<BatchAuditResponse>(
      `/batches/${batchId}/inventory-audit`
    );
  },
};

