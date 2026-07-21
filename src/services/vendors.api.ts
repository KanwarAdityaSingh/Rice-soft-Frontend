import { apiService } from './api';
import type {
  AadhaarLookupResponse,
  AadhaarValidationResult,
  Vendor,
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorCheckResponse,
  KycPersistContext,
} from '../types/entities';
import { kycAPI } from './kyc.api';

export interface GetAllVendorsOptions {
  /** When true, returns active + inactive. Default list is active only. */
  includeInactive?: boolean;
  type?: string;
  /** Filter by registration classification. */
  registrationType?: 'registered' | 'unregistered';
  /** Filter by identity verification status (GST/PAN or Aadhaar KYC). */
  isVerified?: boolean;
  /** Filter by bank verification status. */
  bankVerified?: boolean;
}

function normalizeGetAllOptions(options?: boolean | GetAllVendorsOptions): GetAllVendorsOptions {
  if (typeof options === 'boolean') {
    return { includeInactive: options };
  }
  return options ?? {};
}

function cleanAadhaar(aadhaarNumber: string): string {
  return aadhaarNumber.replace(/\s/g, '');
}

function normalizeAadhaarLookupResponse(
  response: AadhaarLookupResponse | (AadhaarValidationResult & { surepass_response?: unknown }),
): AadhaarValidationResult & { surepass_response?: unknown } {
  if ('aadhaar_data' in response) {
    const aadhaarData = response.aadhaar_data as AadhaarValidationResult & { surepass_response?: unknown };
    return {
      ...aadhaarData,
      surepass_response: response.surepass_response ?? aadhaarData.surepass_response,
    };
  }
  return response;
}

export interface CheckVendorExistsParams {
  gst_number?: string;
  pan_number?: string;
  aadhaar_number?: string;
  account_number?: string;
  ifsc_code?: string;
  /** When editing, exclude this vendor from duplicate detection. */
  vendor_id?: string;
}

/** Matches backend lenient create — vendor persisted, bank verification did not complete. */
export const VENDOR_CREATE_LENIENT_BANK_MESSAGE =
  'Vendor created but bank could not be verified.';

/** Matches backend lenient create when holder name differs from bank snapshot. */
export const VENDOR_CREATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE =
  'Vendor created but bank account holder name does not match the verification snapshot.';

/** Matches backend lenient update — vendor persisted, bank verification did not complete. */
export const VENDOR_UPDATE_LENIENT_BANK_MESSAGE =
  'Vendor updated but bank could not be verified.';

/** Matches backend lenient update when holder name differs from bank snapshot. */
export const VENDOR_UPDATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE =
  'Vendor updated but bank account holder name does not match the verification snapshot.';

/** Matches backend `BANK_VERIFY_SUCCESS_MESSAGE` — fallback if envelope omits `verification_message`. */
export const BANK_VERIFY_SUCCESS_MESSAGE = 'Bank details verified successfully.';

export const vendorsAPI = {
  // Get all vendors
  getAllVendors: (options?: boolean | GetAllVendorsOptions) => {
    const { includeInactive, type, registrationType, isVerified, bankVerified } =
      normalizeGetAllOptions(options);
    const params = new URLSearchParams();
    if (includeInactive) params.set('include_inactive', 'true');
    if (type) params.set('type', type);
    if (registrationType) params.set('registration_type', registrationType);
    if (isVerified === true) params.set('is_verified', 'true');
    if (isVerified === false) params.set('is_verified', 'false');
    if (bankVerified === true) params.set('bank_verified', 'true');
    if (bankVerified === false) params.set('bank_verified', 'false');
    const query = params.toString();
    const url = query ? `/vendors/getAllVendors?${query}` : '/vendors/getAllVendors';
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
    bank_verification_flagged?: boolean;
  }> => {
    const res = await apiService.postEnvelope<Vendor>('/vendors/createVendor', data);
    return {
      vendor: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
      bank_verification_flagged: res.bank_verification_flagged,
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
    bank_verification_flagged?: boolean;
  }> => {
    const res = await apiService.postEnvelope<Vendor>(`/vendors/updateVendor/${id}`, data);
    return {
      vendor: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
      bank_verification_flagged: res.bank_verification_flagged,
    };
  },

  // Hard delete vendor
  deleteVendor: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/vendors/${id}`);
  },

  // Lookup GST (Surepass GSTIN Advanced — snapshots persisted on save via kyc_verification_details)
  lookupGST: (gstNumber: string, persist?: KycPersistContext) =>
    kycAPI.lookupGSTAdvanced(gstNumber, persist),

  // Lookup PAN (Surepass PAN Comprehensive — snapshots persisted on save via kyc_verification_details)
  lookupPAN: (panNumber: string, persist?: KycPersistContext) =>
    kycAPI.lookupPANComprehensive(panNumber, persist),

  // Quick create from GST
  quickCreateFromGST: (data: any) => {
    return apiService.post<Vendor>('/vendors/quickCreateFromGST', data);
  },

  // Quick create from PAN
  quickCreateFromPAN: (data: any) => {
    return apiService.post<Vendor>('/vendors/quickCreateFromPAN', data);
  },

  // Check if vendor exists by GST, PAN, Aadhaar, or bank account
  checkVendorExists: (params: CheckVendorExistsParams) => {
    const queryParams = new URLSearchParams();
    if (params.gst_number) queryParams.append('gst_number', params.gst_number.trim().toUpperCase());
    if (params.pan_number) queryParams.append('pan_number', params.pan_number.trim().toUpperCase());
    if (params.aadhaar_number) queryParams.append('aadhaar_number', cleanAadhaar(params.aadhaar_number));
    if (params.account_number) queryParams.append('account_number', params.account_number.replace(/\s/g, ''));
    if (params.ifsc_code) queryParams.append('ifsc_code', params.ifsc_code.trim().toUpperCase());
    if (params.vendor_id) queryParams.append('vendor_id', params.vendor_id);
    return apiService.get<VendorCheckResponse>(`/vendors/checkExists?${queryParams.toString()}`);
  },

  // Verify bank account (Surepass via /kyc/bank/verify)
  verifyBankAccount: (accountNumber: string, ifscCode: string, vendorId?: string | null) => {
    const persist = vendorId ? { entity_type: 'vendor' as const, entity_id: vendorId } : undefined;
    return kycAPI.verifyBank(accountNumber, ifscCode, persist);
  },

  /** Surepass Aadhaar validation via vendor lookup endpoint (optional vendor_id to persist snapshot). */
  lookupAadhaar: async (aadhaarNumber: string, vendorId?: string | null) => {
    const params = new URLSearchParams({ aadhaar_number: cleanAadhaar(aadhaarNumber) });
    if (vendorId) params.set('vendor_id', vendorId);
    const response = await apiService.get<
      AadhaarLookupResponse | (AadhaarValidationResult & { surepass_response?: unknown })
    >(`/vendors/lookupAadhaar?${params.toString()}`);
    return normalizeAadhaarLookupResponse(response);
  },

  // Get default payment advice recipient (company / supplier profile)
  getDefaultRecipient: () => {
    return apiService.get<{
      name: string;
      address: string;
      llpin: string;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
      phones?: string[] | null;
      emails?: string[] | null;
    }>('/vendors/getDefaultRecipient');
  },
};

