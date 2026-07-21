import type {
  EWayBillPreviewAddress,
  EWayBillPreviewConsignee,
  EWayBillPreviewConsignor,
  EWayBillPreviewContactPerson,
  EWayBillPreviewResponse,
  EWayDistanceSource,
  MastersIndiaEWayItem,
  MastersIndiaEWayPayload,
} from '../types/sales';
import { formatInrAmountInWords } from './inrAmountInWords';

export interface BillOfSupplyLineVm {
  slNo: number;
  description: string;
  descriptionSub: string;
  hsn: string;
  qty: string;
  unit: string;
  rate: string;
  discount: string;
  amount: string;
  amountValue: number;
  /** @deprecated kept for callers that still read bags */
  bags: string;
  /** Combined qty + unit (legacy) */
  quantity: string;
  per: string;
}

export interface BillOfSupplyViewModel {
  documentTitle: string;
  documentSubtitle: string;
  companyName: string;
  companyTagline: string;
  companyAddress: string;
  companyGstin: string;
  companyPan: string;
  companyLlpin: string;
  companyIec: string;
  companyPhones: string[];
  companyEmail: string;
  companyWebsite: string;
  udyamNo: string;
  fssai: string;
  invoiceNo: string;
  invoiceDate: string;
  placeOfSupply: string;
  stateCode: string;
  vehicleNo: string;
  orderNo: string;
  orderDate: string;
  dispatchDocNo: string;
  dispatchFrom: string;
  destination: string;
  shipToPlace: string;
  paymentTerms: string;
  grLrNo: string;
  grLrDate: string;
  transporter: string;
  modeOfPayment: string;
  termsOfDelivery: string;
  billToName: string;
  billToAddress: string;
  billToGstin: string;
  billToPos: string;
  billToPan: string;
  billToMobile: string;
  billToEmail: string;
  shipToName: string;
  shipToAddress: string;
  shipToGstin: string;
  shipToPos: string;
  shipToPan: string;
  lines: BillOfSupplyLineVm[];
  totalBags: string;
  totalQuantity: string;
  /** Numeric total qty for table footer (e.g. "1,000") */
  totalQtySum: string;
  /** Common unit when all lines share one (e.g. "KG"); else empty */
  totalUnit: string;
  totalAmount: string;
  totalAmountValue: number;
  taxableValue: string;
  roundOff: string;
  grandTotal: string;
  amountInWords: string;
  taxAmountInWords: string;
  hsnSummary: { hsn: string; taxableValue: string }[];
  remarks: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  bankIfsc: string;
  bankBranchIfsc: string;
  authorisedSignatory: string;
  declaration: string;
  legalTerms: string[];
  disclaimer: string;
  jurisdiction: string;
  eInvoiceIrn: string;
  eInvoiceAckNo: string;
  eInvoiceAckDate: string;
  eWayBillNo: string;
  eWayBillDate: string;
  distanceKm: string;
  distanceSource: EWayDistanceSource | null;
  /** Masters India distance failure message (preview still succeeds). */
  distanceError: string;
}

/** Resolved distance (km) from preview payload, or null when missing/unavailable. */
export function resolvePreviewDistanceKm(
  preview: EWayBillPreviewResponse | null | undefined,
): number | null {
  if (!preview) return null;
  const summary = preview.summary ?? {};
  const payload = unwrapPayload(preview.masters_india_payload ?? preview);
  return (
    num(preview.distance_km) ??
    num(summary.distance_km) ??
    num(payload.transportation_distance)
  );
}

export function resolvePreviewDistanceSource(
  preview: EWayBillPreviewResponse | null | undefined,
): EWayDistanceSource | null {
  if (!preview) return null;
  const summary = preview.summary ?? {};
  return (
    (preview.distance_source as EWayDistanceSource | null | undefined) ??
    (summary.distance_source as EWayDistanceSource | null | undefined) ??
    null
  );
}

export function resolvePreviewDistanceError(
  preview: EWayBillPreviewResponse | null | undefined,
): string {
  if (!preview) return '';
  const summary = preview.summary ?? {};
  return str(preview.distance_error) || str(summary.distance_error);
}

/**
 * True when generate needs a manual `distance_km` override:
 * MI distance failed (`unavailable`) or no distance was resolved.
 */
export function needsManualDistanceKm(
  preview: EWayBillPreviewResponse | null | undefined,
): boolean {
  if (!preview) return true;
  const source = resolvePreviewDistanceSource(preview);
  if (source === 'unavailable') return true;
  return resolvePreviewDistanceKm(preview) == null;
}

const DEFAULT_TAGLINE = 'NOURISHING PURITY, ENRICHING LIFE';
const DEFAULT_DOC_SUBTITLE =
  '(Under Section 31(3)(c) of CGST Act, 2017 read with Rule 49 of CGST Rules, 2017)';
const DEFAULT_DECLARATION =
  'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. We further declare that the goods covered under this Bill of Supply are taxable / exempt as applicable under GST law.';
const DEFAULT_DISCLAIMER =
  'This is a computer-generated Bill of Supply. In case of any discrepancy in E-Invoice / E-Way Bill details, the particulars available on the government portal shall prevail. Cancellation or amendment requests must follow statutory timelines.';
const DEFAULT_LEGAL_TERMS = [
  'Goods once sold will not be taken back or exchanged except as required by law.',
  'Interest @ 18% p.a. may be charged on overdue payments.',
  'All disputes are subject to the jurisdiction of the competent courts at the supplier’s place of business.',
  'Buyer shall intimate any discrepancy in the invoice within 48 hours of receipt.',
  'Transit risk and insurance, unless otherwise agreed, shall be as per the terms of delivery.',
  'Subject to the terms of the underlying sauda / purchase order.',
];

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatInr(n: number): string {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function panFromGstin(gstin: string): string {
  const g = gstin.replace(/\s/g, '').toUpperCase();
  if (g.length >= 12) return g.slice(2, 12);
  return '';
}

function stateCodeFromGstin(gstin: string): string {
  const g = gstin.replace(/\s/g, '');
  return g.length >= 2 ? g.slice(0, 2) : '';
}

function joinAddress(...parts: Array<string | undefined>): string {
  return parts.map((p) => str(p)).filter(Boolean).join(', ');
}

function formatPreviewAddress(
  address: EWayBillPreviewAddress | null | undefined,
  fallbacks?: {
    place?: string | null;
    state?: string | null;
    pincode?: string | null;
  },
): string {
  if (!address) {
    return joinAddress(
      str(fallbacks?.place),
      str(fallbacks?.state),
      str(fallbacks?.pincode),
    );
  }
  return joinAddress(
    str(address.street),
    str(address.city),
    str(address.state_name || address.state),
    str(address.pincode),
    str(address.country),
  );
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = str(raw);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function phonesFromParty(
  phone: string | null | undefined,
  contacts: EWayBillPreviewContactPerson[] | null | undefined,
): string[] {
  const fromContacts = (contacts ?? []).flatMap((c) => c.phones ?? []);
  return uniqueNonEmpty([phone, ...fromContacts]);
}

function emailFromParty(
  email: string | null | undefined,
  contacts: EWayBillPreviewContactPerson[] | null | undefined,
): string {
  if (str(email)) return str(email);
  for (const c of contacts ?? []) {
    for (const e of c.emails ?? []) {
      if (str(e)) return str(e);
    }
  }
  return '';
}

function formatPosWithCode(
  stateName: string,
  stateCode: string,
  gstin: string,
): string {
  const code = str(stateCode) || stateCodeFromGstin(gstin);
  const state = stateName.trim();
  if (state && code) return `${state} (Code: ${code})`;
  if (state) return state;
  if (code) return `Code: ${code}`;
  return '';
}

function splitDescription(raw: string): { title: string; sub: string } {
  const text = raw.trim() || 'Goods';
  const paren = text.match(/^(.*?)\s*[\(\[](.+?)[\)\]]\s*$/);
  if (paren) {
    return { title: paren[1].trim() || text, sub: paren[2].trim() };
  }
  const dash = text.split(/\s[-–—]\s/);
  if (dash.length >= 2) {
    return { title: dash[0].trim(), sub: dash.slice(1).join(' — ').trim() };
  }
  return { title: text, sub: '' };
}

function itemRate(item: MastersIndiaEWayItem): number | null {
  const taxable = num(item.taxable_amount);
  const qty = num(item.quantity);
  if (taxable != null && qty != null && qty > 0) return taxable / qty;
  return null;
}

/** When unit is already bags/packets, quantity itself is the bag count. */
function isBagLikeUnit(unit: string): boolean {
  const u = unit.trim().toUpperCase();
  return /^(BAGS?|PKTS?|PACKETS?|NOS?|PCS?|PIECES?)$/.test(u);
}

/**
 * Bags column source (priority):
 * 1. preview.items[].bags (API flat summary)
 * 2. extras.bagsByHsn
 * 3. quantity when unit is BAG/PKT/etc. (Masters India itemList has no bags field)
 */
function resolveBagsCount(opts: {
  previewBags?: number | null;
  extrasBags?: number;
  quantity: number | null;
  unit: string;
}): string {
  const fromPreview = num(opts.previewBags);
  if (fromPreview != null) return String(fromPreview);
  if (opts.extrasBags != null && Number.isFinite(opts.extrasBags)) {
    return String(opts.extrasBags);
  }
  if (opts.quantity != null && isBagLikeUnit(opts.unit)) {
    return String(opts.quantity);
  }
  return '';
}

function unwrapPayload(raw: unknown): MastersIndiaEWayPayload {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  // Some APIs nest under data / payload
  if (obj.masters_india_payload && typeof obj.masters_india_payload === 'object') {
    return obj.masters_india_payload as MastersIndiaEWayPayload;
  }
  if (obj.data && typeof obj.data === 'object' && 'document_number' in (obj.data as object)) {
    return obj.data as MastersIndiaEWayPayload;
  }
  return obj as MastersIndiaEWayPayload;
}

function roundOffAmount(value: number): number {
  const rounded = Math.round(value);
  return Number((rounded - value).toFixed(2));
}

export function buildBillOfSupplyViewModel(
  preview: EWayBillPreviewResponse,
  extras?: {
    companyPhones?: string[];
    companyEmail?: string;
    companyWebsite?: string;
    companyTagline?: string;
    companyLlpin?: string;
    companyIec?: string;
    udyamNo?: string;
    fssai?: string;
    modeOfPayment?: string;
    paymentTerms?: string;
    termsOfDelivery?: string;
    remarks?: string;
    bankName?: string;
    bankAccount?: string;
    bankBranch?: string;
    bankIfsc?: string;
    bankBranchIfsc?: string;
    authorisedSignatory?: string;
    jurisdiction?: string;
    declaration?: string;
    disclaimer?: string;
    legalTerms?: string[];
    orderNo?: string;
    orderDate?: string;
    billToMobile?: string;
    billToEmail?: string;
    eInvoiceIrn?: string;
    eInvoiceAckNo?: string;
    eInvoiceAckDate?: string;
    eWayBillNo?: string;
    eWayBillDate?: string;
    bagsByHsn?: Record<string, number>;
  },
): BillOfSupplyViewModel {
  const payload = unwrapPayload(preview.masters_india_payload ?? preview);
  const summary = preview.summary ?? {};
  const consignor: EWayBillPreviewConsignor = preview.consignor ?? {};
  const consignee: EWayBillPreviewConsignee = preview.consignee ?? {};
  const totals = preview.totals ?? {};
  const transporterObj = preview.transporter ?? null;

  // --- Supplier (consignor / godown) — prefer structured preview fields ---
  const companyGstin = str(
    consignor.gstin ||
      payload.gstin_of_consignor ||
      payload.userGstin ||
      summary.consignor_gstin,
  );
  const companyName = str(
    consignor.name ||
      payload.legal_name_of_consignor ||
      summary.consignor_name ||
      'Seller',
  );
  const companyAddressFromPayload = joinAddress(
    str(payload.address1_of_consignor),
    str(payload.address2_of_consignor),
    str(payload.place_of_consignor),
    payload.pincode_of_consignor != null ? String(payload.pincode_of_consignor) : '',
    str(payload.state_of_consignor || payload.actual_from_state_name),
  );
  const companyAddress =
    formatPreviewAddress(consignor.address, {
      place: consignor.place,
      state: consignor.state_name || consignor.state,
      pincode: consignor.pincode,
    }) || companyAddressFromPayload;

  const consignorPhones = phonesFromParty(
    consignor.phone,
    consignor.contact_persons,
  );
  const companyPhones =
    consignorPhones.length > 0
      ? consignorPhones
      : extras?.companyPhones ?? [];
  const companyEmail =
    emailFromParty(consignor.email, consignor.contact_persons) ||
    str(extras?.companyEmail);

  // --- Buyer: bill-to = billing_address when present; ship-to = address ---
  const billToGstin = str(consignee.gstin || payload.gstin_of_consignee);
  const billToName = str(
    consignee.name ||
      payload.legal_name_of_consignee ||
      summary.consignee_name,
  );
  const billAddrObj = consignee.billing_address ?? consignee.address;
  const shipAddrObj = consignee.address ?? consignee.billing_address;
  const billToAddressFromPayload = joinAddress(
    str(payload.address1_of_consignee),
    str(payload.address2_of_consignee),
    str(payload.place_of_consignee),
    payload.pincode_of_consignee != null ? String(payload.pincode_of_consignee) : '',
  );
  const billToAddress =
    formatPreviewAddress(billAddrObj, {
      place: consignee.place,
      state: consignee.state_name || consignee.state,
      pincode: consignee.pincode,
    }) || billToAddressFromPayload;
  const shipToAddress =
    formatPreviewAddress(shipAddrObj, {
      place: consignee.place,
      state: consignee.state_name || consignee.state,
      pincode: consignee.pincode,
    }) || billToAddress;

  const supplyState = str(
    consignee.state_name ||
      consignee.state ||
      billAddrObj?.state_name ||
      billAddrObj?.state ||
      shipAddrObj?.state_name ||
      shipAddrObj?.state ||
      payload.state_of_supply ||
      payload.actual_to_state_name,
  );
  const supplyStateCode = str(
    consignee.state_code ||
      billAddrObj?.state_code ||
      shipAddrObj?.state_code ||
      stateCodeFromGstin(billToGstin),
  );
  const fromState = str(
    consignor.state_name ||
      consignor.state ||
      consignor.address?.state_name ||
      consignor.address?.state ||
      payload.state_of_consignor ||
      payload.actual_from_state_name,
  );
  const stateCode =
    supplyStateCode ||
    stateCodeFromGstin(billToGstin) ||
    stateCodeFromGstin(companyGstin);

  const billToMobile =
    str(extras?.billToMobile) ||
    phonesFromParty(consignee.phone, consignee.contact_persons)[0] ||
    '';
  const billToEmail =
    str(extras?.billToEmail) ||
    emailFromParty(consignee.email, consignee.contact_persons);
  const billToPan =
    str(consignee.pan_number) || panFromGstin(billToGstin);

  // Prefer top-level preview.items (includes bags) over MI itemList when present.
  const previewItems = Array.isArray(preview.items) ? preview.items : [];
  const items: MastersIndiaEWayItem[] =
    previewItems.length > 0
      ? previewItems.map((it) => ({
          product_name: it.product_name ?? undefined,
          product_description: it.product_name ?? undefined,
          hsn_code: it.hsn_code ?? undefined,
          quantity: it.quantity ?? undefined,
          unit_of_product: it.unit ?? undefined,
          taxable_amount: it.taxable_amount ?? undefined,
        }))
      : Array.isArray(payload.itemList) && payload.itemList.length > 0
        ? payload.itemList
        : [];

  const lines: BillOfSupplyLineVm[] = items.map((item, idx) => {
    const previewItem = previewItems[idx];
    const hsn = str(item.hsn_code || previewItem?.hsn_code);
    const qty = num(previewItem?.quantity) ?? num(item.quantity);
    const amount = num(previewItem?.taxable_amount) ?? num(item.taxable_amount) ?? 0;
    const previewUnit = str(previewItem?.unit);
    const unit = previewUnit || str(item.unit_of_product) || 'QTL';
    const rate =
      qty != null && qty > 0
        ? amount / qty
        : itemRate({ ...item, quantity: qty ?? undefined });
    const extrasBags =
      extras?.bagsByHsn && hsn && extras.bagsByHsn[hsn] != null
        ? extras.bagsByHsn[hsn]
        : undefined;
    const bags = resolveBagsCount({
      previewBags: previewItem?.bags,
      extrasBags,
      quantity: qty,
      unit,
    });
    const rawDesc =
      str(item.product_description || item.product_name || previewItem?.product_name) ||
      'Goods';
    const { title, sub } = splitDescription(rawDesc);
    const qtyLabel =
      qty != null
        ? qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })
        : '';
    return {
      slNo: idx + 1,
      description: title,
      descriptionSub: sub,
      hsn,
      qty: qtyLabel,
      unit,
      rate: rate != null ? formatInr(rate) : '',
      discount: '0.00',
      amount: formatInr(amount),
      amountValue: amount,
      bags,
      quantity: qty != null ? `${qtyLabel} ${unit}` : '',
      per: unit,
    };
  });

  const taxableFromTotals = num(totals.taxable);
  const invoiceFromTotals = num(totals.invoice_value);
  const totalAmountValue =
    taxableFromTotals ??
    num(payload.taxable_amount) ??
    num(summary.taxable_amount) ??
    lines.reduce((s, l) => s + l.amountValue, 0);

  const taxTotal =
    (num(totals.cgst) ?? num(payload.cgst_amount) ?? 0) +
    (num(totals.sgst) ?? num(payload.sgst_amount) ?? 0) +
    (num(totals.igst) ?? num(payload.igst_amount) ?? 0) +
    (num(payload.cess_amount) ?? 0);

  const hsnMap = new Map<string, number>();
  for (const line of lines) {
    if (!line.hsn) continue;
    hsnMap.set(line.hsn, (hsnMap.get(line.hsn) ?? 0) + line.amountValue);
  }

  const distanceKm = resolvePreviewDistanceKm(preview);
  const distanceSource = resolvePreviewDistanceSource(preview);
  const distanceError = resolvePreviewDistanceError(preview);

  const totalBagsNum = lines.reduce((s, l) => s + (Number(l.bags) || 0), 0);
  const qtyParts = lines
    .map((l) => (l.qty && l.unit ? `${l.qty} ${l.unit}` : l.quantity))
    .filter(Boolean);
  const totalQtySumNum = lines.reduce((s, l) => {
    const n = Number(String(l.qty).replace(/,/g, ''));
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);
  const units = Array.from(
    new Set(lines.map((l) => l.unit.trim().toUpperCase()).filter(Boolean)),
  );
  const totalUnit = units.length === 1 ? units[0] : '';
  const totalQtySum =
    totalQtySumNum > 0
      ? totalQtySumNum.toLocaleString('en-IN', { maximumFractionDigits: 3 })
      : '';

  const docType = str(
    preview.document_type || payload.document_type || summary.document_type,
  );
  const documentTitle =
    /bill of supply/i.test(docType) || taxTotal === 0
      ? 'Bill of Supply'
      : docType || 'Bill of Supply';

  // Prefer API invoice_value (tax inclusive) when present; else taxable + round-off.
  let grandTotal: number;
  let roundOff: number;
  if (invoiceFromTotals != null) {
    grandTotal = invoiceFromTotals;
    roundOff = Number((grandTotal - totalAmountValue - taxTotal).toFixed(2));
  } else {
    roundOff = roundOffAmount(totalAmountValue + taxTotal);
    grandTotal = totalAmountValue + taxTotal + roundOff;
  }

  const bankIfsc = str(extras?.bankIfsc);
  const bankBranch = str(extras?.bankBranch);
  const bankBranchIfsc =
    str(extras?.bankBranchIfsc) ||
    [bankBranch, bankIfsc].filter(Boolean).join(' & ') ||
    '';

  const dispatchFrom = joinAddress(
    str(consignor.place || consignor.address?.city || payload.place_of_consignor),
    fromState || undefined,
  );
  const destination = str(
    consignee.place ||
      shipAddrObj?.city ||
      payload.place_of_consignee,
  );
  const shipToPlace = joinAddress(destination || undefined, supplyState || undefined);

  const invoiceNo = str(
    preview.document_number ||
      payload.document_number ||
      summary.document_number,
  );
  const invoiceDate = str(
    preview.document_date ||
      payload.document_date ||
      summary.document_date,
  );
  const vehicleNo = str(
    preview.vehicle_number ||
      payload.vehicle_number ||
      summary.vehicle_number,
  );
  const transporter = str(
    transporterObj?.name ||
      payload.transporter_name ||
      summary.transporter_name,
  );
  const grLrNo = str(
    preview.lr_number ||
      payload.transporter_document_number ||
      summary.lr_number,
  );
  const route = str(preview.route);
  const eWayBillNo = str(
    extras?.eWayBillNo ||
      (preview.already_generated
        ? preview.existing_eway_bill_number
        : '') ||
      preview.existing_eway_bill_number,
  );

  return {
    documentTitle,
    documentSubtitle: DEFAULT_DOC_SUBTITLE,
    companyName,
    companyTagline: extras?.companyTagline ?? DEFAULT_TAGLINE,
    companyAddress,
    companyGstin,
    companyPan: panFromGstin(companyGstin),
    // Branding / registry fields: only when explicitly supplied — never invent defaults.
    companyLlpin: str(extras?.companyLlpin),
    companyIec: str(extras?.companyIec),
    companyPhones,
    companyEmail,
    companyWebsite: str(extras?.companyWebsite),
    udyamNo: str(extras?.udyamNo),
    fssai: str(extras?.fssai),
    invoiceNo,
    invoiceDate,
    placeOfSupply: supplyState || shipToPlace,
    stateCode,
    vehicleNo,
    orderNo: str(extras?.orderNo),
    orderDate: str(extras?.orderDate),
    dispatchDocNo: '',
    dispatchFrom,
    destination,
    shipToPlace,
    paymentTerms:
      str(extras?.paymentTerms) || str(extras?.modeOfPayment) || 'Credit',
    grLrNo,
    grLrDate: str(payload.transporter_document_date || invoiceDate),
    transporter,
    modeOfPayment: str(extras?.modeOfPayment) || 'Credit',
    termsOfDelivery: str(extras?.termsOfDelivery) || route,
    billToName,
    billToAddress,
    billToGstin,
    billToPos: formatPosWithCode(supplyState, supplyStateCode, billToGstin),
    billToPan,
    billToMobile,
    billToEmail,
    shipToName: billToName,
    shipToAddress,
    shipToGstin: billToGstin,
    shipToPos: formatPosWithCode(supplyState, supplyStateCode, billToGstin),
    shipToPan: billToPan,
    lines,
    totalBags: totalBagsNum > 0 ? String(totalBagsNum) : '',
    totalQuantity: qtyParts.length === 1 ? qtyParts[0] : qtyParts.join(' + '),
    totalQtySum,
    totalUnit,
    totalAmount: `₹ ${formatInr(totalAmountValue)}`,
    totalAmountValue,
    taxableValue: formatInr(totalAmountValue),
    roundOff: formatInr(roundOff),
    grandTotal: formatInr(grandTotal),
    amountInWords: formatInrAmountInWords(grandTotal).replace(
      /^Rupees /,
      'Indian Rupees ',
    ),
    taxAmountInWords: taxTotal > 0 ? formatInrAmountInWords(taxTotal) : 'NIL',
    hsnSummary: Array.from(hsnMap.entries()).map(([hsn, taxableValue]) => ({
      hsn,
      taxableValue: formatInr(taxableValue),
    })),
    remarks: str(extras?.remarks) || route,
    bankName: str(extras?.bankName),
    bankAccount: str(extras?.bankAccount),
    bankBranch,
    bankIfsc,
    bankBranchIfsc,
    authorisedSignatory: str(extras?.authorisedSignatory),
    declaration: extras?.declaration ?? DEFAULT_DECLARATION,
    legalTerms: extras?.legalTerms ?? DEFAULT_LEGAL_TERMS,
    disclaimer: extras?.disclaimer ?? DEFAULT_DISCLAIMER,
    jurisdiction: str(extras?.jurisdiction),
    eInvoiceIrn: str(extras?.eInvoiceIrn),
    eInvoiceAckNo: str(extras?.eInvoiceAckNo),
    eInvoiceAckDate: str(extras?.eInvoiceAckDate),
    eWayBillNo,
    eWayBillDate: str(extras?.eWayBillDate) || (eWayBillNo ? invoiceDate : ''),
    distanceKm: distanceKm != null ? String(distanceKm) : '',
    distanceSource,
    distanceError,
  };
}
