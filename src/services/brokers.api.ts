import { apiService } from './api';
import type { Broker, CreateBrokerRequest, UpdateBrokerRequest, PANLookupResponseData } from '../types/entities';

export const brokersAPI = {
  // Get all brokers
  getAllBrokers: (includeInactive: boolean = false, type?: string) => {
    let url = '/brokers/getAllBrokers';
    const params = new URLSearchParams();
    if (includeInactive) params.append('include_inactive', 'true');
    if (type) params.append('type', type);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Broker[]>(url);
  },

  // Get broker by ID
  getBrokerById: (id: string) => {
    return apiService.get<Broker>(`/brokers/getBrokerById/${id}`);
  },

  // Create broker
  createBroker: (data: CreateBrokerRequest) => {
    return apiService.post<Broker>('/brokers/createBroker', data);
  },

  // Update broker
  updateBroker: (id: string, data: UpdateBrokerRequest) => {
    return apiService.post<Broker>(`/brokers/updateBroker/${id}`, data);
  },

  // Delete broker
  deleteBroker: (id: string) => {
    return apiService.post<{ success: boolean; message: string }>(`/brokers/deleteBroker/${id}`);
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
  quickCreateFromPAN: (data: any) => {
    return apiService.post<Broker>('/brokers/quickCreateFromPAN', data);
  },
};

