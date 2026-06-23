import type {
  ContactPerson,
  GSTLookupResponseData,
  VendorAddress,
} from '../types/entities';
import type { EnrichedPanLookupResult } from './panLookupEnrichment';
import { toTitleCase } from './panLookupEnrichment';
import {
  buildEnrichedGstLookupAutofill,
  buildGstLookupAutofill,
  mergeGstContactPersons,
  parseGstPrincipalAddress,
  type EnrichedGstLookupResult,
} from './gstLookupAutofill';
import { sanitizePhoneInput, sanitizePhoneList } from './phoneFormatting';

export { parseGstPrincipalAddress };
export { mergeGstContactPersons as mergeKycContactPersons };

export interface TransporterKycAutofill {
  businessName?: string;
  panNumber?: string;
  gstNumber?: string;
  address: Partial<VendorAddress>;
  contactNames: string[];
  phones: string[];
  emails: string[];
  /** True when GST advanced lookup succeeded with a GSTIN. */
  gstFound: boolean;
  switchToRegistered: boolean;
  /** Registered: autofill business name from API. Unregistered: user enters manually. */
  fillBusinessName: boolean;
  /** Registered: autofill address from API. Unregistered: user enters manually. */
  fillAddress: boolean;
  /** User-facing note after lookup (esp. when GST was not found). */
  lookupMessage?: string;
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

export function buildTransporterGstAutofill(
  response: GSTLookupResponseData | EnrichedGstLookupResult,
): TransporterKycAutofill {
  const gstAutofill =
    'gstAdvanced' in response
      ? buildEnrichedGstLookupAutofill(response)
      : buildGstLookupAutofill(response);

  return {
    ...gstAutofill,
    gstFound: Boolean(gstAutofill.gstNumber),
    switchToRegistered: true,
    fillBusinessName: true,
    fillAddress: true,
  };
}

export function buildTransporterPanAutofill(
  result: EnrichedPanLookupResult,
): TransporterKycAutofill {
  const { panComprehensive, panContact, gstAdvanced, gstinByPan } = result;
  const panMapped = panComprehensive.mapped_data;
  const panData = panComprehensive.pan_data;

  const panNumber =
    panMapped?.business_details?.pan_number?.trim().toUpperCase() ||
    panData?.pan?.trim().toUpperCase();

  const unregisteredContactNames: string[] = [];
  if (panData?.name?.trim()) {
    unregisteredContactNames.push(panData.name);
  }

  const unregisteredAddress: Partial<VendorAddress> = panMapped?.address
    ? {
        ...(panMapped.address.street ? { street: toTitleCase(panMapped.address.street) } : {}),
        ...(panMapped.address.city ? { city: toTitleCase(panMapped.address.city) } : {}),
        ...(panMapped.address.state ? { state: toTitleCase(panMapped.address.state) } : {}),
        ...(panMapped.address.pincode ? { pincode: panMapped.address.pincode } : {}),
        ...(panMapped.address.country ? { country: toTitleCase(panMapped.address.country) } : {}),
      }
    : {};

  if (gstAdvanced) {
    const gstAutofill = buildTransporterGstAutofill(gstAdvanced);

    return {
      ...gstAutofill,
      panNumber: gstAutofill.panNumber ?? panNumber,
      contactNames: uniqueNames([
        ...unregisteredContactNames,
        ...gstAutofill.contactNames,
      ]),
      phones: mergeUniqueStrings(panContact?.mobile_numbers?.map(sanitizePhoneInput).filter(Boolean) ?? [], gstAutofill.phones),
      emails: mergeUniqueStrings(panContact?.email_ids ?? [], gstAutofill.emails),
      gstFound: true,
      switchToRegistered: true,
      fillBusinessName: true,
      fillAddress: true,
      lookupMessage: 'GST details found and filled. Transporter set to Registered.',
    };
  }

  const gstinListed =
    gstinByPan?.primary_gstin?.trim() ||
    gstinByPan?.active_gstins?.[0]?.trim() ||
    gstinByPan?.gstin_list?.find((entry) => entry.gstin)?.gstin?.trim();

  let lookupMessage =
    'No GSTIN found for this PAN. Contact and address filled from PAN; enter business name manually. Transporter kept as Unregistered.';
  if (gstinByPan === null) {
    lookupMessage =
      'Could not check GSTIN for this PAN. Contact and address filled from PAN; enter business name manually. Transporter kept as Unregistered.';
  } else if (gstinListed) {
    lookupMessage =
      'GSTIN was found but full GST details could not be loaded. Contact and address filled from PAN; enter business name manually. Transporter kept as Unregistered.';
  }

  return {
    businessName: undefined,
    panNumber,
    gstNumber: undefined,
    address: unregisteredAddress,
    contactNames: uniqueNames(unregisteredContactNames),
    phones: sanitizePhoneList(panContact?.mobile_numbers ?? []),
    emails: panContact?.email_ids ?? [],
    gstFound: false,
    switchToRegistered: false,
    fillBusinessName: false,
    fillAddress: true,
    lookupMessage,
  };
}

/** Apply transporter KYC autofill respecting registered vs unregistered rules. */
export function applyTransporterKycAutofill(
  formData: {
    business_name: string;
    address: VendorAddress;
    gst_number?: string | null;
    pan_number?: string | null;
    transport_type: 'registered' | 'unregistered';
    contact_persons: ContactPerson[];
  },
  autofill: TransporterKycAutofill,
): Pick<
  typeof formData,
  'business_name' | 'address' | 'gst_number' | 'pan_number' | 'transport_type' | 'contact_persons'
> {
  const nextTransportType = autofill.switchToRegistered
    ? 'registered'
    : formData.gst_number?.trim()
      ? formData.transport_type
      : 'unregistered';

  return {
    transport_type: nextTransportType,
    business_name:
      autofill.fillBusinessName && autofill.businessName
        ? autofill.businessName
        : formData.business_name,
    gst_number: autofill.gstNumber ?? formData.gst_number ?? null,
    pan_number: autofill.panNumber ?? formData.pan_number ?? null,
    address: autofill.fillAddress
      ? applyTransporterKycAutofillAddress(formData.address, autofill.address)
      : formData.address,
    contact_persons: mergeGstContactPersons(formData.contact_persons, autofill),
  };
}

export function applyTransporterKycAutofillAddress(
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
