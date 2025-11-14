import { apiService } from './api';
import type {
  PaymentAdvice,
  CreatePaymentAdviceRequest,
  UpdatePaymentAdviceRequest,
  PaymentAdviceStatus,
  PaymentAdviceCharge,
  CreatePaymentAdviceChargeRequest,
} from '../types/entities';

export const paymentAdvicesAPI = {
  // Get all payment advices
  getAllPaymentAdvices: (params?: {
    purchase_id?: string;
    status?: PaymentAdviceStatus;
  }) => {
    let url = '/payment-advices';
    const queryParams = new URLSearchParams();
    if (params?.purchase_id) queryParams.append('purchase_id', params.purchase_id);
    if (params?.status) queryParams.append('status', params.status);
    if (queryParams.toString()) url += `?${queryParams.toString()}`;
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
  uploadPaymentSlip: async (id: string, file: File) => {
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
      throw new Error(data.message || data.error || 'Upload failed');
    }
    return data.data as PaymentAdvice;
  },

  // Add charge to payment advice
  addCharge: (id: string, charge: CreatePaymentAdviceChargeRequest) => {
    return apiService.post<PaymentAdviceCharge>(`/payment-advices/${id}/charges`, charge);
  },

  // Remove charge from payment advice
  removeCharge: (id: string, chargeId: string) => {
    return apiService.delete<{ success: boolean; message: string }>(
      `/payment-advices/${id}/charges/${chargeId}`
    );
  },

  // Get net payable amount
  getNetPayable: (id: string) => {
    return apiService.get<{ net_payable: number }>(`/payment-advices/${id}/net-payable`);
  },

  // Delete payment advice
  deletePaymentAdvice: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/payment-advices/${id}`);
  },
};

