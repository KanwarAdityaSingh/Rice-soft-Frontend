import { API_BASE_URL, apiService } from './api';
import { authenticatedFetchEnvelopeData } from './authenticatedFetch';
import type {
  InvoiceDispatch,
  CreateInvoiceDispatchRequest,
  UpdateInvoiceDispatchRequest,
  PatchInvoiceDispatchRequest,
  InvoiceDispatchStatus,
  EInvoice,
  EWayBill,
  CreateEWayBillRequest,
  EWayBillPreviewResponse,
  UploadInvoiceDispatchBiltiResponse,
  UploadInvoiceDispatchReceivingDocResponse,
} from '../types/sales';

const BASE = '/invoice-dispatches';

export const invoiceDispatchesAPI = {
  list: (params?: {
    sales_sauda_id?: string;
    status?: InvoiceDispatchStatus;
    godown_id?: string;
    /** Indian FY label e.g. "2025-2026" */
    financial_year?: string;
  }) => {
    const search = new URLSearchParams();
    if (params?.sales_sauda_id) search.set('sales_sauda_id', params.sales_sauda_id);
    if (params?.status) search.set('status', params.status);
    if (params?.godown_id) search.set('godown_id', params.godown_id);
    if (params?.financial_year) search.set('financial_year', params.financial_year);
    const q = search.toString();
    return apiService.get<InvoiceDispatch[]>(q ? `${BASE}?${q}` : BASE);
  },

  getById: (id: string) => apiService.get<InvoiceDispatch>(`${BASE}/${id}`),

  create: (data: CreateInvoiceDispatchRequest) =>
    apiService.post<InvoiceDispatch>(BASE, data),

  /**
   * PUT /invoice-dispatches/:id — draft, confirmed, or cancelled.
   * Editable logistics only (no inventory impact). Locked: sauda, godown, invoice number, status, lines.
   */
  update: (id: string, data: UpdateInvoiceDispatchRequest) =>
    apiService.put<InvoiceDispatch>(`${BASE}/${id}`, data),

  patch: (id: string, data: PatchInvoiceDispatchRequest) =>
    apiService.patch<InvoiceDispatch>(`${BASE}/${id}`, data),

  /**
   * DELETE /invoice-dispatches/:id
   * - draft: hard delete
   * - confirmed: reverse inventory (restore source FGI; godown transfer also reverses destination), then hard delete
   * - cancelled: hard delete (stock already reversed)
   * 409 when credit notes or an e-invoice exist on the dispatch.
   */
  delete: (id: string) =>
    apiService.delete<{ success: boolean; message?: string }>(`${BASE}/${id}`),

  confirm: (id: string) => apiService.post<InvoiceDispatch>(`${BASE}/${id}/confirm`),

  /**
   * POST /invoice-dispatches/:id/cancel
   * Confirmed godown transfers only (`to_godown_id` required).
   * Reverses FGI at destination then restores source; status → cancelled.
   * Fails if destination stock was already consumed.
   */
  cancel: (id: string) => apiService.post<InvoiceDispatch>(`${BASE}/${id}/cancel`),

  /**
   * POST /invoice-dispatches/:id/upload-bilti
   * multipart field `file` — jpeg/png/gif or pdf, max 10MB (same pattern as ISP bilti).
   */
  uploadBilti: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return authenticatedFetchEnvelopeData<UploadInvoiceDispatchBiltiResponse>(
      `${API_BASE_URL}${BASE}/${id}/upload-bilti`,
      { method: 'POST', body: formData }
    );
  },

  /**
   * POST /invoice-dispatches/:id/upload-receiving-doc
   * multipart field `file` — jpeg/png/gif or pdf, max 10MB (same pattern as bilti).
   */
  uploadReceivingDoc: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return authenticatedFetchEnvelopeData<UploadInvoiceDispatchReceivingDocResponse>(
      `${API_BASE_URL}${BASE}/${id}/upload-receiving-doc`,
      { method: 'POST', body: formData }
    );
  },

  /** Get e-invoice for dispatch (Masters India); returns null if not yet generated */
  getEInvoice: (id: string) =>
    apiService.get<EInvoice | null>(`${BASE}/${id}/e-invoice`),

  /** Generate e-invoice via Masters India (idempotent if IRN already exists) */
  generateEInvoice: (id: string) =>
    apiService.post<EInvoice>(`${BASE}/${id}/e-invoice`),

  /** Get e-way bill(s) for dispatch (newest first); empty array if none */
  getEWayBills: (id: string) =>
    apiService.get<EWayBill[]>(`${BASE}/${id}/e-way-bill`),

  /**
   * Preview e-way bill payload (same prep as generate, including distance API).
   * Does not generate or persist.
   */
  previewEWayBill: (id: string, body?: CreateEWayBillRequest) =>
    apiService.post<EWayBillPreviewResponse>(`${BASE}/${id}/e-way-bill/preview`, body ?? {}),

  /**
   * Generate e-way bill via Masters India.
   * Body may include vehicle_number, distance_km, route, transporter_id, lr_number.
   */
  generateEWayBill: (
    id: string,
    options?: { body?: CreateEWayBillRequest; force?: boolean }
  ) => {
    const params = new URLSearchParams();
    if (options?.force) params.set('force', 'true');
    const q = params.toString();
    const path = q ? `${BASE}/${id}/e-way-bill?${q}` : `${BASE}/${id}/e-way-bill`;
    return apiService.post<EWayBill>(path, options?.body ?? {});
  },
};
