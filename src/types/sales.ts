/**
 * Sales Module types – aligned with backend API shapes.
 * Entities: Sales Sauda, Invoice Dispatch, E-Invoice, E-Way Bill, Inventory Ledger, Credit Note.
 */

import type { VendorAddress } from './entities';
import type { SalesSaudaType } from '../constants/sales-sauda-types';
import type { SalesMovementType } from '../constants/sales-movement-types';

export type { SalesSaudaType, SalesMovementType };

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
  /** Ordered quantity (same as quantity when fulfillment fields are present). */
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
  /**
   * Fulfillment snapshot from GET /sales-saudas/:id.
   * remaining = ordered − allocated(draft+confirmed) + returned(confirmed credit notes)
   */
  ordered?: number;
  allocated?: number;
  returned?: number;
  remaining?: number;
}

export interface SalesSauda {
  id: string;
  /** Short display code when present (e.g. "A95B") */
  display_id?: string | null;
  /**
   * Required for sale; for godown_transfer the server links/creates the to-godown party.
   */
  sales_party_id: string;
  /** Joined from sales parties when API includes it */
  sales_party_name?: string | null;
  /** Optional FK → salesmen.id */
  salesman_id: string | null;
  /** Joined from salesmen on list/detail responses */
  salesman_name?: string | null;
  status: SalesSaudaStatus;
  /** `sale` (default) | `godown_transfer` — migration 181 */
  movement_type?: SalesMovementType | null;
  /** Source godown when movement_type is godown_transfer */
  from_godown_id?: string | null;
  /** Destination godown when movement_type is godown_transfer */
  to_godown_id?: string | null;
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
  /**
   * Required for sale. Omit for godown_transfer (server resolves from to-godown).
   */
  sales_party_id?: string;
  status: 'draft';
  sauda_date: string;
  /** Required: `ex` | `for` */
  sauda_type: SalesSaudaType;
  /** Default `sale`. Use `godown_transfer` for inter-godown stock move. */
  movement_type?: SalesMovementType;
  from_godown_id?: string | null;
  to_godown_id?: string | null;
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
  movement_type?: SalesMovementType;
  from_godown_id?: string | null;
  to_godown_id?: string | null;
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
/** `cancelled` = reversed confirmed godown transfer (migration 182). */
export type InvoiceDispatchStatus = 'draft' | 'confirmed' | 'cancelled';

export interface InvoiceDispatchLine {
  id: string;
  invoice_dispatch_id: string;
  sales_sauda_line_id: string;
  product_id: string;
  packaging_id: string | null;
  /** Bags/packets when created via packet_count (migration 180). */
  packet_count?: number | null;
  quantity: number;
  quantity_unit: string;
  rate: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceDispatch {
  id: string;
  /** Dispatch / source godown (for transfer: from godown). */
  godown_id?: string;
  /** Destination godown when sauda is godown_transfer (migration 181). */
  to_godown_id?: string | null;
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
  /** Receiving document image (jpeg/png/gif) when uploaded — migration 184 */
  receiving_doc_image_url?: string | null;
  /** Receiving document PDF when uploaded — migration 184 */
  receiving_doc_pdf_url?: string | null;
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

export interface UploadInvoiceDispatchReceivingDocResponse {
  url: string;
  receiving_doc_image_url?: string | null;
  receiving_doc_pdf_url?: string | null;
}

/**
 * Partial dispatch line — product/rate/packaging come from the sauda line.
 * Omit `lines` on create to ship all remaining qty on every line.
 *
 * Prefer `packet_count` (bags) when the sauda line has packaging_id:
 * backend sets quantity = packet_count × holding_capacity.
 * You may send `quantity` only, or both (they must match).
 */
export interface CreateInvoiceDispatchLineInput {
  sales_sauda_line_id: string;
  /** Bags; requires sauda line packaging_id. quantity = bags × capacity. */
  packet_count?: number;
  /** kg (or line unit); must be ≤ remaining. Optional if packet_count is sent. */
  quantity?: number;
}

/** Server generates `internal_invoice_number` from godown GST state + dispatch_date FY — do not send it. */
export interface CreateInvoiceDispatchRequest {
  /** Source godown — for godown_transfer must be the sauda’s from_godown_id. */
  godown_id: string;
  sales_sauda_id: string;
  /** Destination godown for godown_transfer (usually sauda.to_godown_id). */
  to_godown_id?: string | null;
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
  /**
   * Partial fulfill: one entry per sauda line, quantity ≤ remaining.
   * Omit to ship full remaining on all lines.
   */
  lines?: CreateInvoiceDispatchLineInput[];
}

/** At least one field required by API; use `delivery_site_id: null` to clear ship-to. */
export interface PatchInvoiceDispatchRequest {
  delivery_site_id?: string | null;
  lr_number?: string | null;
  tcs_amount?: number | null;
}

/**
 * PUT /invoice-dispatches/:id — draft, confirmed, or cancelled.
 * Editable: dispatch_date, transporter_id, vehicle_id, lr_number, transportation_cost,
 * distance_km, route_description, usp (no inventory impact).
 * Locked: sales_sauda_id, godown_id, internal_invoice_number, status, lines/quantities.
 */
export interface UpdateInvoiceDispatchRequest {
  dispatch_date?: string;
  transporter_id?: string | null;
  vehicle_id?: string | null;
  lr_number?: string | null;
  transportation_cost?: number | null;
  distance_km?: number | null;
  route_description?: string | null;
  usp?: string | null;
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

/**
 * How distance_km was resolved for e-way preview/generate.
 * `unavailable` = Masters India distance call failed; preview still returns 200 with
 * `distance_km: null` and `distance_error` — FE should let the user enter distance before generate.
 */
export type EWayDistanceSource =
  | 'request'
  | 'dispatch'
  | 'masters_india'
  | 'unavailable';

/** Masters India generate-e-way request body (subset we render for Bill of Supply). */
export interface MastersIndiaEWayPayload {
  userGstin?: string;
  supply_type?: string;
  sub_supply_type?: string;
  document_type?: string;
  document_number?: string;
  document_date?: string;
  gstin_of_consignor?: string;
  legal_name_of_consignor?: string;
  address1_of_consignor?: string;
  address2_of_consignor?: string;
  place_of_consignor?: string;
  pincode_of_consignor?: string | number;
  state_of_consignor?: string;
  actual_from_state_name?: string;
  gstin_of_consignee?: string;
  legal_name_of_consignee?: string;
  address1_of_consignee?: string;
  address2_of_consignee?: string;
  place_of_consignee?: string;
  pincode_of_consignee?: string | number;
  state_of_supply?: string;
  actual_to_state_name?: string;
  total_invoice_value?: number;
  taxable_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  cess_amount?: number;
  transporter_id?: string;
  transporter_name?: string;
  transporter_document_number?: string;
  transporter_document_date?: string;
  transportation_mode?: string;
  transportation_distance?: string | number;
  vehicle_number?: string;
  vehicle_type?: string;
  itemList?: MastersIndiaEWayItem[];
  [key: string]: unknown;
}

export interface MastersIndiaEWayItem {
  product_name?: string;
  product_description?: string;
  hsn_code?: string | number;
  quantity?: number;
  unit_of_product?: string;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cess_rate?: number;
  taxable_amount?: number;
  [key: string]: unknown;
}

/** UI-friendly summary from POST …/e-way-bill/preview */
export interface EWayBillPreviewSummary {
  document_number?: string | null;
  document_date?: string | null;
  document_type?: string | null;
  distance_km?: number | null;
  distance_source?: EWayDistanceSource | null;
  /** Present when Masters India distance failed (preview still succeeds). */
  distance_error?: string | null;
  vehicle_number?: string | null;
  transporter_name?: string | null;
  lr_number?: string | null;
  taxable_amount?: number | null;
  total_invoice_value?: number | null;
  consignor_name?: string | null;
  consignee_name?: string | null;
  [key: string]: unknown;
}

/** Flat line items on e-way preview (in addition to masters_india_payload.itemList). */
export interface EWayBillPreviewItem {
  product_name?: string | null;
  hsn_code?: string | number | null;
  quantity?: number | null;
  unit?: string | null;
  /** Bag/packet count when quantity is weight (e.g. KGS). */
  bags?: number | null;
  taxable_amount?: number | null;
}

/** Address block on preview consignor / consignee. */
export interface EWayBillPreviewAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  state_name?: string | null;
  pincode?: string | null;
  country?: string | null;
}

export interface EWayBillPreviewContactPerson {
  name?: string | null;
  phones?: string[] | null;
  emails?: string[] | null;
}

/** Dispatch godown / supplier side of preview. */
export interface EWayBillPreviewConsignor {
  id?: string | null;
  gstin?: string | null;
  name?: string | null;
  pincode?: string | null;
  place?: string | null;
  state?: string | null;
  state_code?: string | null;
  state_name?: string | null;
  address?: EWayBillPreviewAddress | null;
  phone?: string | null;
  email?: string | null;
  contact_persons?: EWayBillPreviewContactPerson[] | null;
  google_maps_link?: string | null;
}

/**
 * Buyer / party side of preview.
 * `address` = ship-to; `billing_address` may differ (bill-to).
 */
export interface EWayBillPreviewConsignee {
  id?: string | null;
  gstin?: string | null;
  name?: string | null;
  pincode?: string | null;
  place?: string | null;
  state?: string | null;
  state_code?: string | null;
  state_name?: string | null;
  /** Ship-to */
  address?: EWayBillPreviewAddress | null;
  /** Bill-to when different from ship-to */
  billing_address?: EWayBillPreviewAddress | null;
  phone?: string | null;
  email?: string | null;
  pan_number?: string | null;
  registration_type?: string | null;
  contact_persons?: EWayBillPreviewContactPerson[] | null;
  google_location_link?: string | null;
}

export interface EWayBillPreviewTransporter {
  id?: string | null;
  name?: string | null;
  gst_number?: string | null;
}

export interface EWayBillPreviewTotals {
  taxable?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  invoice_value?: number | null;
}

/**
 * POST /invoice-dispatches/:id/e-way-bill/preview
 * Same prep as generate; does not write to DB or call generate.
 * Rich FE fields (consignor/consignee/transporter/totals) are preferred over
 * parsing masters_india_payload alone.
 */
export interface EWayBillPreviewResponse {
  summary?: EWayBillPreviewSummary | null;
  dispatch_id?: string;
  already_generated?: boolean;
  existing_eway_bill_number?: string | null;
  document_number?: string | null;
  document_type?: string | null;
  document_date?: string | null;
  vehicle_number?: string | null;
  distance_km?: number | null;
  distance_source?: EWayDistanceSource | null;
  /**
   * When Masters India distance fails, preview still returns 200 with
   * `distance_km: null`, `distance_source: "unavailable"`, and this message.
   */
  distance_error?: string | null;
  route?: string | null;
  lr_number?: string | null;
  transporter?: EWayBillPreviewTransporter | null;
  consignor?: EWayBillPreviewConsignor | null;
  consignee?: EWayBillPreviewConsignee | null;
  totals?: EWayBillPreviewTotals | null;
  items?: EWayBillPreviewItem[];
  masters_india_payload: MastersIndiaEWayPayload;
  [key: string]: unknown;
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
