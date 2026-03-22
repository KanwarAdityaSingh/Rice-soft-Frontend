import { apiService } from './api';
import type { Packaging, CreatePackagingRequest, UpdatePackagingRequest, AddPacketsInventoryRequest, PacketsInventory } from '../types/entities';

export const packagingAPI = {
  // Get all packaging types (optionally filtered by product_id and/or godown_id)
  getAllPackaging: (filters?: { product_id?: string; godown_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.product_id) params.set('product_id', filters.product_id);
    if (filters?.godown_id) params.set('godown_id', filters.godown_id);
    const q = params.toString();
    return apiService.get<Packaging[]>(q ? `/packaging?${q}` : '/packaging');
  },

  // Get packaging by ID
  getPackagingById: (id: string) => {
    return apiService.get<Packaging>(`/packaging/${id}`);
  },

  // Create packaging
  createPackaging: (data: CreatePackagingRequest) => {
    return apiService.post<Packaging>('/packaging', data);
  },

  // Update packaging
  updatePackaging: (id: string, data: UpdatePackagingRequest) => {
    return apiService.put<Packaging>(`/packaging/${id}`, data);
  },

  // Delete packaging
  deletePackaging: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/packaging/${id}`);
  },

  // Add empty packets to inventory
  addPacketsInventory: (id: string, data: AddPacketsInventoryRequest) => {
    return apiService.post<PacketsInventory>(`/packaging/${id}/inventory`, data);
  },
};

