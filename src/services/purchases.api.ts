import { apiService } from './api';
import type { 
  Purchase, 
  CreatePurchaseRequest, 
  UpdatePurchaseRequest,
  LinkedEntitiesResponse,
  LinkSaudasRequest,
  LinkInwardSlipPassesRequest,
  LinkLotsRequest
} from '../types/entities';

export const purchasesAPI = {
  // Get all purchases
  getAllPurchases: (vendor_id?: string) => {
    let url = '/purchases';
    if (vendor_id) {
      url += `?vendor_id=${vendor_id}`;
    }
    return apiService.get<Purchase[]>(url);
  },

  // Get purchase by ID
  getPurchaseById: (id: string) => {
    return apiService.get<Purchase>(`/purchases/${id}`);
  },

  // Create purchase
  createPurchase: (data: CreatePurchaseRequest) => {
    return apiService.post<Purchase>('/purchases', data);
  },

  // Update purchase
  updatePurchase: (id: string, data: UpdatePurchaseRequest) => {
    return apiService.put<Purchase>(`/purchases/${id}`, data);
  },

  // Delete purchase
  deletePurchase: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/purchases/${id}`);
  },

  // Link saudas to purchase
  linkSaudas: (id: string, data: LinkSaudasRequest) => {
    return apiService.post<{ success: boolean; message: string; data: { linked_count: number } }>(`/purchases/${id}/link-saudas`, data);
  },

  // Link inward slip passes to purchase
  linkInwardSlipPasses: (id: string, data: LinkInwardSlipPassesRequest) => {
    return apiService.post<{ success: boolean; message: string; data: { linked_count: number } }>(`/purchases/${id}/link-inward-slip-passes`, data);
  },

  // Link lots to purchase
  linkLots: (id: string, data: LinkLotsRequest) => {
    return apiService.post<{ success: boolean; message: string; data: { linked_count: number } }>(`/purchases/${id}/link-lots`, data);
  },

  // Unlink sauda from purchase
  unlinkSauda: (id: string, saudaId: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/purchases/${id}/unlink-sauda/${saudaId}`);
  },

  // Unlink inward slip pass from purchase
  unlinkInwardSlipPass: (id: string, ispId: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/purchases/${id}/unlink-inward-slip-pass/${ispId}`);
  },

  // Unlink lot from purchase
  unlinkLot: (id: string, lotId: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/purchases/${id}/unlink-lot/${lotId}`);
  },

  // Get linked entities
  getLinkedEntities: (id: string) => {
    return apiService.get<LinkedEntitiesResponse>(`/purchases/${id}/linked-entities`);
  },

  // Recalculate totals
  recalculateTotals: (id: string) => {
    return apiService.post<Purchase>(`/purchases/${id}/recalculate-totals`, {});
  },
};

