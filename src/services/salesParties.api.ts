import { apiService } from './api';
import type {
  AadhaarLookupResponse,
  AadhaarValidationResult,
  SalesParty,
  CreateSalesPartyRequest,
  UpdateSalesPartyRequest,
} from '../types/entities';

const BASE = '/sales-parties';

export interface GetAllSalesPartiesOptions {
  includeInactive?: boolean;
  registrationType?: 'registered' | 'unregistered';
  isVerified?: boolean;
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

export const salesPartiesAPI = {
  getAll: (options?: boolean | GetAllSalesPartiesOptions) => {
    const opts =
      typeof options === 'boolean' ? { includeInactive: options } : (options ?? {});
    const { includeInactive, registrationType, isVerified } = opts;
    const params = new URLSearchParams();
    if (includeInactive) params.set('include_inactive', 'true');
    if (registrationType) params.set('registration_type', registrationType);
    if (isVerified === true) params.set('is_verified', 'true');
    if (isVerified === false) params.set('is_verified', 'false');
    const q = params.toString();
    return apiService.get<SalesParty[]>(q ? `${BASE}?${q}` : BASE);
  },

  getById: (id: string) => apiService.get<SalesParty>(`${BASE}/${id}`),

  create: (data: CreateSalesPartyRequest) => apiService.post<SalesParty>(BASE, data),

  update: (id: string, data: UpdateSalesPartyRequest) =>
    apiService.patch<SalesParty>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    apiService.delete<{ success: boolean; message: string }>(`${BASE}/${id}`),

  lookupAadhaar: async (aadhaarNumber: string, salesPartyId?: string | null) => {
    const params = new URLSearchParams({ aadhaar_number: cleanAadhaar(aadhaarNumber) });
    if (salesPartyId) params.set('sales_party_id', salesPartyId);
    const response = await apiService.get<
      AadhaarLookupResponse | (AadhaarValidationResult & { surepass_response?: unknown })
    >(`${BASE}/lookupAadhaar?${params.toString()}`);
    return normalizeAadhaarLookupResponse(response);
  },
};
