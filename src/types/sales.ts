/**
 * Sales Module types – aligned with backend API shapes.
 * Entities: Sales Sauda, Invoice Dispatch, E-Invoice, E-Way Bill, Inventory Ledger, Credit Note.
 */

import type { VendorAddress } from './entities';
import type { SalesSaudaType } from '../constants/sales-sauda-types';

export type { SalesSaudaType };

// --- Sales Sauda ---
export type SalesSaudaStatus = 'draft' | 'order' | 'cancelled';

/** Same address shape as vendors / sales parties */
export type SalesSaudaAddress = VendorAddress;

export interface SalesSaudaLine {
  id: string;
  sales_sauda_id: string;
  product_id: string;
  packaging_id: string | null;
  packet_count: number | null;
  quantity: number;
  quantity_unit: string;
  rate: number;
  discount_value: number;
  discount_type: 'per_kg' | 'percentage';
  gst_percent: number;
  amount: number;
  discount_amount: number;
  gst_amount: number;
  final_amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SalesSauda {
  id: string;
  /** Short display code when present (e.g. "A95B") */
  display_id?: string | null;
  sales_party_id: string;
  /** Joined from sales parties when API includes it */
  sales_party_name?: string | null;
  /** Optional FK → salesmen.id */
  salesman_id: string | null;
  /** Joined from salesmen on list/detail responses */
  salesman_name?: string | null;
  status: SalesSaudaStatus;
  /** `ex` | `for` — required on create (migration 174) */
  sauda_type?: SalesSaudaType | null;
  order_number: string | null;
  sauda_date: string;
  /** Indian FY from sauda_date, e.g. "2025-2026" (unique with order_number per FY) */
  financial_year?: string | null;
  /** Optional; same shape as vendor/sales-party address. Pass null to clear. */
  billing_address?: SalesSaudaAddress | null;
  /** Optional; same shape as vendor/sales-party address. Pass null to clear. */
  delivery_address?: SalesSaudaAddress | null;
  payment_terms: number | null;
  notes: string | null;
  amount: number | null;
  total_amount?: number | null; // backward compatibility
  created_at: string;
  updated_at: string;
  lines?: SalesSaudaLine[];
}

export interface SalesSaudaLineInput {
  product_id: string;
  packaging_id?: string | null;
  packet_count?: number;
  quantity?: number;
  quantity_unit?: string;
  rate: number;
  discount_value?: number;
  discount_type?: 'per_kg' | 'percentage';
  gst_percent?: number;
  sort_order?: number;
}

export interface CreateSalesSaudaRequest {
  sales_party_id: string;
  status: 'draft';
  sauda_date: string;
  /** Required: `ex` | `for` */
  sauda_type: SalesSaudaType;
  /** Optional FK → salesmen.id */
  salesman_id?: string | null;
  billing_address?: SalesSaudaAddress | null;
  delivery_address?: SalesSaudaAddress | null;
  payment_terms?: number | null;
  notes?: string | null;
  lines?: SalesSaudaLineInput[];
}

export interface UpdateSalesSaudaRequest {
  sales_party_id?: string;
  status?: 'draft';
  sauda_date?: string;
  sauda_type?: SalesSaudaType;
  /** Pass `null` to clear */
  salesman_id?: string | null;
  /** Pass `null` to clear */
  billing_address?: SalesSaudaAddress | null;
  /** Pass `null` to clear */
  delivery_address?: SalesSaudaAddress | null;
  payment_terms?: number | null;
  notes?: string | null;
  lines?: SalesSaudaLineInput[];
}

// --- Invoice Dispatch ---
export type InvoiceDispatchStatus = 'draft' | 'confirmed';

export interface InvoiceDispatchLine {
  id: string;
  invoice_dispatch_id: string;
  sales_sauda_line_id: string;
  product_id: string;
  packaging_id: string | null;
  quantity: number;
  quantity_unit: string;
  rate: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceDispatch {
  id: string;
  godown_id?: string;
  sales_sauda_id: string;
  internal_invoice_number: string;
  dispatch_date: string;
  /** Indian FY from dispatch_date, e.g. "2025-2026" */
  financial_year?: string | null;
  party_name: string;
  party_address: string | null;
  party_gst_number: string | null;
  party_pan_number: string | null;
  /** Optional; for parties without GST/PAN (max 2000). */
  usp?: string | null;
  /** Optional ship-to; references sales_party_sites. `null` = same as bill-to. */
  delivery_site_id?: string | null;
  lr_number?: string | null;
  tcs_amount?: number | null;
  transporter_id: string | null;
  vehicle_id: string | null;
  /** Optional freight / transport charge (≥ 0) */
  transportation_cost?: number | null;
  distance_km: number | null;
  route_description: string | null;
  /** Bilti/LR image (jpeg/png/gif) when uploaded */
  bilti_image_url?: string | null;
  /** Bilti/LR PDF when uploaded */
  bilti_pdf_url?: string | null;
  status: InvoiceDispatchStatus;
  created_at: string;
  updated_at: string;
  lines?: InvoiceDispatchLine[];
}

export interface UploadInvoiceDispatchBiltiResponse {
  url: string;
  bilti_image_url?: string | null;
  bilti_pdf_url?: string | null;
}

/** Server generates `internal_invoice_number` from godown GST state + dispatch_date FY — do not send it. */
export interface CreateInvoiceDispatchRequest {
  godown_id: string;
  sales_sauda_id: string;
  dispatch_date?: string;
  delivery_site_id?: string | null;
  lr_number?: string | null;
  tcs_amount?: number | null;
  /** Optional; string max 2000, or null */
  usp?: string | null;
  transporter_id?: string | null;
  vehicle_id?: string | null;
  /** Optional freight / transport charge (≥ 0) */
  transportation_cost?: number | null;
  distance_km?: number;
  route_description?: string | null;
}

/** At least one field required by API; use `delivery_site_id: null` to clear ship-to. */
export interface PatchInvoiceDispatchRequest {
  delivery_site_id?: string | null;
  lr_number?: string | null;
  tcs_amount?: number | null;
}

// --- E-Invoice ---
export interface EInvoice {
  id: string;
  invoice_dispatch_id: string;
  irn: string | null;
  acknowledgement_number: string | null;
  ack_date: string | null;
  qr_code_content: string | null;
  government_response_payload: unknown;
  status: string;
  /** e.g. masters_india | mock — when returned by API */
  provider?: string | null;
  created_at: string;
  updated_at: string;
}

// --- E-Way Bill ---
export interface EWayBill {
  id: string;
  invoice_dispatch_id: string;
  credit_note_id: string | null;
  eway_bill_number: string | null;
  vehicle_number: string | null;
  distance_km: number | null;
  route: string | null;
  transporter_id: string | null;
  /** Masters India PDF / print link when returned */
  print_url?: string | null;
  valid_until?: string | null;
  payload: unknown;
  /** e.g. masters_india | mock — when returned by API */
  provider?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEWayBillRequest {
  /** Optional overrides sent to Masters India e-way bill API */
  vehicle_number?: string;
  distance_km?: number;
  route?: string;
  transporter_id?: string;
  /**
   * LR / transporter document number override.
   * Sent to Masters India as transporter_document_number.
   * If omitted, generate uses dispatch.lr_number when set.
   */
  lr_number?: string;
}

// --- Inventory Ledger ---
export type InventoryLedgerSourceType =
  | 'purchase_inward'
  | 'sales_dispatch'
  | 'sale_return'
  | 'adjustment';

export interface InventoryLedgerEntry {
  id: string;
  godown_id?: string;
  product_id: string;
  quantity_change: number;
  source_type: InventoryLedgerSourceType;
  source_id: string | null;
  stock_before: number;
  stock_after: number;
  reference_type: string | null;
  reference_id: string | null;
  batch_id: string | null;
  packaging_id: string | null;
  created_at: string;
  created_by: string | null;
}

// --- Credit Note ---
export type CreditNoteStatus = 'draft' | 'confirmed';

export interface CreditNoteLine {
  id: string;
  credit_note_id: string;
  invoice_dispatch_line_id: string;
  product_id: string;
  quantity_returned: number;
  created_at: string;
  updated_at: string;
}

export interface CreditNote {
  id: string;
  invoice_dispatch_id: string;
  sales_sauda_id: string;
  credit_note_number: string;
  credit_note_date: string;
  /** Indian FY from credit_note_date, e.g. "2025-2026" */
  financial_year?: string | null;
  status: CreditNoteStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
  lines?: CreditNoteLine[];
}

export interface CreditNoteLineInput {
  invoice_dispatch_line_id: string;
  product_id: string;
  quantity_returned: number;
}

export interface CreateCreditNoteRequest {
  invoice_dispatch_id: string;
  sales_sauda_id: string;
  credit_note_number: string;
  credit_note_date: string;
  reason?: string | null;
  lines: CreditNoteLineInput[];
}
