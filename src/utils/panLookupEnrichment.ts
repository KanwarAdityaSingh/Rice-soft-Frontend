import { kycAPI } from '../services/kyc.api';
import type {
  ContactPerson,
  EntityKycVerificationDetails,
  GSTLookupResponseData,
  GstinByPanResponse,
  KycPersistContext,
  PanContactResponse,
  PANLookupResponseData,
  VendorAddress,
} from '../types/entities';
import {
  buildSurepassSnapshot,
  mergeEntityKycSnapshot,
  persistGstLookupSnapshot,
  persistPanLookupSnapshot,
} from './kycVerification';
import { sanitizePhoneInput, sanitizePhoneList } from './phoneFormatting';

export interface EnrichedPanLookupResult {
  panComprehensive: PANLookupResponseData;
  gstinByPan: GstinByPanResponse | null;
  panContact: PanContactResponse | null;
  gstAdvanced: GSTLookupResponseData | null;
}

export interface PanLookupAutofill {
  businessName?: string;
  panNumber?: string;
  gstNumber?: string;
  address: Partial<VendorAddress>;
  contactPersonName?: string;
  phones: string[];
  emails: string[];
  businessType?: string;
  lockedFields: string[];
}

export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (word.length === 0) return '';
      if (word.length === 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function titleCaseAddress(address?: Partial<VendorAddress>): Partial<VendorAddress> {
  if (!address) return {};
  return {
    ...address,
    ...(address.street ? { street: toTitleCase(address.street) } : {}),
    ...(address.city ? { city: toTitleCase(address.city) } : {}),
    ...(address.state ? { state: toTitleCase(address.state) } : {}),
    ...(address.country ? { country: toTitleCase(address.country) } : {}),
  };
}

async function safeLookup<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/** Run PAN comprehensive + GSTIN-by-PAN + PAN contact (+ GST advanced when GSTIN found). */
export async function runEnrichedPanLookup(
  panNumber: string,
  persist?: KycPersistContext,
): Promise<EnrichedPanLookupResult> {
  const normalizedPan = panNumber.trim().toUpperCase();

  const [panComprehensive, gstinByPan, panContact] = await Promise.all([
    kycAPI.lookupPANComprehensive(normalizedPan, persist),
    safeLookup(() => kycAPI.lookupGstinByPan(normalizedPan, persist)),
    safeLookup(() => kycAPI.lookupPanContact(normalizedPan, persist)),
  ]);

  const gstin =
    gstinByPan?.primary_gstin?.trim() ||
    gstinByPan?.active_gstins?.[0]?.trim() ||
    gstinByPan?.gstin_list?.find((entry) => entry.gstin)?.gstin?.trim() ||
    null;

  const gstAdvanced = gstin
    ? await safeLookup(() => kycAPI.lookupGSTAdvanced(gstin, persist))
    : null;

  return { panComprehensive, gstinByPan, panContact, gstAdvanced };
}

export function buildPanLookupAutofill(result: EnrichedPanLookupResult): PanLookupAutofill {
  const lockedFields: string[] = [];
  const { panComprehensive, gstinByPan, panContact, gstAdvanced } = result;

  const panMapped = panComprehensive.mapped_data;
  const panData = panComprehensive.pan_data;

  let businessName = panMapped?.business_name ? toTitleCase(panMapped.business_name) : undefined;

  let panNumber =
    panMapped?.business_details?.pan_number?.trim().toUpperCase() ||
    panData?.pan?.trim().toUpperCase() ||
    undefined;
  if (panNumber) lockedFields.push('pan_number');

  let address = titleCaseAddress(panMapped?.address);
  let businessType = panMapped?.business_details?.business_type;

  let contactPersonName: string | undefined;
  if (panData?.category === 'person' && panData?.name) {
    contactPersonName = toTitleCase(panData.name);
  }

  let gstNumber =
    gstinByPan?.primary_gstin?.trim().toUpperCase() ||
    gstinByPan?.active_gstins?.[0]?.trim().toUpperCase() ||
    undefined;

  if (gstAdvanced?.mapped_data) {
    const gstMapped = gstAdvanced.mapped_data;
    if (gstMapped.business_name) {
      businessName = toTitleCase(gstMapped.business_name);
    }
    if (gstMapped.address) {
      address = { ...address, ...titleCaseAddress(gstMapped.address) };
    }
    if (gstMapped.business_details?.pan_number) {
      panNumber = gstMapped.business_details.pan_number.trim().toUpperCase();
      if (!lockedFields.includes('pan_number')) lockedFields.push('pan_number');
    }
    if (gstMapped.business_details?.business_type) {
      businessType = gstMapped.business_details.business_type;
    }
    gstNumber =
      gstAdvanced.gst_data?.gstin?.trim().toUpperCase() ||
      gstNumber;
  }

  if (gstNumber && !lockedFields.includes('gst_number')) {
    lockedFields.push('gst_number');
  }

  return {
    businessName,
    panNumber,
    gstNumber,
    address,
    contactPersonName,
    phones: sanitizePhoneList(panContact?.mobile_numbers ?? []),
    emails: panContact?.email_ids ?? [],
    businessType,
    lockedFields,
  };
}

export function applyAutofillAddress(
  existing: VendorAddress,
  autofill: Partial<VendorAddress>,
): VendorAddress {
  return {
    ...existing,
    ...(autofill.street ? { street: autofill.street } : {}),
    ...(autofill.city ? { city: autofill.city } : {}),
    ...(autofill.state ? { state: autofill.state } : {}),
    ...(autofill.pincode ? { pincode: autofill.pincode } : {}),
    ...(autofill.country ? { country: autofill.country } : {}),
  };
}


/** Replace contact persons with API-fetched PAN contact data when available; otherwise keep existing rows. */
export function mergePanContactIntoContactPersons(
  contactPersons: ContactPerson[],
  autofill: Pick<PanLookupAutofill, 'contactPersonName' | 'phones' | 'emails'>,
): ContactPerson[] {
  const name = autofill.contactPersonName?.trim() || '';
  const phones = sanitizePhoneList(autofill.phones);
  const emails = autofill.emails.map((e) => e.trim()).filter(Boolean);

  const hasContactData = Boolean(name || phones.length > 0 || emails.length > 0);
  if (!hasContactData) {
    return contactPersons.length > 0
      ? contactPersons.map((cp) => ({
          ...cp,
          phones: [...(cp.phones?.length ? cp.phones : [''])],
          emails: [...(cp.emails?.length ? cp.emails : [''])],
        }))
      : [{ name: '', phones: [''], emails: [''] }];
  }

  return [{
    name,
    phones: phones.length > 0 ? phones : [''],
    emails: emails.length > 0 ? emails : [''],
  }];
}

export function persistEnrichedPanLookupSnapshots(
  existing: EntityKycVerificationDetails | undefined,
  result: EnrichedPanLookupResult,
): EntityKycVerificationDetails {
  let next = persistPanLookupSnapshot(existing, result.panComprehensive);

  if (result.gstinByPan?.surepass_response) {
    next = mergeEntityKycSnapshot(
      next,
      'gstin_by_pan',
      buildSurepassSnapshot(result.gstinByPan.surepass_response, {
        pan_number: result.gstinByPan.pan_number,
        gstin_list: result.gstinByPan.gstin_list,
        active_gstins: result.gstinByPan.active_gstins,
        primary_gstin: result.gstinByPan.primary_gstin,
      }),
    );
  }

  if (result.panContact?.surepass_response) {
    next = mergeEntityKycSnapshot(
      next,
      'pan_contact',
      buildSurepassSnapshot(result.panContact.surepass_response, {
        pan_number: result.panContact.pan_number,
        email_ids: result.panContact.email_ids,
        mobile_numbers: result.panContact.mobile_numbers,
      }),
    );
  }

  if (result.gstAdvanced) {
    next = persistGstLookupSnapshot(next, result.gstAdvanced);
  }

  return next;
}
