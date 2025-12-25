import { apiService } from './api';
import type { Packaging, CreatePackagingRequest, UpdatePackagingRequest, AddPacketsInventoryRequest, PacketsInventory } from '../types/entities';

export const packagingAPI = {
  // Get all packaging types
  getAllPackaging: () => {
    return apiService.get<Packaging[]>('/packaging');
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

