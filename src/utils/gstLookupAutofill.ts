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
import { kycAPI } from '../services/kyc.api';
import { extractPanFromGst } from './panGstValidation';
import { toTitleCase } from './panLookupEnrichment';
import { sanitizePhoneInput, sanitizePhoneList } from './phoneFormatting';
import {
  buildSurepassSnapshot,
  mergeEntityKycSnapshot,
  persistGstLookupSnapshot,
  persistPanLookupSnapshot,
} from './kycVerification';

export interface GstLookupAutofill {
  businessName?: string;
  panNumber?: string;
  gstNumber?: string;
  businessType?: string;
  address: Partial<VendorAddress>;
  contactNames: string[];
  phones: string[];
  emails: string[];
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const normalized = normalizeName(raw);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(toTitleCase(normalized));
  }
  return result;
}

/** Parse GST principal address — locality/circle segment before state becomes city. */
export function parseGstPrincipalAddress(address: string): Partial<VendorAddress> {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return { street: toTitleCase(address.trim()) };
  }

  let working = [...parts];
  let pincode = '';
  let state = '';
  let city = '';

  const last = working[working.length - 1];
  if (/^\d{6}$/.test(last)) {
    pincode = last;
    working = working.slice(0, -1);
  }

  if (working.length >= 1) {
    state = working[working.length - 1];
    working = working.slice(0, -1);
  }

  if (working.length >= 1) {
    city = working[working.length - 1];
    working = working.slice(0, -1);
  }

  const street = working.join(', ').trim();

  return {
    ...(street ? { street: toTitleCase(street) } : {}),
    ...(city ? { city: toTitleCase(city) } : {}),
    ...(state ? { state: toTitleCase(state) } : {}),
    ...(pincode ? { pincode } : {}),
    country: 'India',
  };
}

function mergeGstAddress(
  mappedAddress?: Partial<VendorAddress>,
  principalAddress?: string,
): Partial<VendorAddress> {
  const parsedPrincipal = principalAddress?.trim()
    ? parseGstPrincipalAddress(principalAddress)
    : {};

  const street = mappedAddress?.street?.trim() || parsedPrincipal.street;
  const city = mappedAddress?.city?.trim() || parsedPrincipal.city;
  const state = mappedAddress?.state?.trim() || parsedPrincipal.state;
  const pincode = mappedAddress?.pincode?.trim() || parsedPrincipal.pincode;
  const country = mappedAddress?.country?.trim() || parsedPrincipal.country || 'India';

  return {
    ...(street ? { street: toTitleCase(street) } : {}),
    ...(city ? { city: toTitleCase(city) } : {}),
    ...(state ? { state: toTitleCase(state) } : {}),
    ...(pincode ? { pincode } : {}),
    ...(country ? { country: toTitleCase(country) } : {}),
  };
}

function mergeUniqueStrings(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((value) => value.trim()).filter(Boolean));
  const merged = [...existing];
  for (const value of incoming) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    merged.push(trimmed);
  }
  return merged;
}

function isContactPersonRowEmpty(cp: ContactPerson): boolean {
  const name = (cp.name || '').trim();
  const hasPhone = (cp.phones || []).some((p) => p?.trim());
  const hasEmail = (cp.emails || []).some((e) => e?.trim());
  return !name && !hasPhone && !hasEmail;
}

function normalizeContactPersonRows(contactPersons: ContactPerson[]): ContactPerson[] {
  const existingRows = (contactPersons.length > 0 ? contactPersons : [{ name: '', phones: [''], emails: [''] }])
    .map((cp) => ({
      ...cp,
      phones: [...(cp.phones?.length ? cp.phones : [''])],
      emails: [...(cp.emails?.length ? cp.emails : [''])],
    }));

  const nonEmptyRows = existingRows.filter((cp) => !isContactPersonRowEmpty(cp));
  return nonEmptyRows.length > 0 ? nonEmptyRows : [{ name: '', phones: [''], emails: [''] }];
}

function hasAutofillContactData(
  autofill: Pick<GstLookupAutofill, 'contactNames' | 'phones' | 'emails'>,
): boolean {
  return (
    uniqueNames(autofill.contactNames).length > 0 ||
    autofill.phones.some((p) => p?.trim()) ||
    autofill.emails.some((e) => e?.trim())
  );
}

function buildContactPersonsFromAutofill(
  autofill: Pick<GstLookupAutofill, 'contactNames' | 'phones' | 'emails'>,
): ContactPerson[] {
  const names = uniqueNames(autofill.contactNames);
  const phones = sanitizePhoneList(autofill.phones);
  const emails = autofill.emails.map((e) => e.trim()).filter(Boolean);

  if (names.length > 0) {
    return names.map((name, index) => ({
      name,
      phones: index === 0 ? (phones.length > 0 ? phones : ['']) : [''],
      emails: index === 0 ? (emails.length > 0 ? emails : ['']) : [''],
    }));
  }

  return [{
    name: '',
    phones: phones.length > 0 ? phones : [''],
    emails: emails.length > 0 ? emails : [''],
  }];
}

/** Replace contact persons with API-fetched data when available; otherwise keep existing rows. */
export function mergeGstContactPersons(
  contactPersons: ContactPerson[],
  autofill: Pick<GstLookupAutofill, 'contactNames' | 'phones' | 'emails'>,
): ContactPerson[] {
  if (!hasAutofillContactData(autofill)) {
    return normalizeContactPersonRows(contactPersons);
  }

  return buildContactPersonsFromAutofill(autofill);
}

export interface EnrichedGstLookupResult {
  gstAdvanced: GSTLookupResponseData;
  panComprehensive: PANLookupResponseData | null;
  gstinByPan: GstinByPanResponse | null;
  panContact: PanContactResponse | null;
}

async function safeLookup<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export function extractPanFromGstResponse(
  gstAdvanced: GSTLookupResponseData,
  gstNumber?: string,
): string | null {
  const fromMapped = gstAdvanced.mapped_data?.business_details?.pan_number?.trim().toUpperCase();
  const fromGstData = gstAdvanced.gst_data?.pan_number?.trim().toUpperCase();
  if (fromMapped) return fromMapped;
  if (fromGstData) return fromGstData;
  if (gstNumber) {
    const embedded = extractPanFromGst(gstNumber);
    return embedded || null;
  }
  const gstin = gstAdvanced.gst_data?.gstin?.trim().toUpperCase();
  if (gstin) {
    const embedded = extractPanFromGst(gstin);
    return embedded || null;
  }
  return null;
}

/** GST advanced lookup, then PAN comprehensive + GSTIN-by-PAN + PAN contact using embedded PAN. */
export async function runEnrichedGstLookup(
  gstNumber: string,
  persist?: KycPersistContext,
): Promise<EnrichedGstLookupResult> {
  const normalizedGst = gstNumber.trim().toUpperCase();
  const gstAdvanced = await kycAPI.lookupGSTAdvanced(normalizedGst, persist);
  const panNumber = extractPanFromGstResponse(gstAdvanced, normalizedGst);

  if (!panNumber) {
    return { gstAdvanced, panComprehensive: null, gstinByPan: null, panContact: null };
  }

  const [panComprehensive, gstinByPan, panContact] = await Promise.all([
    safeLookup(() => kycAPI.lookupPANComprehensive(panNumber, persist)),
    safeLookup(() => kycAPI.lookupGstinByPan(panNumber, persist)),
    safeLookup(() => kycAPI.lookupPanContact(panNumber, persist)),
  ]);

  return { gstAdvanced, panComprehensive, gstinByPan, panContact };
}

function mergeAddressPreferPrimary(
  primary: Partial<VendorAddress>,
  secondary: Partial<VendorAddress>,
): Partial<VendorAddress> {
  return {
    ...(secondary.street && !primary.street ? { street: secondary.street } : {}),
    ...(secondary.city && !primary.city ? { city: secondary.city } : {}),
    ...(secondary.state && !primary.state ? { state: secondary.state } : {}),
    ...(secondary.pincode && !primary.pincode ? { pincode: secondary.pincode } : {}),
    ...(secondary.country && !primary.country ? { country: secondary.country } : {}),
    ...primary,
  };
}

function appendPanSupplementarySnapshots(
  existing: EntityKycVerificationDetails,
  gstinByPan: GstinByPanResponse | null,
  panContact: PanContactResponse | null,
): EntityKycVerificationDetails {
  let next = existing;

  if (gstinByPan?.surepass_response) {
    next = mergeEntityKycSnapshot(
      next,
      'gstin_by_pan',
      buildSurepassSnapshot(gstinByPan.surepass_response, {
        pan_number: gstinByPan.pan_number,
        gstin_list: gstinByPan.gstin_list,
        active_gstins: gstinByPan.active_gstins,
        primary_gstin: gstinByPan.primary_gstin,
      }),
    );
  }

  if (panContact?.surepass_response) {
    next = mergeEntityKycSnapshot(
      next,
      'pan_contact',
      buildSurepassSnapshot(panContact.surepass_response, {
        pan_number: panContact.pan_number,
        email_ids: panContact.email_ids,
        mobile_numbers: panContact.mobile_numbers,
      }),
    );
  }

  return next;
}

export function persistEnrichedGstLookupSnapshots(
  existing: EntityKycVerificationDetails | undefined,
  result: EnrichedGstLookupResult,
): EntityKycVerificationDetails {
  let next = persistGstLookupSnapshot(existing, result.gstAdvanced);
  if (result.panComprehensive) {
    next = persistPanLookupSnapshot(next, result.panComprehensive);
  }
  return appendPanSupplementarySnapshots(next, result.gstinByPan, result.panContact);
}

/** Merge GST advanced + PAN API data into a single autofill payload. */
export function buildEnrichedGstLookupAutofill(result: EnrichedGstLookupResult): GstLookupAutofill {
  const base = buildGstLookupAutofill(result.gstAdvanced);
  const { panComprehensive, panContact } = result;

  if (!panComprehensive && !panContact) {
    return base;
  }

  const panMapped = panComprehensive?.mapped_data;
  const panData = panComprehensive?.pan_data;

  const panAddress: Partial<VendorAddress> = panMapped?.address
    ? {
        ...(panMapped.address.street ? { street: toTitleCase(panMapped.address.street) } : {}),
        ...(panMapped.address.city ? { city: toTitleCase(panMapped.address.city) } : {}),
        ...(panMapped.address.state ? { state: toTitleCase(panMapped.address.state) } : {}),
        ...(panMapped.address.pincode ? { pincode: panMapped.address.pincode } : {}),
        ...(panMapped.address.country ? { country: toTitleCase(panMapped.address.country) } : {}),
      }
    : {};

  const panContactNames: string[] = [];
  if (panData?.category === 'person' && panData.name?.trim()) {
    panContactNames.push(panData.name);
  }

  return {
    businessName: base.businessName ?? (panMapped?.business_name ? toTitleCase(panMapped.business_name) : undefined),
    panNumber:
      base.panNumber ??
      panMapped?.business_details?.pan_number?.trim().toUpperCase() ??
      panData?.pan?.trim().toUpperCase(),
    gstNumber: base.gstNumber,
    businessType: base.businessType ?? panMapped?.business_details?.business_type,
    address: mergeAddressPreferPrimary(base.address, panAddress),
    contactNames: uniqueNames([...panContactNames, ...base.contactNames]),
    phones: mergeUniqueStrings(base.phones, sanitizePhoneList(panContact?.mobile_numbers ?? [])),
    emails: mergeUniqueStrings(base.emails, panContact?.email_ids ?? []),
  };
}

/** Build autofill payload from Surepass GSTIN advanced lookup. */
export function buildGstLookupAutofill(response: GSTLookupResponseData): GstLookupAutofill {
  const { gst_data: gstData, mapped_data: mapped } = response;
  const principal = gstData.contact_details?.principal;

  const businessName = mapped?.business_name || gstData.business_name;
  const legalName = mapped?.legal_name || gstData.legal_name;
  const promoters = (gstData.promoters ?? []).filter(Boolean);

  const gstNumber =
    mapped?.business_details?.gst_number?.trim().toUpperCase() ||
    gstData.gstin?.trim().toUpperCase();
  const panNumber =
    mapped?.business_details?.pan_number?.trim().toUpperCase() ||
    gstData.pan_number?.trim().toUpperCase();

  const phones = principal?.mobile?.trim()
    ? [sanitizePhoneInput(principal.mobile.trim())].filter(Boolean)
    : [];
  const emails = principal?.email?.trim() ? [principal.email.trim().toLowerCase()] : [];

  return {
    businessName: businessName ? toTitleCase(businessName) : undefined,
    panNumber,
    gstNumber,
    businessType: mapped?.business_details?.business_type,
    address: mergeGstAddress(mapped?.address, principal?.address),
    contactNames: uniqueNames([legalName ?? '', ...promoters]),
    phones,
    emails,
  };
}
