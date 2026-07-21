import type { Godown, Product, SalesParty, Transporter, Vehicle } from '../types/entities';
import type {
  InvoiceDispatch,
  InvoiceDispatchLine,
  SalesSauda,
  SalesSaudaLine,
} from '../types/sales';
import { formatInrAmountInWords } from './inrAmountInWords';
import { formatVendorAddress, isShipToSameAsBillTo } from './saudaDisplay';
import { getSaudaLineOrdered } from './salesSaudaFulfillment';
import type { BillOfSupplyLineVm, BillOfSupplyViewModel } from './ewayBillPreviewData';

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

export type DispatchLivePreviewLinePick = {
  sales_sauda_line_id: string;
  included: boolean;
  bagsInput: string;
  quantityInput: string;
};

function formatInr(n: number): string {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQty(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 3 });
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

function formatPos(stateName: string, gstin: string): string {
  const code = stateCodeFromGstin(gstin);
  const state = stateName.trim();
  if (state && code) return `${state} (Code: ${code})`;
  if (state) return state;
  if (code) return `Code: ${code}`;
  return '';
}

function joinAddress(...parts: Array<string | undefined | null>): string {
  return parts.map((p) => (p ?? '').trim()).filter(Boolean).join(', ');
}

function formatDateLabel(iso: string | null | undefined): string {
  const raw = (iso ?? '').trim();
  if (!raw) return '';
  const d = new Date(`${raw.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = (raw ?? '').trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function partyPhones(party: SalesParty | undefined): string {
  if (!party) return '';
  const phones: string[] = [];
  for (const person of party.contact_persons ?? []) {
    phones.push(...(person.phones ?? []));
  }
  return uniqueNonEmpty(phones)[0] ?? '';
}

function partyEmail(party: SalesParty | undefined): string {
  if (!party) return '';
  const emails: string[] = [];
  for (const person of party.contact_persons ?? []) {
    emails.push(...(person.emails ?? []));
  }
  return uniqueNonEmpty(emails)[0] ?? '';
}

function lineAmountForQty(line: SalesSaudaLine, qty: number): number {
  const ordered = getSaudaLineOrdered(line);
  if (ordered > 1e-9 && Number.isFinite(line.final_amount)) {
    return (Number(line.final_amount) / ordered) * qty;
  }
  const rate = Number(line.rate) || 0;
  let amount = qty * rate;
  const discount = Number(line.discount_value) || 0;
  if (discount > 0) {
    if (line.discount_type === 'percentage') {
      amount -= amount * (discount / 100);
    } else {
      amount -= qty * discount;
    }
  }
  return Math.max(0, amount);
}

function emptyViewModel(): BillOfSupplyViewModel {
  return {
    documentTitle: 'Bill of Supply',
    documentSubtitle: DEFAULT_DOC_SUBTITLE,
    companyName: '',
    companyTagline: DEFAULT_TAGLINE,
    companyAddress: '',
    companyGstin: '',
    companyPan: '',
    companyLlpin: '',
    companyIec: '',
    companyPhones: [],
    companyEmail: '',
    companyWebsite: '',
    udyamNo: '',
    fssai: '',
    invoiceNo: '',
    invoiceDate: '',
    placeOfSupply: '',
    stateCode: '',
    vehicleNo: '',
    orderNo: '',
    orderDate: '',
    dispatchDocNo: '',
    dispatchFrom: '',
    destination: '',
    shipToPlace: '',
    paymentTerms: 'Credit',
    grLrNo: '',
    grLrDate: '',
    transporter: '',
    modeOfPayment: 'Credit',
    termsOfDelivery: '',
    billToName: '',
    billToAddress: '',
    billToGstin: '',
    billToPos: '',
    billToPan: '',
    billToMobile: '',
    billToEmail: '',
    shipToName: '',
    shipToAddress: '',
    shipToGstin: '',
    shipToPos: '',
    shipToPan: '',
    lines: [],
    totalBags: '',
    totalQuantity: '',
    totalQtySum: '',
    totalUnit: '',
    totalAmount: '₹ 0.00',
    totalAmountValue: 0,
    taxableValue: '0.00',
    roundOff: '0.00',
    grandTotal: '0.00',
    amountInWords: 'Indian Rupees Zero Only',
    taxAmountInWords: 'NIL',
    hsnSummary: [],
    remarks: '',
    bankName: '',
    bankAccount: '',
    bankBranch: '',
    bankIfsc: '',
    bankBranchIfsc: '',
    authorisedSignatory: '',
    declaration: DEFAULT_DECLARATION,
    legalTerms: DEFAULT_LEGAL_TERMS,
    disclaimer: DEFAULT_DISCLAIMER,
    jurisdiction: '',
    eInvoiceIrn: '',
    eInvoiceAckNo: '',
    eInvoiceAckDate: '',
    eWayBillNo: '',
    eWayBillDate: '',
    distanceKm: '',
    distanceSource: null,
    distanceError: '',
  };
}

export type BuildBillOfSupplyLivePreviewArgs = {
  sauda: SalesSauda | null | undefined;
  salesParty: SalesParty | undefined;
  godown: Godown | undefined;
  transporter: Transporter | undefined;
  vehicle: Vehicle | undefined;
  dispatchDate?: string | null;
  lrNumber?: string | null;
  distanceKm?: string | null;
  usp?: string | null;
  /** Create mode: selected bags/qty per sauda line */
  linePicks?: DispatchLivePreviewLinePick[];
  getLineCapacity?: (packagingId: string | null | undefined) => number;
  productById?: Map<string, Product>;
  /** Edit mode: locked dispatch + lines */
  editingDispatch?: InvoiceDispatch | null;
};

/**
 * Client-side Bill of Supply view model from invoice dispatch form state.
 * Updates live as the user selects sauda / logistics / quantities.
 * Invoice number stays draft until the server assigns one on save.
 */
export function buildBillOfSupplyLivePreview(
  args: BuildBillOfSupplyLivePreviewArgs,
): BillOfSupplyViewModel {
  const {
    sauda,
    salesParty,
    godown,
    transporter,
    vehicle,
    dispatchDate,
    lrNumber,
    distanceKm,
    usp,
    linePicks = [],
    getLineCapacity,
    productById,
    editingDispatch,
  } = args;

  const base = emptyViewModel();
  const invoiceDateLabel = formatDateLabel(
    dispatchDate || editingDispatch?.dispatch_date || undefined,
  );

  // Always show the document shell; fill as godown / sauda / logistics are selected.
  if (!sauda && !editingDispatch) {
    const companyGstin = (godown?.gst_number ?? '').trim().toUpperCase();
    return {
      ...base,
      companyName: (godown?.name ?? '').trim(),
      companyAddress: joinAddress(
        godown?.address?.street,
        godown?.address?.city,
        godown?.address?.state,
        godown?.address?.pincode,
        godown?.address?.country,
      ),
      companyGstin,
      companyPan: panFromGstin(companyGstin),
      companyPhones: uniqueNonEmpty(
        (godown?.contact_persons ?? []).flatMap((p) => p.phones ?? []),
      ),
      companyEmail:
        uniqueNonEmpty(
          (godown?.contact_persons ?? []).flatMap((p) => p.emails ?? []),
        )[0] ?? '',
      invoiceNo: 'Draft (auto on save)',
      invoiceDate: invoiceDateLabel,
      dispatchFrom: joinAddress(
        godown?.address?.city || godown?.name,
        godown?.address?.state || undefined,
      ),
      vehicleNo: (vehicle?.vehicle_number ?? '').trim().toUpperCase(),
      transporter: (transporter?.business_name ?? '').trim(),
      grLrNo: (lrNumber ?? '').trim(),
      grLrDate: invoiceDateLabel,
      distanceKm: (distanceKm ?? '').trim(),
      paymentTerms: 'Credit',
      modeOfPayment: 'Credit',
    };
  }

  const companyGstin = (godown?.gst_number ?? '').trim().toUpperCase();
  // Prefer godown (dispatch source) — no branding / default-recipient fillers.
  const companyName = (godown?.name ?? '').trim() || 'Seller';
  const companyAddress = joinAddress(
    godown?.address?.street,
    godown?.address?.city,
    godown?.address?.state,
    godown?.address?.pincode,
    godown?.address?.country,
  );
  const companyPhones = uniqueNonEmpty(
    (godown?.contact_persons ?? []).flatMap((p) => p.phones ?? []),
  );
  const companyEmail =
    uniqueNonEmpty(
      (godown?.contact_persons ?? []).flatMap((p) => p.emails ?? []),
    )[0] ?? '';
  const billToName =
    (salesParty?.business_name ?? '').trim() ||
    (editingDispatch?.party_name ?? '').trim() ||
    (sauda?.sales_party_name ?? '').trim() ||
    '';
  const billAddr =
    formatVendorAddress(sauda?.billing_address) ||
    formatVendorAddress(salesParty?.address) ||
    (editingDispatch?.party_address ?? '').trim() ||
    '';
  const shipAddr = formatVendorAddress(sauda?.delivery_address);
  const sameShip = isShipToSameAsBillTo(sauda?.billing_address, sauda?.delivery_address);
  const billToGstin =
    (salesParty?.business_details?.gst_number ?? '').trim().toUpperCase() ||
    (editingDispatch?.party_gst_number ?? '').trim().toUpperCase();
  const billToPan =
    (salesParty?.business_details?.pan_number ?? '').trim().toUpperCase() ||
    panFromGstin(billToGstin) ||
    (editingDispatch?.party_pan_number ?? '').trim().toUpperCase();

  const supplyState =
    (sauda?.delivery_address?.state || sauda?.billing_address?.state || salesParty?.address?.state || '')
      .trim();
  const fromState = (godown?.address?.state ?? '').trim();
  const fromCity = (godown?.address?.city ?? '').trim();
  const destCity =
    (sauda?.delivery_address?.city || sauda?.billing_address?.city || salesParty?.address?.city || '')
      .trim();

  const lines: BillOfSupplyLineVm[] = [];

  if (editingDispatch?.lines?.length) {
    editingDispatch.lines.forEach((dLine: InvoiceDispatchLine, idx: number) => {
      const product = productById?.get(dLine.product_id);
      const qty = Number(dLine.quantity) || 0;
      const rate = Number(dLine.rate) || 0;
      const amount = Number(dLine.amount) || qty * rate;
      const unit = (dLine.quantity_unit || 'KG').trim() || 'KG';
      const bags =
        dLine.packet_count != null && Number(dLine.packet_count) > 0
          ? String(dLine.packet_count)
          : '';
      const qtyLabel = qty > 0 ? formatQty(qty) : '';
      lines.push({
        slNo: idx + 1,
        description: product?.name?.trim() || 'Goods',
        descriptionSub: product?.brand?.trim() || '',
        hsn: product?.hsn_code?.trim() || '',
        qty: qtyLabel,
        unit,
        rate: rate > 0 ? formatInr(rate) : '',
        discount: '0.00',
        amount: formatInr(amount),
        amountValue: amount,
        bags,
        quantity: qtyLabel ? `${qtyLabel} ${unit}` : '',
        per: unit,
      });
    });
  } else if (sauda?.lines?.length) {
    const sorted = [...sauda.lines].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    const pickById = new Map(linePicks.map((p) => [p.sales_sauda_line_id, p]));
    let sl = 0;
    for (const line of sorted) {
      const pick = pickById.get(line.id);
      if (pick && !pick.included) continue;

      const capacity = getLineCapacity?.(line.packaging_id) ?? 0;
      let qty = 0;
      let bagsNum: number | null = null;

      if (pick) {
        if (capacity > 0 && line.packaging_id) {
          const bags = Number(pick.bagsInput);
          if (!Number.isFinite(bags) || bags <= 0) continue;
          bagsNum = bags;
          qty = bags * capacity;
        } else {
          const q = Number(pick.quantityInput);
          if (!Number.isFinite(q) || q <= 0) continue;
          qty = q;
        }
      } else {
        // No picks yet — show remaining/ordered as draft placeholder
        qty = getSaudaLineOrdered(line);
        if (qty <= 0) continue;
      }

      const product = productById?.get(line.product_id);
      const amount = lineAmountForQty(line, qty);
      const rate = Number(line.rate) || 0;
      const unit = (line.quantity_unit || 'KG').trim() || 'KG';
      const qtyLabel = qty > 0 ? formatQty(qty) : '';
      sl += 1;
      lines.push({
        slNo: sl,
        description: product?.name?.trim() || 'Goods',
        descriptionSub: product?.brand?.trim() || '',
        hsn: product?.hsn_code?.trim() || '',
        qty: qtyLabel,
        unit,
        rate: rate > 0 ? formatInr(rate) : '',
        discount: '0.00',
        amount: formatInr(amount),
        amountValue: amount,
        bags: bagsNum != null ? String(bagsNum) : '',
        quantity: qtyLabel ? `${qtyLabel} ${unit}` : '',
        per: unit,
      });
    }
  }

  const totalAmountValue = lines.reduce((s, l) => s + l.amountValue, 0);
  const roundOff = Number((Math.round(totalAmountValue) - totalAmountValue).toFixed(2));
  const grandTotal = totalAmountValue + roundOff;

  const totalBagsNum = lines.reduce((s, l) => s + (Number(l.bags) || 0), 0);
  const totalQtySumNum = lines.reduce((s, l) => {
    const n = Number(String(l.qty).replace(/,/g, ''));
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);
  const units = Array.from(
    new Set(lines.map((l) => l.unit.trim().toUpperCase()).filter(Boolean)),
  );
  const totalUnit = units.length === 1 ? units[0] : '';
  const qtyParts = lines
    .map((l) => (l.qty && l.unit ? `${l.qty} ${l.unit}` : l.quantity))
    .filter(Boolean);

  const hsnMap = new Map<string, number>();
  for (const line of lines) {
    if (!line.hsn) continue;
    hsnMap.set(line.hsn, (hsnMap.get(line.hsn) ?? 0) + line.amountValue);
  }

  const paymentTerms =
    sauda?.payment_terms != null ? `${sauda.payment_terms} days` : 'Credit';
  const termsOfDelivery =
    sauda?.sauda_type === 'for' ? 'FOR' : sauda?.sauda_type === 'ex' ? 'EX' : '';

  const invoiceNo =
    editingDispatch?.internal_invoice_number?.trim() || 'Draft (auto on save)';

  return {
    ...base,
    companyName,
    companyAddress,
    companyGstin,
    companyPan: panFromGstin(companyGstin),
    companyLlpin: '',
    companyIec: '',
    companyPhones,
    companyEmail,
    companyWebsite: '',
    udyamNo: '',
    fssai: '',
    invoiceNo,
    invoiceDate: invoiceDateLabel,
    placeOfSupply: supplyState || destCity,
    stateCode: stateCodeFromGstin(billToGstin) || stateCodeFromGstin(companyGstin),
    vehicleNo: (vehicle?.vehicle_number ?? '').trim().toUpperCase(),
    orderNo: '',
    orderDate: '',
    dispatchFrom: joinAddress(fromCity || godown?.name, fromState || undefined),
    destination: destCity,
    shipToPlace: joinAddress(destCity || undefined, supplyState || undefined),
    paymentTerms,
    grLrNo: (lrNumber ?? '').trim(),
    grLrDate: invoiceDateLabel,
    transporter: (transporter?.business_name ?? '').trim(),
    modeOfPayment: 'Credit',
    termsOfDelivery,
    billToName,
    billToAddress: billAddr,
    billToGstin,
    billToPos: formatPos(supplyState, billToGstin),
    billToPan,
    billToMobile: partyPhones(salesParty),
    billToEmail: partyEmail(salesParty),
    shipToName: billToName,
    shipToAddress: sameShip || !shipAddr ? billAddr : shipAddr,
    shipToGstin: billToGstin,
    shipToPos: formatPos(supplyState, billToGstin),
    shipToPan: billToPan,
    lines,
    totalBags: totalBagsNum > 0 ? String(totalBagsNum) : '',
    totalQuantity: qtyParts.length === 1 ? qtyParts[0] : qtyParts.join(' + '),
    totalQtySum:
      totalQtySumNum > 0
        ? totalQtySumNum.toLocaleString('en-IN', { maximumFractionDigits: 3 })
        : '',
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
    hsnSummary: Array.from(hsnMap.entries()).map(([hsn, taxableValue]) => ({
      hsn,
      taxableValue: formatInr(taxableValue),
    })),
    remarks: (usp ?? '').trim() || (sauda?.notes ?? '').trim() || '',
    distanceKm: (distanceKm ?? '').trim(),
  };
}
