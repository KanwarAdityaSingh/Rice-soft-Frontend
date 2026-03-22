import { apiService } from './api';
import type {
  Broker,
  BrokerBrokerageCommissionSummaryQuery,
  BrokerCommissionSummary,
  CreateBrokerRequest,
  UpdateBrokerRequest,
  PANLookupResponseData,
} from '../types/entities';

/** Matches backend lenient bank-verify message — broker persisted, bank verification did not complete. */
export const BROKER_CREATE_LENIENT_BANK_MESSAGE =
  'Broker created but bank could not be verified.';

export const brokersAPI = {
  // Get all brokers
  getAllBrokers: (includeInactive: boolean = false, type?: string, bankVerified?: boolean) => {
    let url = '/brokers/getAllBrokers';
    const params = new URLSearchParams();
    if (includeInactive) params.append('include_inactive', 'true');
    if (type) params.append('type', type);
    if (bankVerified !== undefined) params.append('bank_verified', String(bankVerified));
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Broker[]>(url);
  },

  // Get broker by ID
  getBrokerById: (id: string) => {
    return apiService.get<Broker>(`/brokers/getBrokerById/${id}`);
  },

  /** Purchase-sauda brokerage totals per sauda (same rules as purchase summary); optional godown / date filters */
  getBrokerageCommissionSummary: (brokerId: string, query?: BrokerBrokerageCommissionSummaryQuery) => {
    const params = new URLSearchParams();
    if (query?.godown_id) params.set('godown_id', query.godown_id);
    if (query?.from_date) params.set('from_date', query.from_date);
    if (query?.to_date) params.set('to_date', query.to_date);
    const q = params.toString();
    const path = q
      ? `/brokers/${brokerId}/brokerage-commission-summary?${q}`
      : `/brokers/${brokerId}/brokerage-commission-summary`;
    return apiService.get<BrokerCommissionSummary>(path);
  },

  // Create broker (envelope: verification_message / verification_error on bank paths)
  createBroker: async (
    data: CreateBrokerRequest
  ): Promise<{
    broker: Broker;
    message: string;
    verification_error?: string;
    verification_message?: string;
  }> => {
    const res = await apiService.postEnvelope<Broker>('/brokers/createBroker', data);
    return {
      broker: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
    };
  },

  // Update broker
  updateBroker: (id: string, data: UpdateBrokerRequest) => {
    return apiService.post<Broker>(`/brokers/updateBroker/${id}`, data);
  },

  // Delete broker
  deleteBroker: (id: string) => {
    return apiService.post<{ success: boolean; message: string }>(`/brokers/deleteBroker/${id}`);
  },

  /** Re-run Surepass against stored bank_details and mark verified if valid. */
  confirmBankVerification: (id: string) => {
    return apiService.post<Broker>(`/brokers/confirm-bank-verification/${id}`, {});
  },

  // Lookup PAN
  lookupPAN: (panNumber: string) => {
    return apiService.get<PANLookupResponseData>(`/brokers/lookupPAN?pan_number=${panNumber}`);
  },

  // Lookup Aadhaar
  lookupAadhaar: (aadhaarNumber: string) => {
    return apiService.get<{ is_valid: boolean; already_exists: boolean }>(`/brokers/lookupAadhaar?aadhaar_number=${aadhaarNumber}`);
  },

  // Quick create from PAN
  quickCreateFromPAN: async (data: any): Promise<{
    broker: Broker;
    message: string;
    verification_error?: string;
    verification_message?: string;
  }> => {
    const res = await apiService.postEnvelope<Broker>('/brokers/quickCreateFromPAN', data);
    return {
      broker: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
    };
  },

  // Lookup GST
  lookupGST: (gstNumber: string) => {
    return apiService.get<{ gst_data: any; mapped_data: any }>(`/brokers/lookupGST?gst_number=${gstNumber}`);
  },

  // Quick create from GST
  quickCreateFromGST: async (data: any): Promise<{
    broker: Broker;
    message: string;
    verification_error?: string;
    verification_message?: string;
  }> => {
    const res = await apiService.postEnvelope<Broker>('/brokers/quickCreateFromGST', data);
    return {
      broker: res.data,
      message: res.message ?? '',
      verification_error: res.verification_error,
      verification_message: res.verification_message,
    };
  },

  // Verify bank account
  verifyBankAccount: (accountNumber: string, ifscCode: string) => {
    return apiService.get<any>(`/brokers/verifyBankAccount?id_number=${accountNumber}&ifsc=${ifscCode.toUpperCase()}`);
  },
};
