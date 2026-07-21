import { brokersAPI } from '../services/brokers.api';
import { godownsAPI } from '../services/godowns.api';
import { leadsAPI } from '../services/leads.api';
import { packagingVendorsAPI } from '../services/packagingVendors.api';
import { salesmenAPI } from '../services/salesmen.api';
import { salesPartiesAPI } from '../services/salesParties.api';
import { transportersAPI } from '../services/transporters.api';
import { vendorsAPI } from '../services/vendors.api';
import type {
  Broker,
  Godown,
  Lead,
  PackagingVendor,
  Salesman,
  SalesParty,
  Transporter,
  Vendor,
} from '../types/entities';
import { sanitizeBankAccountInput } from './bankAccountFormatting';

export type EntityModuleKind =
  | 'vendor'
  | 'sales_party'
  | 'transporter'
  | 'broker'
  | 'lead'
  | 'godown'
  | 'packaging_vendor'
  | 'salesman';

export type DuplicateCheckField = 'gst' | 'pan' | 'aadhaar' | 'bank';

export interface DuplicateCheckParams {
  gst_number?: string;
  pan_number?: string;
  aadhaar_number?: string;
  aadhar_number?: string;
  account_number?: string;
  ifsc_code?: string;
}

export interface DuplicateIdentifierSnapshot {
  gst_number?: string;
  pan_number?: string;
  aadhaar_number?: string;
  aadhar_number?: string;
  account_number?: string;
  ifsc_code?: string;
}

export interface AssertEntityNotDuplicateOptions {
  excludeId?: string | null;
  unchangedFrom?: DuplicateIdentifierSnapshot;
}

export interface DuplicateCheckRecord {
  id: string;
  displayName: string;
  gst_number?: string | null;
  pan_number?: string | null;
  aadhar_number?: string | null;
  aadhaar_number?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
}

const MODULE_LABELS: Record<EntityModuleKind, string> = {
  vendor: 'purchase party',
  sales_party: 'sales party',
  transporter: 'transporter',
  broker: 'broker',
  lead: 'lead',
  godown: 'godown',
  packaging_vendor: 'packaging vendor',
  salesman: 'salesperson',
};

const FIELD_LABELS: Record<DuplicateCheckField, string> = {
  gst: 'GST number',
  pan: 'PAN number',
  aadhaar: 'Aadhaar number',
  bank: 'bank account',
};

function normalizeGst(value: string): string {
  return value.trim().toUpperCase();
}

function normalizePan(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeAadhaar(value: string): string {
  return value.replace(/\s/g, '');
}

function normalizeIfsc(value: string): string {
  return value.trim().toUpperCase();
}

function isUnchanged(
  current: string,
  original: string | undefined,
  normalize: (value: string) => string,
): boolean {
  if (!original?.trim()) return false;
  return normalize(current) === normalize(original);
}

function duplicateMessage(moduleLabel: string, field: DuplicateCheckField, displayName: string): string {
  return `A ${moduleLabel} already exists with this ${FIELD_LABELS[field]}: "${displayName}".`;
}

function mapVendorLikeRecords(
  items: Array<{
    id: string;
    business_name: string;
    business_details?: { gst_number?: string; pan_number?: string };
    aadhar_number?: string | null;
    bank_details?: { account_number?: string; ifsc_code?: string };
  }>,
): DuplicateCheckRecord[] {
  return items.map((item) => ({
    id: item.id,
    displayName: item.business_name?.trim() || 'Unknown',
    gst_number: item.business_details?.gst_number,
    pan_number: item.business_details?.pan_number,
    aadhar_number: item.aadhar_number,
    account_number: item.bank_details?.account_number,
    ifsc_code: item.bank_details?.ifsc_code,
  }));
}

function mapTransporterRecords(items: Transporter[]): DuplicateCheckRecord[] {
  return items.map((item) => ({
    id: item.id,
    displayName: item.business_name?.trim() || 'Unknown',
    gst_number: item.gst_number,
    pan_number: item.pan_number,
    aadhar_number: item.aadhar_number,
    account_number: item.bank_details?.account_number,
    ifsc_code: item.bank_details?.ifsc_code,
  }));
}

function mapBrokerRecords(items: Broker[]): DuplicateCheckRecord[] {
  return items.map((item) => ({
    id: item.id,
    displayName: item.business_name?.trim() || 'Unknown',
    gst_number: item.business_details?.gst_number,
    pan_number: item.business_details?.pan_number,
    aadhaar_number: item.business_details?.aadhaar_number,
    account_number: item.bank_details?.account_number,
    ifsc_code: item.bank_details?.ifsc_code,
  }));
}

function mapLeadRecords(items: Lead[]): DuplicateCheckRecord[] {
  return items.map((item) => ({
    id: item.id,
    displayName: item.company_name?.trim() || 'Unknown',
    gst_number: item.business_details?.gst_number,
    pan_number: item.business_details?.pan_number,
  }));
}

function mapGodownRecords(items: Godown[]): DuplicateCheckRecord[] {
  return items.map((item) => ({
    id: item.id,
    displayName: item.name?.trim() || 'Unknown',
    gst_number: item.gst_number,
  }));
}

function mapPackagingVendorRecords(items: PackagingVendor[]): DuplicateCheckRecord[] {
  return items.map((item) => ({
    id: item.id,
    displayName: item.name?.trim() || 'Unknown',
    gst_number: item.gst_number,
  }));
}

function mapSalesmanRecords(items: Salesman[]): DuplicateCheckRecord[] {
  return items.map((item) => ({
    id: item.id,
    displayName: item.name?.trim() || 'Unknown',
    pan_number: item.pan_number,
    aadhar_number: item.aadhar_number,
    account_number: item.bank_details?.account_number,
    ifsc_code: item.bank_details?.ifsc_code,
  }));
}

export async function loadDuplicateCheckRecords(kind: EntityModuleKind): Promise<DuplicateCheckRecord[]> {
  switch (kind) {
    case 'vendor': {
      const items = await vendorsAPI.getAllVendors({ includeInactive: true });
      return mapVendorLikeRecords(items);
    }
    case 'sales_party': {
      const items = await salesPartiesAPI.getAll(true);
      const list = Array.isArray(items) ? items : (items as { data?: SalesParty[] })?.data ?? [];
      return mapVendorLikeRecords(Array.isArray(list) ? list : []);
    }
    case 'transporter': {
      const items = await transportersAPI.getAllTransporters({ includeInactive: true });
      return mapTransporterRecords(items);
    }
    case 'broker': {
      const items = await brokersAPI.getAllBrokers(true);
      return mapBrokerRecords(items);
    }
    case 'lead': {
      const items = await leadsAPI.getAllLeads();
      return mapLeadRecords(items);
    }
    case 'godown': {
      const items = await godownsAPI.getAll({ include_inactive: true });
      return mapGodownRecords(items);
    }
    case 'packaging_vendor': {
      const items = await packagingVendorsAPI.getAllPackagingVendors();
      return mapPackagingVendorRecords(items);
    }
    case 'salesman': {
      const items = await salesmenAPI.getAllSalesmen(true);
      return mapSalesmanRecords(Array.isArray(items) ? items : []);
    }
    default:
      return [];
  }
}

function findDuplicateRecord(
  records: DuplicateCheckRecord[],
  field: DuplicateCheckField,
  params: DuplicateCheckParams,
  excludeId?: string | null,
): DuplicateCheckRecord | null {
  const gst = params.gst_number?.trim();
  const pan = params.pan_number?.trim();
  const aadhaar = (params.aadhaar_number ?? params.aadhar_number)?.trim();
  const account = params.account_number ? sanitizeBankAccountInput(params.account_number) : '';
  const ifsc = params.ifsc_code?.trim().toUpperCase();

  for (const record of records) {
    if (excludeId && record.id === excludeId) continue;

    if (field === 'gst' && gst && record.gst_number && normalizeGst(record.gst_number) === normalizeGst(gst)) {
      return record;
    }
    if (field === 'pan' && pan && record.pan_number && normalizePan(record.pan_number) === normalizePan(pan)) {
      return record;
    }
    if (field === 'aadhaar') {
      const existing = record.aadhar_number ?? record.aadhaar_number;
      if (aadhaar && existing && normalizeAadhaar(existing) === normalizeAadhaar(aadhaar)) {
        return record;
      }
    }
    if (
      field === 'bank' &&
      account &&
      ifsc &&
      record.account_number &&
      record.ifsc_code &&
      sanitizeBankAccountInput(record.account_number) === account &&
      normalizeIfsc(record.ifsc_code) === ifsc
    ) {
      return record;
    }
  }

  return null;
}

/** Client-side duplicate guard — loads module records, no dedicated check-exists API. */
export async function assertEntityNotDuplicateBeforeVerification(
  kind: EntityModuleKind,
  params: DuplicateCheckParams,
  field: DuplicateCheckField,
  options: AssertEntityNotDuplicateOptions = {},
  recordsOverride?: DuplicateCheckRecord[],
): Promise<void> {
  const { excludeId, unchangedFrom } = options;
  const gst = params.gst_number?.trim();
  const pan = params.pan_number?.trim();
  const aadhaar = (params.aadhaar_number ?? params.aadhar_number)?.trim();
  const account = params.account_number ? sanitizeBankAccountInput(params.account_number) : '';
  const ifsc = params.ifsc_code?.trim().toUpperCase();

  if (field === 'gst' && gst && isUnchanged(gst, unchangedFrom?.gst_number, normalizeGst)) return;
  if (field === 'pan' && pan && isUnchanged(pan, unchangedFrom?.pan_number, normalizePan)) return;
  if (
    field === 'aadhaar' &&
    aadhaar &&
    isUnchanged(
      aadhaar,
      unchangedFrom?.aadhaar_number ?? unchangedFrom?.aadhar_number,
      normalizeAadhaar,
    )
  ) {
    return;
  }
  if (
    field === 'bank' &&
    account &&
    ifsc &&
    isUnchanged(account, unchangedFrom?.account_number, sanitizeBankAccountInput) &&
    isUnchanged(ifsc, unchangedFrom?.ifsc_code, normalizeIfsc)
  ) {
    return;
  }

  const records = recordsOverride ?? (await loadDuplicateCheckRecords(kind));
  const duplicate = findDuplicateRecord(records, field, params, excludeId);
  if (!duplicate) return;

  throw new Error(duplicateMessage(MODULE_LABELS[kind], field, duplicate.displayName));
}
