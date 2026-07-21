import type { Broker, RiceCategory, RiceCode, Sauda, Vendor, VendorAddress } from '../types/entities';
import { formatRiceCategoryFallback } from './riceCategory';
import { getFinancialYearKeyFromIsoDate } from './financialYear';

type SaudaWithPartyFields = Pick<Sauda, 'purchaser_id' | 'broker_id'> & {
  purchaser_name?: string | null;
  purchaser?: { business_name?: string | null } | null;
  broker_name?: string | null;
  broker?: { business_name?: string | null } | null;
};

export function getSaudaPurchaserName(
  sauda: SaudaWithPartyFields,
  vendors: Vendor[],
  vendorNameById: Record<string, string> = {},
): string {
  if (sauda.purchaser?.business_name?.trim()) return sauda.purchaser.business_name.trim();
  if (sauda.purchaser_name?.trim()) return sauda.purchaser_name.trim();
  const vendor = vendors.find((v) => v.id === sauda.purchaser_id);
  if (vendor?.business_name) return vendor.business_name;
  if (sauda.purchaser_id && vendorNameById[sauda.purchaser_id]) {
    return vendorNameById[sauda.purchaser_id];
  }
  return '';
}

export function getSaudaBrokerName(
  sauda: SaudaWithPartyFields,
  brokers: Broker[],
  brokerNameById: Record<string, string> = {},
): string {
  if (sauda.broker?.business_name?.trim()) return sauda.broker.business_name.trim();
  if (sauda.broker_name?.trim()) return sauda.broker_name.trim();
  if (!sauda.broker_id) return '';
  const broker = brokers.find((b) => b.id === sauda.broker_id);
  if (broker?.business_name) return broker.business_name;
  if (brokerNameById[sauda.broker_id]) return brokerNameById[sauda.broker_id];
  return '';
}

type SaudaWithRiceCodeFields = Pick<Sauda, 'rice_code_id'> & {
  rice_code_name?: string | null;
  rice_code?: { rice_code_id?: string; rice_code_name?: string | null } | null;
};

export function getSaudaRiceCodeName(
  sauda: SaudaWithRiceCodeFields,
  riceCodes: RiceCode[],
  riceCodeNameById: Record<string, string> = {},
): string {
  if (sauda.rice_code?.rice_code_name?.trim()) return sauda.rice_code.rice_code_name.trim();
  if (sauda.rice_code_name?.trim()) return sauda.rice_code_name.trim();
  if (!sauda.rice_code_id) return '';
  const riceCode = riceCodes.find((rc) => rc.rice_code_id === sauda.rice_code_id);
  if (riceCode?.rice_code_name) return riceCode.rice_code_name;
  if (riceCodeNameById[sauda.rice_code_id]) return riceCodeNameById[sauda.rice_code_id];
  return '';
}

export function getRiceCodeNameById(
  riceCodeId: string | null | undefined,
  riceCodes: RiceCode[],
  riceCodeNameById: Record<string, string> = {},
): string {
  if (!riceCodeId) return '';
  const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
  if (riceCode?.rice_code_name) return riceCode.rice_code_name;
  return riceCodeNameById[riceCodeId] ?? '';
}

export function formatSaudaTypeLabel(saudaType: Sauda['sauda_type'] | null | undefined): string {
  if (saudaType === 'exgodown') return 'Ex Godown';
  if (saudaType === 'for') return 'FOR';
  return '—';
}

export function getSaudaRiceCategoryLabel(
  sauda: Pick<Sauda, 'rice_category' | 'rice_code_id'>,
  riceCodes: RiceCode[],
): string {
  const category: RiceCategory | null | undefined =
    sauda.rice_category ??
    riceCodes.find((rc) => rc.rice_code_id === sauda.rice_code_id)?.category;
  if (!category) return '';
  return formatRiceCategoryFallback(category);
}

export function formatVendorAddress(address: VendorAddress | null | undefined): string {
  if (!address) return '';
  const street = address.street?.trim() || '';
  const streetLower = street.toLowerCase();
  // Avoid repeating city/state/pincode/country when street already embeds them (common after GST OCR).
  const extras = [address.city, address.state, address.pincode, address.country]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => !streetLower.includes(part.toLowerCase()));
  return [street, ...extras].filter(Boolean).join(', ');
}

export function addressesEqual(
  a: VendorAddress | null | undefined,
  b: VendorAddress | null | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    (a.street?.trim() ?? '') === (b.street?.trim() ?? '') &&
    (a.city?.trim() ?? '') === (b.city?.trim() ?? '') &&
    (a.state?.trim() ?? '') === (b.state?.trim() ?? '') &&
    (a.pincode?.trim() ?? '') === (b.pincode?.trim() ?? '') &&
    (a.country?.trim() ?? '') === (b.country?.trim() ?? '')
  );
}

/** True when ship-to should be hidden (same as bill-to, or no delivery address). */
export function isShipToSameAsBillTo(
  billingAddress: VendorAddress | null | undefined,
  deliveryAddress: VendorAddress | null | undefined,
): boolean {
  if (!deliveryAddress) return true;
  if (!billingAddress) return false;
  return addressesEqual(billingAddress, deliveryAddress);
}

export interface SaudaPartyDetails {
  party_name: string;
  party_address: string | null;
  party_gst_number: string | null;
  party_pan_number: string | null;
}

/** Party block for ISP / payment advice from sauda + optional vendor master row. */
export function partyDetailsFromSaudaVendor(
  sauda: SaudaWithPartyFields,
  vendor: Vendor | null | undefined,
  vendors: Vendor[] = [],
): SaudaPartyDetails {
  const party_name = getSaudaPurchaserName(sauda, vendors) || vendor?.business_name?.trim() || '';
  const party_address = formatVendorAddress(vendor?.address) || null;
  const gst = vendor?.business_details?.gst_number?.trim();
  const pan = vendor?.business_details?.pan_number?.trim();
  return {
    party_name,
    party_address,
    party_gst_number: gst ? gst.toUpperCase() : null,
    party_pan_number: pan ? pan.toUpperCase() : null,
  };
}

function safeFilenamePart(value: string, maxLen = 64): string {
  return (
    value
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '_')
      .slice(0, maxLen) || ''
  );
}

/** Sauda number for filenames — prefers API display_id, then list serial, then short id. */
export function getSaudaNumberLabel(
  sauda: Pick<Sauda, 'id' | 'display_id'> | null | undefined,
  serialNumber?: number | null,
): string {
  if (sauda?.display_id?.trim()) return sauda.display_id.trim();
  if (serialNumber != null) return String(serialNumber);
  if (sauda?.id) return sauda.id.slice(0, 8);
  return 'Sauda';
}

export interface BuildSaudaPdfFilenameParams {
  sauda?: Pick<
    Sauda,
    'id' | 'display_id' | 'sauda_date' | 'purchaser_id' | 'purchaser_name' | 'purchaser'
  > | null;
  serialNumber?: number | null;
  saudaDate?: string | null;
  partyName?: string | null;
  vendors?: Vendor[];
}

/** e.g. `E805_2025-26_Acme_Traders.pdf` */
export function buildSaudaPdfFilename(params: BuildSaudaPdfFilenameParams): string {
  const parts: string[] = [];

  const numberLabel = getSaudaNumberLabel(params.sauda ?? null, params.serialNumber);
  const safeNo = safeFilenamePart(numberLabel, 24);
  if (safeNo) parts.push(safeNo);

  const fy = getFinancialYearKeyFromIsoDate(params.saudaDate ?? params.sauda?.sauda_date);
  if (fy) parts.push(fy);

  let party = params.partyName?.trim();
  if (!party && params.sauda && params.vendors) {
    party = getSaudaPurchaserName(params.sauda, params.vendors);
  }
  if (party) {
    const safeParty = safeFilenamePart(party, 56);
    if (safeParty) parts.push(safeParty);
  }

  return `${parts.join('_') || 'Sauda'}.pdf`;
}

/** Document title for print-to-PDF (filename without relying on browser quirks). */
export function buildSaudaPdfDocumentTitle(params: BuildSaudaPdfFilenameParams): string {
  return buildSaudaPdfFilename(params).replace(/\.pdf$/i, '');
}

export function escapeHtmlForDocumentTitle(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
