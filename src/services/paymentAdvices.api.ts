import { apiService } from './api';
import type { 
  PaymentAdvice, 
  CreatePaymentAdviceRequest, 
  UpdatePaymentAdviceRequest,
  AddChargeRequest,
  NetPayableResponse
} from '../types/entities';

export const paymentAdvicesAPI = {
  // Get all payment advices
  getAllPaymentAdvices: (purchase_id?: string, status?: 'pending' | 'completed' | 'failed') => {
    let url = '/payment-advices';
    const params = new URLSearchParams();
    if (purchase_id) params.append('purchase_id', purchase_id);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<PaymentAdvice[]>(url);
  },

  // Get payment advice by ID
  getPaymentAdviceById: (id: string) => {
    return apiService.get<PaymentAdvice>(`/payment-advices/${id}`);
  },

  // Create payment advice
  createPaymentAdvice: (data: CreatePaymentAdviceRequest) => {
    return apiService.post<PaymentAdvice>('/payment-advices', data);
  },

  // Update payment advice
  updatePaymentAdvice: (id: string, data: UpdatePaymentAdviceRequest) => {
    return apiService.put<PaymentAdvice>(`/payment-advices/${id}`, data);
  },

  // Upload payment slip
  uploadSlip: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/payment-advices/${id}/upload-slip`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data.data;
  },

  // Add charge
  addCharge: (id: string, charge: AddChargeRequest) => {
    return apiService.post<PaymentAdvice>(`/payment-advices/${id}/charges`, charge);
  },

  // Remove charge
  removeCharge: (id: string, chargeId: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/payment-advices/${id}/charges/${chargeId}`);
  },

  // Get net payable
  getNetPayable: (id: string) => {
    return apiService.get<NetPayableResponse>(`/payment-advices/${id}/net-payable`);
  },

  // Delete payment advice
  deletePaymentAdvice: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/payment-advices/${id}`);
  },
};

