import { apiService } from './api';
import type { Transporter, CreateTransporterRequest, UpdateTransporterRequest, KycPersistContext } from '../types/entities';
import { kycAPI } from './kyc.api';

export interface GetAllTransportersOptions {
  /** When true, returns active + inactive. Default list is active only. */
  includeInactive?: boolean;
  /** Filter by identity verification status (GST/PAN or Aadhaar KYC). */
  isVerified?: boolean;
}

function normalizeGetAllOptions(options?: boolean | GetAllTransportersOptions): GetAllTransportersOptions {
  if (typeof options === 'boolean') {
    return { includeInactive: options };
  }
  return options ?? {};
}

export const transportersAPI = {
  getAllTransporters: (options?: boolean | GetAllTransportersOptions) => {
    const { includeInactive, isVerified } = normalizeGetAllOptions(options);
    const params = new URLSearchParams();
    if (includeInactive) params.set('include_inactive', 'true');
    if (isVerified === true) params.set('is_verified', 'true');
    if (isVerified === false) params.set('is_verified', 'false');
    const query = params.toString();
    const url = query ? `/transporters?${query}` : '/transporters';
    return apiService.get<Transporter[]>(url);
  },

  getTransporterById: (id: string) => {
    return apiService.get<Transporter>(`/transporters/${id}`);
  },

  createTransporter: (data: CreateTransporterRequest) => {
    return apiService.post<Transporter>('/transporters', data);
  },

  updateTransporter: (id: string, data: UpdateTransporterRequest) => {
    return apiService.put<Transporter>(`/transporters/${id}`, data);
  },

  deactivateTransporter: (id: string) => {
    return apiService.put<Transporter>(`/transporters/${id}`, { is_active: false });
  },

  lookupGST: (gstNumber: string, persist?: KycPersistContext) =>
    kycAPI.lookupGSTAdvanced(gstNumber, persist),

  lookupPAN: (panNumber: string, persist?: KycPersistContext) =>
    kycAPI.lookupPANComprehensive(panNumber, persist),

  lookupAadhaar: (aadhaarNumber: string, persist?: KycPersistContext) =>
    kycAPI.validateAadhaar(aadhaarNumber, persist),

  /** Bank verify + persist on transporter (does not change identity verified status). */
  verifyBankAccount: (accountNumber: string, ifscCode: string, transporterId?: string) => {
    const params = new URLSearchParams({
      id_number: accountNumber.trim(),
      ifsc: ifscCode.trim().toUpperCase(),
    });
    if (transporterId) params.set('transporter_id', transporterId);
    return apiService.get(`/transporters/verifyBankAccount?${params.toString()}`);
  },
};
