import type { Broker, CreateSaudaRequest, RiceCode, RiceLengthRecord, RiceType, Sauda, Vendor } from '../types/entities';
import { vendorsAPI } from '../services/vendors.api';
import { getFinancialYearKeyFromIsoDate } from './financialYear';
import { formatInrAmountInWords } from './inrAmountInWords';
import { getRiceLengthLabel, getRiceTypeLabel } from './riceType';
import {
  formatSaudaTypeLabel,
  formatVendorAddress,
  getSaudaBrokerName,
  getSaudaNumberLabel,
  getSaudaPurchaserName,
  getSaudaRiceCategoryLabel,
  getSaudaRiceCodeName,
  buildSaudaPdfFilename,
  type BuildSaudaPdfFilenameParams,
} from './saudaDisplay';
import { formatSaudaAvgGrainLengthDisplay, formatSaudaWhitenessDisplay } from './saudaParameters';

export interface SaudaPdfCompanyInfo {
  name: string;
  address: string;
  llpin: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

export interface SaudaPdfViewModel {
  poNumber: string;
  saudaDate: string;
  validUntil: string | null;
  preparedBy: string | null;
  vendorName: string;
  vendorAddress: string;
  vendorGstin: string;
  vendorPan: string;
  vendorRegistration: string;
  saudaType: string;
  category: string;
  riceCode: string;
  variant: string;
  riceLength: string;
  whiteness: string;
  avgGrainLength: string;
  rate: string;
  quantity: string;
  noOfBags: string;
  bagWeight: string;
  cashDiscount: string;
  brokerName: string;
  brokerCommission: string;
  estimatedAmount: string;
  amountInWords: string;
  authorisedSignature: string;
  generatedAt: string;
  company: SaudaPdfCompanyInfo;
}

type SaudaLike = Pick<
  Sauda,
  | 'id'
  | 'display_id'
  | 'sauda_type'
  | 'rice_category'
  | 'rice_code_id'
  | 'rice_type'
  | 'rice_length'
  | 'rice_length_id'
  | 'rate'
  | 'quantity'
  | 'no_of_bags'
  | 'bag_weight'
  | 'cash_discount'
  | 'cash_discount_type'
  | 'broker_id'
  | 'broker_commission'
  | 'broker_commission_type'
  | 'purchaser_id'
  | 'purchaser_name'
  | 'purchaser'
  | 'broker_name'
  | 'broker'
  | 'sauda_date'
  | 'created_at'
  | 'estimated_delivery_time'
  | 'parameters'
>;

export interface BuildSaudaPdfViewModelParams {
  sauda: SaudaLike;
  serialNumber?: number | null;
  vendors: Vendor[];
  brokers: Broker[];
  riceCodes: RiceCode[];
  riceTypes: RiceType[];
  riceLengths?: RiceLengthRecord[];
  company: { name: string; address: string; llpin: string; phone?: string | null; email?: string | null; website?: string | null };
  preparedBy?: string;
  /** When purchaser is not in the cached vendors list (fetched by id). */
  purchaserVendor?: Vendor | null;
}

/** Load purchaser vendor from list or API so PDF + filename get the party name. */
export async function resolveSaudaPurchaserVendor(
  sauda: Pick<Sauda, 'purchaser_id' | 'purchaser_name' | 'purchaser'>,
  vendors: Vendor[],
): Promise<Vendor | null> {
  if (!sauda.purchaser_id) return null;
  const cached = vendors.find((v) => v.id === sauda.purchaser_id);
  if (cached) return cached;
  try {
    return await vendorsAPI.getVendorById(sauda.purchaser_id);
  } catch {
    return null;
  }
}

export async function prepareSaudaPdfDownload(
  viewParams: BuildSaudaPdfViewModelParams,
  filenameParams: BuildSaudaPdfFilenameParams,
): Promise<{ pdfData: SaudaPdfViewModel; filename: string }> {
  const purchaserVendor = await resolveSaudaPurchaserVendor(viewParams.sauda, viewParams.vendors);
  const pdfData = buildSaudaPdfViewModel({ ...viewParams, purchaserVendor });
  const filename = buildSaudaPdfFilename({
    ...filenameParams,
    partyName: pdfData.vendorName !== '—' ? pdfData.vendorName : filenameParams.partyName,
  });
  return { pdfData, filename };
}

function formatPoNumber(sauda: SaudaLike, serialNumber?: number | null): string {
  const fy = getFinancialYearKeyFromIsoDate(sauda.sauda_date ?? sauda.created_at?.slice(0, 10));
  const label = getSaudaNumberLabel(sauda, serialNumber);
  if (sauda.display_id?.trim()) return sauda.display_id.trim();
  if (fy && serialNumber != null) {
    return `PO/${fy}/${String(serialNumber).padStart(4, '0')}`;
  }
  return label;
}

function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const d = new Date(`${iso.trim()}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getRiceLengthDisplay(
  sauda: SaudaLike & { rice_length_name?: string | null },
  riceLengths: RiceLengthRecord[] | undefined,
): string {
  if (sauda.rice_length_name?.trim()) return sauda.rice_length_name.trim();
  if (sauda.rice_length_id && riceLengths?.length) {
    const row = riceLengths.find((r) => r.id === sauda.rice_length_id);
    if (row?.name) return row.name;
  }
  if (sauda.rice_length) {
    return getRiceLengthLabel(sauda.rice_length, []) || '—';
  }
  return '—';
}

function formatCashDiscount(sauda: SaudaLike): string {
  if (sauda.cash_discount == null) return '—';
  if (sauda.cash_discount_type === 'percentage') return `${sauda.cash_discount}%`;
  return `₹ ${sauda.cash_discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatBrokerCommission(sauda: SaudaLike): string {
  if (sauda.broker_commission == null) return '—';
  if (sauda.broker_commission_type === 'percentage') return `${sauda.broker_commission}%`;
  if (sauda.broker_commission_type === 'weight') {
    return `₹ ${sauda.broker_commission.toFixed(2)} / kg`;
  }
  return `₹ ${sauda.broker_commission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function estimateAmount(sauda: SaudaLike): number | null {
  if (sauda.rate == null || sauda.quantity == null) return null;
  return sauda.rate * sauda.quantity;
}

export function buildSaudaPdfViewModel(params: BuildSaudaPdfViewModelParams): SaudaPdfViewModel {
  const {
    sauda,
    serialNumber,
    vendors,
    brokers,
    riceCodes,
    riceTypes,
    riceLengths,
    company,
    preparedBy,
    purchaserVendor,
  } = params;

  const purchaser = purchaserVendor ?? vendors.find((v) => v.id === sauda.purchaser_id);
  const vendorsForName = purchaser && !vendors.some((v) => v.id === purchaser.id)
    ? [...vendors, purchaser]
    : vendors;
  const vendorName =
    getSaudaPurchaserName(sauda, vendorsForName) || purchaser?.business_name?.trim() || '—';
  const vendorAddress = formatVendorAddress(purchaser?.address) || '—';
  const gst = purchaser?.business_details?.gst_number?.trim().toUpperCase();
  const pan = purchaser?.business_details?.pan_number?.trim().toUpperCase();
  const registration =
    purchaser?.registration_type === 'registered'
      ? 'Registered'
      : purchaser?.registration_type === 'unregistered'
        ? 'Unregistered'
        : '—';

  const dateIso = sauda.sauda_date ?? sauda.created_at?.slice(0, 10) ?? null;
  const validUntil =
    dateIso && sauda.estimated_delivery_time != null && sauda.estimated_delivery_time > 0
      ? addDaysIso(dateIso, sauda.estimated_delivery_time)
      : null;

  const amount = estimateAmount(sauda);

  return {
    poNumber: formatPoNumber(sauda, serialNumber),
    saudaDate: formatDisplayDate(dateIso),
    validUntil,
    preparedBy: preparedBy?.trim() || null,
    vendorName,
    vendorAddress,
    vendorGstin: gst || '—',
    vendorPan: pan || '—',
    vendorRegistration: registration,
    saudaType: formatSaudaTypeLabel(sauda.sauda_type),
    category: getSaudaRiceCategoryLabel(sauda, riceCodes) || '—',
    riceCode: getSaudaRiceCodeName(sauda, riceCodes) || '—',
    variant: getRiceTypeLabel(sauda.rice_type, riceTypes) || '—',
    riceLength: getRiceLengthDisplay(sauda, riceLengths),
    whiteness: formatSaudaWhitenessDisplay(sauda.parameters?.whiteness),
    avgGrainLength: formatSaudaAvgGrainLengthDisplay(sauda.parameters?.average_grain_length),
    rate: `₹ ${(sauda.rate ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg`,
    quantity:
      sauda.quantity != null
        ? `${sauda.quantity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
        : '—',
    noOfBags: sauda.no_of_bags != null ? String(sauda.no_of_bags) : '—',
    bagWeight:
      sauda.bag_weight != null
        ? `${sauda.bag_weight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
        : '—',
    cashDiscount: formatCashDiscount(sauda),
    brokerName: getSaudaBrokerName(sauda, brokers) || '—',
    brokerCommission: sauda.broker_id ? formatBrokerCommission(sauda) : '—',
    estimatedAmount:
      amount != null
        ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '—',
    amountInWords: amount != null ? formatInrAmountInWords(amount) : '',
    authorisedSignature: 'Aadhra Amrit',
    generatedAt: new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
    company: {
      name: company.name,
      address: company.address,
      llpin: company.llpin,
      phone: company.phone?.trim() || null,
      email: company.email?.trim() || null,
      website: company.website?.trim() || null,
    },
  };
}

/** Map create/edit form state to a sauda-like object for PDF preview before save. */
export function saudaLikeFromFormData(
  formData: CreateSaudaRequest,
  parameterFields: { whiteness: string; average_grain_length: string },
  meta?: { id?: string; display_id?: string | null },
  unit: 'kg' | 'quintal' | 'ton' = 'kg',
  brokerCommissionUnit: 'kg' | 'quintal' | 'ton' = 'kg',
): SaudaLike {
  const unitFactor = unit === 'kg' ? 1 : unit === 'quintal' ? 100 : 1000;
  const commissionFactor =
    brokerCommissionUnit === 'kg' ? 1 : brokerCommissionUnit === 'quintal' ? 100 : 1000;

  let brokerCommission = formData.broker_commission;
  if (formData.broker_commission_type === 'weight' && brokerCommission != null) {
    brokerCommission = brokerCommission / commissionFactor;
  }

  return {
    id: meta?.id ?? 'draft',
    display_id: meta?.display_id ?? null,
    sauda_type: formData.sauda_type,
    rice_category: formData.rice_category,
    rice_code_id: formData.rice_code_id,
    rice_type: formData.rice_type,
    rice_length: formData.rice_length,
    rice_length_id: formData.rice_length_id,
    rate: (formData.rate || 0) / unitFactor,
    quantity: formData.quantity != null ? formData.quantity * unitFactor : null,
    no_of_bags: formData.no_of_bags,
    bag_weight: formData.bag_weight,
    cash_discount: formData.cash_discount,
    cash_discount_type: formData.cash_discount_type,
    broker_id: formData.broker_id,
    broker_commission: brokerCommission,
    broker_commission_type: formData.broker_commission_type,
    purchaser_id: formData.purchaser_id,
    sauda_date: formData.sauda_date,
    created_at: new Date().toISOString(),
    estimated_delivery_time: formData.estimated_delivery_time,
    parameters: {
      whiteness: parameterFields.whiteness || null,
      average_grain_length: parameterFields.average_grain_length || null,
    },
  };
}
