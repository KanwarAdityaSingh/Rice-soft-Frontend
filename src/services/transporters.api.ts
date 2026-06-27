import { apiService } from './api';
import type {
  Transporter,
  CreateTransporterRequest,
  UpdateTransporterRequest,
  KycPersistContext,
} from '../types/entities';
import { kycAPI } from './kyc.api';

/** Matches backend lenient create — transporter persisted, bank verification did not complete. */
export const TRANSPORTER_CREATE_LENIENT_BANK_MESSAGE =
  'Transporter created but bank could not be verified.';

/** Matches backend lenient create when holder name differs from bank snapshot. */
export const TRANSPORTER_CREATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE =
  'Transporter created but bank account holder name does not match the verification snapshot.';

/** Matches backend lenient update — transporter persisted, bank verification did not complete. */
export const TRANSPORTER_UPDATE_LENIENT_BANK_MESSAGE =
  'Transporter updated but bank could not be verified.';

/** Matches backend lenient update when holder name differs from bank snapshot. */
export const TRANSPORTER_UPDATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE =
  'Transporter updated but bank account holder name does not match the verification snapshot.';

export interface GetAllTransportersOptions {
  /** When true, returns active + inactive. Default list is active only. */
  includeInactive?: boolean;
  /** Filter by identity verification status (GST/PAN or Aadhaar KYC). */
  isVerified?: boolean;
  /** Filter by bank verification status. */
  bankVerified?: boolean;
}

function normalizeGetAllOptions(options?: boolean | GetAllTransportersOptions): GetAllTransportersOptions {
  if (typeof options === 'boolean') {
    return { includeInactive: options };
  }
  return options ?? {};
}

export const transportersAPI = {
  getAllTransporters: (options?: boolean | GetAllTransportersOptions) => {
    const { includeInactive, isVerified, bankVerified } = normalizeGetAllOptions(options);
    const params = new URLSearchParams();
    if (includeInactive) params.set('include_inactive', 'true');
    if (isVerified === true) params.set('is_verified', 'true');
    if (isVerified === false) params.set('is_verified', 'false');
    if (bankVerified === true) params.set('bank_verified', 'true');
    if (bankVerified === false) params.set('bank_verified', 'false');
    const query = params.toString();
    const url = query ? `/transporters?${query}` : '/transporters';
    return apiService.get<Transporter[]>(url);
  },

  getTransporterById: (id: string) => {
    return apiService.get<Transporter>(`/transporters/${id}`);
  },

  createTransporter: async (
    data: CreateTransporterRequest,
  ): Promise<{
    transporter: Transporter;
    message: string;
    verification_error?: string;
    verification_message?: string;
    bank_verification_flagged?: boolean;
  }> => {
    const res = await apiService.postEnvelope<Transporter>('/transporters', data);
    return {
      transporter: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
      bank_verification_flagged: res.bank_verification_flagged,
    };
  },

  updateTransporter: async (
    id: string,
    data: UpdateTransporterRequest,
  ): Promise<{
    transporter: Transporter;
    message: string;
    verification_error?: string;
    verification_message?: string;
    bank_verification_flagged?: boolean;
  }> => {
    const res = await apiService.putEnvelope<Transporter>(`/transporters/${id}`, data);
    return {
      transporter: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
      bank_verification_flagged: res.bank_verification_flagged,
    };
  },

  deleteTransporter: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/transporters/${id}`);
  },

  /** Re-run Surepass against stored bank_details and mark verified if valid. */
  confirmBankVerification: (id: string) => {
    return apiService.post<Transporter>(`/transporters/confirm-bank-verification/${id}`, {});
  },

  lookupGST: (gstNumber: string, persist?: KycPersistContext) =>
    kycAPI.lookupGSTAdvanced(gstNumber, persist),

  lookupPAN: (panNumber: string, persist?: KycPersistContext) =>
    kycAPI.lookupPANComprehensive(panNumber, persist),

  lookupAadhaar: (aadhaarNumber: string, persist?: KycPersistContext) =>
    kycAPI.validateAadhaar(aadhaarNumber, persist),
};
