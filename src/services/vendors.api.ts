import { apiService } from './api';
import type { Vendor, CreateVendorRequest, UpdateVendorRequest, GSTLookupResponseData, PANLookupResponseData, VendorCheckResponse } from '../types/entities';

export const vendorsAPI = {
  // Get all vendors
  getAllVendors: (includeInactive: boolean = false, type?: string) => {
    let url = '/vendors/getAllVendors';
    const params = new URLSearchParams();
    if (includeInactive) params.append('include_inactive', 'true');
    if (type) params.append('type', type);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Vendor[]>(url);
  },

  // Get vendor by ID
  getVendorById: (id: string) => {
    return apiService.get<Vendor>(`/vendors/getVendorById/${id}`);
  },

  // Create vendor
  createVendor: (data: CreateVendorRequest) => {
    return apiService.post<Vendor>('/vendors/createVendor', data);
  },

  // Update vendor
  updateVendor: (id: string, data: UpdateVendorRequest) => {
    return apiService.post<Vendor>(`/vendors/updateVendor/${id}`, data);
  },

  // Delete vendor
  deleteVendor: (id: string) => {
    return apiService.post<{ success: boolean; message: string }>(`/vendors/deleteVendor/${id}`);
  },

  // Lookup GST
  lookupGST: (gstNumber: string) => {
    return apiService.get<GSTLookupResponseData>(`/vendors/lookupGST?gst_number=${gstNumber}`);
  },

  // Lookup PAN
  lookupPAN: (panNumber: string) => {
    return apiService.get<PANLookupResponseData>(`/vendors/lookupPAN?pan_number=${panNumber}`);
  },

  // Quick create from GST
  quickCreateFromGST: (data: any) => {
    return apiService.post<Vendor>('/vendors/quickCreateFromGST', data);
  },

  // Quick create from PAN
  quickCreateFromPAN: (data: any) => {
    return apiService.post<Vendor>('/vendors/quickCreateFromPAN', data);
  },

  // Check if vendor exists by GST or PAN
  checkVendorExists: (params: { gst_number?: string; pan_number?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.gst_number) queryParams.append('gst_number', params.gst_number);
    if (params.pan_number) queryParams.append('pan_number', params.pan_number);
    return apiService.get<VendorCheckResponse>(`/vendors/checkExists?${queryParams.toString()}`);
  },
};

