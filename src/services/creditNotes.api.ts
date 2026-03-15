import { apiService } from './api';
import type {
  CreditNote,
  CreateCreditNoteRequest,
  CreditNoteStatus,
} from '../types/sales';

const BASE = '/credit-notes';

export const creditNotesAPI = {
  list: (params?: { invoice_dispatch_id?: string; status?: CreditNoteStatus }) => {
    const search = new URLSearchParams();
    if (params?.invoice_dispatch_id)
      search.set('invoice_dispatch_id', params.invoice_dispatch_id);
    if (params?.status) search.set('status', params.status);
    const q = search.toString();
    return apiService.get<CreditNote[]>(q ? `${BASE}?${q}` : BASE);
  },

  getById: (id: string) => apiService.get<CreditNote>(`${BASE}/${id}`),

  create: (data: CreateCreditNoteRequest) =>
    apiService.post<CreditNote>(BASE, data),

  confirm: (id: string) => apiService.post<CreditNote>(`${BASE}/${id}/confirm`),
};
