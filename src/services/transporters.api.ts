import { apiService } from './api';
import type { Transporter, CreateTransporterRequest, UpdateTransporterRequest, KycPersistContext } from '../types/entities';
import { kycAPI } from './kyc.api';

export const transportersAPI = {
  // Get all transporters
  getAllTransporters: (includeInactive: boolean = false) => {
    let url = '/transporters';
    if (includeInactive) {
      url += '?include_inactive=true';
    }
    return apiService.get<Transporter[]>(url);
  },

  // Get transporter by ID
  getTransporterById: (id: string) => {
    return apiService.get<Transporter>(`/transporters/${id}`);
  },

  // Create transporter
  createTransporter: (data: CreateTransporterRequest) => {
    return apiService.post<Transporter>('/transporters', data);
  },

  // Update transporter
  updateTransporter: (id: string, data: UpdateTransporterRequest) => {
    return apiService.put<Transporter>(`/transporters/${id}`, data);
  },

  // Delete transporter
  deleteTransporter: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/transporters/${id}`);
  },

  // GST Lookup (Surepass GSTIN Advanced — snapshots persisted on save via kyc_verification_details)
  lookupGST: (gstNumber: string, persist?: KycPersistContext) =>
    kycAPI.lookupGSTAdvanced(gstNumber, persist),

  // PAN Lookup (Surepass PAN Comprehensive — snapshots persisted on save via kyc_verification_details)
  lookupPAN: (panNumber: string, persist?: KycPersistContext) =>
    kycAPI.lookupPANComprehensive(panNumber, persist),

  // Verify bank account (Surepass via /kyc/bank/verify)
  verifyBankAccount: (accountNumber: string, ifscCode: string) => {
    return kycAPI.verifyBank(accountNumber, ifscCode);
  },
};

