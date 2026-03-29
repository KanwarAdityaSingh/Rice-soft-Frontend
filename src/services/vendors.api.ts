import { apiService } from './api';
import type { Vendor, CreateVendorRequest, UpdateVendorRequest, GSTLookupResponseData, PANLookupResponseData, VendorCheckResponse } from '../types/entities';

/** Matches backend lenient create — vendor persisted, bank verification did not complete. */
export const VENDOR_CREATE_LENIENT_BANK_MESSAGE =
  'Vendor created but bank could not be verified.';

/** Matches backend lenient update — vendor persisted, bank verification did not complete. */
export const VENDOR_UPDATE_LENIENT_BANK_MESSAGE =
  'Vendor updated but bank could not be verified.';

/** Matches backend `BANK_VERIFY_SUCCESS_MESSAGE` — fallback if envelope omits `verification_message`. */
export const BANK_VERIFY_SUCCESS_MESSAGE = 'Bank details verified successfully.';

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

  // Create vendor (returns API message for lenient bank-verify paths)
  createVendor: async (
    data: CreateVendorRequest
  ): Promise<{
    vendor: Vendor;
    message: string;
    verification_error?: string;
    verification_message?: string;
  }> => {
    const res = await apiService.postEnvelope<Vendor>('/vendors/createVendor', data);
    return {
      vendor: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
    };
  },

  // Update vendor (envelope: verification_message / verification_error when verify_bank is used)
  updateVendor: async (
    id: string,
    data: UpdateVendorRequest
  ): Promise<{
    vendor: Vendor;
    message: string;
    verification_error?: string;
    verification_message?: string;
  }> => {
    const res = await apiService.postEnvelope<Vendor>(`/vendors/updateVendor/${id}`, data);
    return {
      vendor: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
    };
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

  // Verify bank account
  verifyBankAccount: (accountNumber: string, ifscCode: string) => {
    return apiService.get<any>(`/vendors/verifyBankAccount?id_number=${accountNumber}&ifsc=${ifscCode.toUpperCase()}`);
  },

  // Get default payment advice recipient
  getDefaultRecipient: () => {
    return apiService.get<{ name: string; address: string; llpin: string }>('/vendors/getDefaultRecipient');
  },
};

