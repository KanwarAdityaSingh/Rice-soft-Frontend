/**
 * Sales Module types – aligned with backend API shapes.
 * Entities: Sales Sauda, Invoice Dispatch, E-Invoice, E-Way Bill, Inventory Ledger, Credit Note.
 */

// --- Sales Sauda ---
export type SalesSaudaStatus = 'draft' | 'order' | 'cancelled';

export interface SalesSaudaLine {
  id: string;
  sales_sauda_id: string;
  product_id: string;
  packaging_id: string | null;
  quantity: number;
  quantity_unit: string;
  rate: number;
  amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SalesSauda {
  id: string;
  sales_party_id: string;
  status: SalesSaudaStatus;
  order_number: string | null;
  sauda_date: string;
  notes: string | null;
  total_amount: number | null; // header total; sent by frontend, stored on sauda
  created_at: string;
  updated_at: string;
  lines?: SalesSaudaLine[];
}

export interface SalesSaudaLineInput {
  product_id: string;
  packaging_id?: string | null;
  quantity: number;
  quantity_unit?: string;
  rate: number;
  sort_order?: number;
}

export interface CreateSalesSaudaRequest {
  sales_party_id: string;
  status: 'draft';
  sauda_date: string;
  notes?: string | null;
  total_amount?: number | null; // sum of line amounts; stored on sauda header
  lines?: SalesSaudaLineInput[];
}

export interface UpdateSalesSaudaRequest {
  sales_party_id?: string;
  status?: 'draft';
  sauda_date?: string;
  notes?: string | null;
  total_amount?: number | null;
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
  sales_sauda_id: string;
  internal_invoice_number: string;
  dispatch_date: string;
  party_name: string;
  party_address: string | null;
  party_gst_number: string | null;
  party_pan_number: string | null;
  transporter_id: string | null;
  vehicle_id: string | null;
  distance_km: number | null;
  route_description: string | null;
  status: InvoiceDispatchStatus;
  created_at: string;
  updated_at: string;
  lines?: InvoiceDispatchLine[];
}

export interface CreateInvoiceDispatchRequest {
  sales_sauda_id: string;
  internal_invoice_number: string;
  dispatch_date?: string;
  transporter_id?: string | null;
  vehicle_id?: string | null;
  distance_km?: number;
  route_description?: string | null;
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
  payload: unknown;
  created_at: string;
  updated_at: string;
}

export interface CreateEWayBillRequest {
  vehicle_number?: string;
  distance_km?: number;
  route?: string;
  transporter_id?: string;
}

// --- Inventory Ledger ---
export type InventoryLedgerSourceType =
  | 'purchase_inward'
  | 'sales_dispatch'
  | 'sale_return'
  | 'adjustment';

export interface InventoryLedgerEntry {
  id: string;
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
