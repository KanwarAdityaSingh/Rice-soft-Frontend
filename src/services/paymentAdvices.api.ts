import { API_BASE_URL, apiService } from './api';
import { authenticatedFetch, authenticatedFetchEnvelopeData } from './authenticatedFetch';
import { floorNetPayable } from '../utils/money';
import type {
  PaymentAdvice,
  CreatePaymentAdviceRequest,
  UpdatePaymentAdviceRequest,
  AddChargeRequest,
  NetPayableResponse,
  PaymentAdvicePreviewResponse,
} from '../types/entities';

export const paymentAdvicesAPI = {
  getAllPaymentAdvices: (
    sauda_id?: string,
    inward_slip_pass_id?: string,
    status?: 'pending' | 'completed' | 'failed'
  ) => {
    let url = '/payment-advices';
    const params = new URLSearchParams();
    if (sauda_id) params.append('sauda_id', sauda_id);
    if (inward_slip_pass_id) params.append('inward_slip_pass_id', inward_slip_pass_id);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<PaymentAdvice[]>(url);
  },

  getPaymentAdviceById: (id: string) => {
    return apiService.get<PaymentAdvice>(`/payment-advices/${id}`);
  },

  createPaymentAdvice: (data: CreatePaymentAdviceRequest) => {
    const payload: CreatePaymentAdviceRequest = {
      ...data,
      ...(data.amount !== undefined && data.amount !== null
        ? { amount: floorNetPayable(data.amount) }
        : {}),
    };
    return apiService.post<PaymentAdvice>('/payment-advices', payload);
  },

  updatePaymentAdvice: (id: string, data: UpdatePaymentAdviceRequest) => {
    const payload: UpdatePaymentAdviceRequest = {
      ...data,
      ...(data.amount !== undefined && data.amount !== null
        ? { amount: floorNetPayable(data.amount) }
        : {}),
    };
    return apiService.put<PaymentAdvice>(`/payment-advices/${id}`, payload);
  },

  uploadSlip: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return authenticatedFetchEnvelopeData(`${API_BASE_URL}/payment-advices/${id}/upload-slip`, {
      method: 'POST',
      body: formData,
    });
  },

  addCharge: (id: string, charge: AddChargeRequest) => {
    return apiService.post<PaymentAdvice>(`/payment-advices/${id}/charges`, charge);
  },

  removeCharge: (id: string, chargeId: string) => {
    return apiService.delete<{ success: boolean; message: string }>(
      `/payment-advices/${id}/charges/${chargeId}`
    );
  },

  getNetPayable: (id: string) => {
    return apiService.get<NetPayableResponse>(`/payment-advices/${id}/net-payable`);
  },

  fetchPaymentAdvicePreview: (params: {
    sauda_id?: string;
    inward_slip_pass_id?: string;
    godown_id?: string;
    total_charges?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.sauda_id) searchParams.set('sauda_id', params.sauda_id);
    if (params.inward_slip_pass_id) searchParams.set('inward_slip_pass_id', params.inward_slip_pass_id);
    if (params.godown_id) searchParams.set('godown_id', params.godown_id);
    if (params.total_charges !== undefined) searchParams.set('total_charges', String(params.total_charges));
    const q = searchParams.toString();
    return apiService.get<PaymentAdvicePreviewResponse>(
      q ? `/payment-advices/preview?${q}` : '/payment-advices/preview'
    );
  },

  deletePaymentAdvice: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/payment-advices/${id}`);
  },

  getPaymentAdviceNotificationPreview: async (data: {
    adviceNumber: string;
    vendorName: string;
    amount: number;
    date: string;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
    };
  }) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/payment-advices/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, amount: floorNetPayable(data.amount) }),
    });
    const result = await response.json();
    apiService.inspectSessionFromResponse(result);
    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Failed to load preview');
    }
    return result.data;
  },

  sendPaymentAdviceEmail: async (data: {
    emails: string[];
    adviceNumber: string;
    vendorName: string;
    amount: number;
    date: string;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
    };
    file: File;
  }) => {
    const formData = new FormData();
    formData.append('emails', JSON.stringify(data.emails));
    formData.append('adviceNumber', data.adviceNumber);
    formData.append('vendorName', data.vendorName);
    formData.append('amount', floorNetPayable(data.amount).toString());
    formData.append('date', data.date);
    if (data.bankDetails) {
      formData.append('bankDetails', JSON.stringify(data.bankDetails));
    }
    formData.append('file', data.file);

    const response = await authenticatedFetch(`${API_BASE_URL}/payment-advices/send-email`, {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    apiService.inspectSessionFromResponse(result);
    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Failed to send email');
    }
    return result.data;
  },

  sendPaymentAdviceWhatsApp: async (data: {
    whatsappNumbers: string[];
    adviceNumber: string;
    vendorName: string;
    amount: number;
    date: string;
    file?: File;
    pdfUrl?: string;
  }) => {
    const formData = new FormData();
    formData.append('whatsappNumbers', JSON.stringify(data.whatsappNumbers));
    formData.append('adviceNumber', data.adviceNumber);
    formData.append('vendorName', data.vendorName);
    formData.append('amount', floorNetPayable(data.amount).toString());
    formData.append('date', data.date);
    if (data.file) {
      formData.append('file', data.file);
    } else if (data.pdfUrl) {
      formData.append('pdfUrl', data.pdfUrl);
    }

    const response = await authenticatedFetch(`${API_BASE_URL}/payment-advices/send-whatsapp`, {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    apiService.inspectSessionFromResponse(result);
    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Failed to send WhatsApp');
    }
    return result.data;
  },
};
