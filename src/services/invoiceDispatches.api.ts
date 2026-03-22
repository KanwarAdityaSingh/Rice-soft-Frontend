import { apiService } from './api';
import type {
  InvoiceDispatch,
  CreateInvoiceDispatchRequest,
  InvoiceDispatchStatus,
  EInvoice,
  EWayBill,
  CreateEWayBillRequest,
} from '../types/sales';

const BASE = '/invoice-dispatches';

export const invoiceDispatchesAPI = {
  list: (params?: {
    sales_sauda_id?: string;
    status?: InvoiceDispatchStatus;
    godown_id?: string;
  }) => {
    const search = new URLSearchParams();
    if (params?.sales_sauda_id) search.set('sales_sauda_id', params.sales_sauda_id);
    if (params?.status) search.set('status', params.status);
    if (params?.godown_id) search.set('godown_id', params.godown_id);
    const q = search.toString();
    return apiService.get<InvoiceDispatch[]>(q ? `${BASE}?${q}` : BASE);
  },

  getById: (id: string) => apiService.get<InvoiceDispatch>(`${BASE}/${id}`),

  create: (data: CreateInvoiceDispatchRequest) =>
    apiService.post<InvoiceDispatch>(BASE, data),

  confirm: (id: string) => apiService.post<InvoiceDispatch>(`${BASE}/${id}/confirm`),

  /** Get e-invoice for dispatch; returns null if not yet generated */
  getEInvoice: (id: string) =>
    apiService.get<EInvoice | null>(`${BASE}/${id}/e-invoice`),

  generateEInvoice: (id: string) =>
    apiService.post<EInvoice>(`${BASE}/${id}/e-invoice`),

  /** Get e-way bill(s) for dispatch (newest first); empty array if none */
  getEWayBills: (id: string) =>
    apiService.get<EWayBill[]>(`${BASE}/${id}/e-way-bill`),

  generateEWayBill: (id: string, body?: CreateEWayBillRequest) =>
    apiService.post<EWayBill>(`${BASE}/${id}/e-way-bill`, body ?? {}),
};
