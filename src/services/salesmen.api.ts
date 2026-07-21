import { apiService } from './api';
import { kycAPI } from './kyc.api';
import type {
  CreateSalesmanRequest,
  KycPersistContext,
  Salesman,
  SalesmanSalaryHistoryEntry,
  UpdateSalesmanRequest,
} from '../types/entities';

/** Matches backend lenient bank-verify message — salesman persisted, bank verification did not complete. */
export const SALESMAN_CREATE_LENIENT_BANK_MESSAGE =
  'Salesman created but bank could not be verified.';

export const SALESMAN_UPDATE_LENIENT_BANK_MESSAGE =
  'Salesman updated but bank could not be verified.';

export const salesmenAPI = {
  getAllSalesmen: (includeInactive: boolean = false) => {
    let url = '/salesmen/getAllSalesmen';
    const params = new URLSearchParams();
    if (includeInactive) params.append('include_inactive', 'true');
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Salesman[]>(url);
  },

  getSalesmanById: (id: string) => {
    return apiService.get<Salesman>(`/salesmen/getSalesmanById/${id}`);
  },

  createSalesman: async (
    data: CreateSalesmanRequest,
  ): Promise<{
    salesman: Salesman;
    message: string;
    verification_error?: string;
    verification_message?: string;
  }> => {
    const res = await apiService.postEnvelope<Salesman>('/salesmen/createSalesman', data);
    return {
      salesman: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
    };
  },

  updateSalesman: async (
    id: string,
    data: UpdateSalesmanRequest,
  ): Promise<{
    salesman: Salesman;
    message: string;
    verification_error?: string;
    verification_message?: string;
  }> => {
    const res = await apiService.postEnvelope<Salesman>(`/salesmen/updateSalesman/${id}`, data);
    return {
      salesman: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
    };
  },

  deleteSalesman: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/salesmen/${id}`);
  },

  /** Re-run Surepass against stored bank_details and mark verified if valid. */
  confirmBankVerification: (id: string) => {
    return apiService.post<Salesman>(`/salesmen/confirm-bank-verification/${id}`, {});
  },

  getSalaryHistory: (id: string) => {
    return apiService.get<SalesmanSalaryHistoryEntry[]>(`/salesmen/${id}/salary-history`);
  },

  lookupPAN: (panNumber: string, persist?: KycPersistContext) =>
    kycAPI.lookupPANComprehensive(panNumber, persist),

  lookupAadhaar: (aadhaarNumber: string, persist?: KycPersistContext) =>
    kycAPI.validateAadhaar(aadhaarNumber, persist),
};
