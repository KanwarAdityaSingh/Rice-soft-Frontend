import { apiService } from './api';
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
  // Get all payment advices - now filters by sauda_id or inward_slip_pass_id
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

  // Get payment advice by ID
  getPaymentAdviceById: (id: string) => {
    return apiService.get<PaymentAdvice>(`/payment-advices/${id}`);
  },

  // Create payment advice
  createPaymentAdvice: (data: CreatePaymentAdviceRequest) => {
    const payload: CreatePaymentAdviceRequest = {
      ...data,
      ...(data.amount !== undefined && data.amount !== null
        ? { amount: floorNetPayable(data.amount) }
        : {}),
    };
    return apiService.post<PaymentAdvice>('/payment-advices', payload);
  },

  // Update payment advice (optional charges[] = full replace; omit charges to leave unchanged)
  updatePaymentAdvice: (id: string, data: UpdatePaymentAdviceRequest) => {
    const payload: UpdatePaymentAdviceRequest = {
      ...data,
      ...(data.amount !== undefined && data.amount !== null
        ? { amount: floorNetPayable(data.amount) }
        : {}),
    };
    return apiService.put<PaymentAdvice>(`/payment-advices/${id}`, payload);
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

  /** Document preview for create/edit — weights, summary, amount, net payable. */
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

  // Delete payment advice
  deletePaymentAdvice: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/payment-advices/${id}`);
  },

  // Get payment advice email/WhatsApp notification preview
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
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/payment-advices/preview`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, amount: floorNetPayable(data.amount) }),
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Failed to load preview');
    }
    return result.data;
  },

  // Send payment advice via email
  sendPaymentAdviceEmail: async (
    data: {
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
    }
  ) => {
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

    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/payment-advices/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Failed to send email');
    }
    return result.data;
  },

  // Send payment advice via WhatsApp
  sendPaymentAdviceWhatsApp: async (
    data: {
      whatsappNumbers: string[];
      adviceNumber: string;
      vendorName: string;
      amount: number;
      date: string;
      file?: File;
      pdfUrl?: string;
    }
  ) => {
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

    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/payment-advices/send-whatsapp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Failed to send WhatsApp');
    }
    return result.data;
  },
};

