import { apiService } from './api';
import type { PackagingVendor, CreatePackagingVendorRequest, UpdatePackagingVendorRequest } from '../types/entities';

export const packagingVendorsAPI = {
  // Get all packaging vendors
  getAllPackagingVendors: () => {
    return apiService.get<PackagingVendor[]>('/packaging-vendors');
  },

  // Get packaging vendor by ID
  getPackagingVendorById: (id: string) => {
    return apiService.get<PackagingVendor>(`/packaging-vendors/${id}`);
  },

  // Create packaging vendor
  createPackagingVendor: (data: CreatePackagingVendorRequest) => {
    return apiService.post<PackagingVendor>('/packaging-vendors', data);
  },

  // Update packaging vendor
  updatePackagingVendor: (id: string, data: UpdatePackagingVendorRequest) => {
    return apiService.put<PackagingVendor>(`/packaging-vendors/${id}`, data);
  },

  // Delete packaging vendor
  deletePackagingVendor: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/packaging-vendors/${id}`);
  },
};

