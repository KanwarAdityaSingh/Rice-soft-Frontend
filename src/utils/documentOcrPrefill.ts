import type {
  AadhaarOcrResponse,
  ContactPerson,
  GstOcrResponse,
  PanOcrResponse,
  VendorAddress,
} from '../types/entities';
import {
  resolveAadhaarNameFromOcr,
  resolveAadhaarNumberFromOcr,
  resolveBusinessNameFromGstOcr,
  resolveGstNumberFromOcr,
  resolveGstPanFromOcr,
  resolveOcrAddressParts,
  resolvePanNameFromOcr,
  resolvePanNumberFromOcr,
} from './documentOcrFields';
import { applyAutofillAddress } from './panLookupEnrichment';

function mergeAddress(existing: VendorAddress, patch: Partial<VendorAddress>): VendorAddress {
  return applyAutofillAddress(existing, patch);
}

function prefillContactName(contacts: ContactPerson[], name: string | null): ContactPerson[] {
  if (!name?.trim()) return contacts;
  if (contacts.length === 0) {
    return [{ name, phones: [''], emails: [''] }];
  }
  const first = contacts[0];
  if (first.name?.trim()) return contacts;
  return [{ ...first, name }, ...contacts.slice(1)];
}

/** Flat party fields (transporter). */
export interface FlatPartyOcrForm {
  business_name?: string;
  gst_number?: string | null;
  pan_number?: string | null;
  aadhar_number?: string | null;
  address?: VendorAddress;
  contact_persons?: ContactPerson[];
}

export function applyGstOcrToFlatParty(
  form: FlatPartyOcrForm,
  result: GstOcrResponse,
): FlatPartyOcrForm {
  const gstNumber = resolveGstNumberFromOcr(result);
  const businessName = resolveBusinessNameFromGstOcr(result);
  const panNumber = resolveGstPanFromOcr(result);
  const addressPatch = resolveOcrAddressParts(result.address);

  return {
    ...form,
    ...(gstNumber ? { gst_number: gstNumber } : {}),
    ...(panNumber ? { pan_number: panNumber } : {}),
    ...(businessName ? { business_name: businessName } : {}),
    ...(form.address && Object.keys(addressPatch).length > 0
      ? { address: mergeAddress(form.address, addressPatch) }
      : {}),
    ...(form.contact_persons && businessName
      ? { contact_persons: prefillContactName(form.contact_persons, businessName) }
      : {}),
  };
}

export function applyPanOcrToFlatParty(
  form: FlatPartyOcrForm,
  result: PanOcrResponse,
): FlatPartyOcrForm {
  const panNumber = resolvePanNumberFromOcr(result);
  const name = resolvePanNameFromOcr(result);

  return {
    ...form,
    ...(panNumber ? { pan_number: panNumber } : {}),
    ...(name && !form.business_name?.trim() ? { business_name: name } : {}),
    ...(form.contact_persons && name
      ? { contact_persons: prefillContactName(form.contact_persons, name) }
      : {}),
  };
}

export function applyAadhaarOcrToFlatParty(
  form: FlatPartyOcrForm,
  result: AadhaarOcrResponse,
): FlatPartyOcrForm {
  const aadhaarNumber = resolveAadhaarNumberFromOcr(result);
  const name = resolveAadhaarNameFromOcr(result);
  const addressPatch = {
    ...resolveOcrAddressParts(result.address),
    ...(result.state?.trim() ? { state: result.state.trim() } : {}),
    ...(result.pincode?.trim() ? { pincode: result.pincode.trim() } : {}),
  };

  return {
    ...form,
    ...(aadhaarNumber ? { aadhar_number: aadhaarNumber } : {}),
    ...(name && !form.business_name?.trim() ? { business_name: name } : {}),
    ...(form.address && Object.keys(addressPatch).length > 0
      ? { address: mergeAddress(form.address, addressPatch) }
      : {}),
    ...(form.contact_persons && name
      ? { contact_persons: prefillContactName(form.contact_persons, name) }
      : {}),
  };
}

/** Vendor / broker / sales party with nested business_details. */
export interface NestedPartyOcrForm<TBusinessDetails extends {
  gst_number?: string;
  pan_number?: string;
  aadhaar_number?: string;
  business_name?: string;
} = {
  gst_number?: string;
  pan_number?: string;
  aadhaar_number?: string;
  business_name?: string;
}> {
  name?: string;
  business_name?: string;
  aadhar_number?: string | null;
  business_details: TBusinessDetails;
  address?: VendorAddress;
  contact_persons?: ContactPerson[];
}

export function applyGstOcrToNestedParty<T extends NestedPartyOcrForm>(
  form: T,
  result: GstOcrResponse,
): T {
  const gstNumber = resolveGstNumberFromOcr(result);
  const businessName = resolveBusinessNameFromGstOcr(result);
  const panNumber = resolveGstPanFromOcr(result);
  const addressPatch = resolveOcrAddressParts(result.address);

  return {
    ...form,
    ...(businessName && !form.name?.trim() ? { name: businessName } : {}),
    ...(businessName && !form.business_name?.trim() ? { business_name: businessName } : {}),
    business_details: {
      ...form.business_details,
      ...(gstNumber ? { gst_number: gstNumber } : {}),
      ...(panNumber ? { pan_number: panNumber } : {}),
      ...(businessName ? { business_name: businessName } : {}),
    },
    ...(form.address && Object.keys(addressPatch).length > 0
      ? { address: mergeAddress(form.address, addressPatch) }
      : {}),
    ...(form.contact_persons && businessName
      ? { contact_persons: prefillContactName(form.contact_persons, businessName) }
      : {}),
  };
}

export function applyPanOcrToNestedParty<T extends NestedPartyOcrForm>(
  form: T,
  result: PanOcrResponse,
): T {
  const panNumber = resolvePanNumberFromOcr(result);
  const name = resolvePanNameFromOcr(result);

  return {
    ...form,
    ...(name && !form.name?.trim() ? { name } : {}),
    ...(name && !form.business_name?.trim() ? { business_name: name } : {}),
    business_details: {
      ...form.business_details,
      ...(panNumber ? { pan_number: panNumber } : {}),
      ...(name ? { business_name: name } : {}),
    },
    ...(form.contact_persons && name
      ? { contact_persons: prefillContactName(form.contact_persons, name) }
      : {}),
  };
}

export function applyAadhaarOcrToNestedParty<T extends NestedPartyOcrForm>(
  form: T,
  result: AadhaarOcrResponse,
): T {
  const aadhaarNumber = resolveAadhaarNumberFromOcr(result);
  const name = resolveAadhaarNameFromOcr(result);
  const addressPatch = {
    ...resolveOcrAddressParts(result.address),
    ...(result.state?.trim() ? { state: result.state.trim() } : {}),
    ...(result.pincode?.trim() ? { pincode: result.pincode.trim() } : {}),
  };

  return {
    ...form,
    ...(name && !form.name?.trim() ? { name } : {}),
    ...(name && !form.business_name?.trim() ? { business_name: name } : {}),
    ...(aadhaarNumber ? { aadhar_number: aadhaarNumber } : {}),
    business_details: {
      ...form.business_details,
      ...(aadhaarNumber ? { aadhaar_number: aadhaarNumber } : {}),
      ...(name ? { business_name: name } : {}),
    },
    ...(form.address && Object.keys(addressPatch).length > 0
      ? { address: mergeAddress(form.address, addressPatch) }
      : {}),
    ...(form.contact_persons && name
      ? { contact_persons: prefillContactName(form.contact_persons, name) }
      : {}),
  };
}

/** Godown / packaging vendor — GST + name. */
export interface SimpleGstOcrForm {
  name?: string;
  gst_number?: string | null;
  address?: VendorAddress;
  contact_persons?: ContactPerson[];
}

/** CRM lead — company_name + optional business_details. */
export interface LeadOcrForm {
  company_name?: string;
  business_details?: {
    gst_number?: string;
    pan_number?: string;
    business_name?: string;
    [key: string]: unknown;
  };
  address?: Partial<VendorAddress>;
  contact_persons?: ContactPerson[];
}

export function applyGstOcrToLead(form: LeadOcrForm, result: GstOcrResponse): LeadOcrForm {
  const gstNumber = resolveGstNumberFromOcr(result);
  const businessName = resolveBusinessNameFromGstOcr(result);
  const panNumber = resolveGstPanFromOcr(result);
  const addressPatch = resolveOcrAddressParts(result.address);

  return {
    ...form,
    ...(businessName && !form.company_name?.trim() ? { company_name: businessName } : {}),
    business_details: {
      ...form.business_details,
      ...(gstNumber ? { gst_number: gstNumber } : {}),
      ...(panNumber ? { pan_number: panNumber } : {}),
      ...(businessName ? { business_name: businessName } : {}),
    },
    ...(form.address && Object.keys(addressPatch).length > 0
      ? { address: mergeAddress(form.address as VendorAddress, addressPatch) }
      : {}),
    ...(form.contact_persons && businessName
      ? { contact_persons: prefillContactName(form.contact_persons, businessName) }
      : {}),
  };
}

export function applyPanOcrToLead(form: LeadOcrForm, result: PanOcrResponse): LeadOcrForm {
  const panNumber = resolvePanNumberFromOcr(result);
  const name = resolvePanNameFromOcr(result);

  return {
    ...form,
    ...(name && !form.company_name?.trim() ? { company_name: name } : {}),
    business_details: {
      ...form.business_details,
      ...(panNumber ? { pan_number: panNumber } : {}),
      ...(name ? { business_name: name } : {}),
    },
    ...(form.contact_persons && name
      ? { contact_persons: prefillContactName(form.contact_persons, name) }
      : {}),
  };
}

export function applyGstOcrToSimpleEntity(
  form: SimpleGstOcrForm,
  result: GstOcrResponse,
): SimpleGstOcrForm {
  const gstNumber = resolveGstNumberFromOcr(result);
  const businessName = resolveBusinessNameFromGstOcr(result);
  const addressPatch = resolveOcrAddressParts(result.address);

  return {
    ...form,
    ...(gstNumber ? { gst_number: gstNumber } : {}),
    ...(businessName && !form.name?.trim() ? { name: businessName } : {}),
    ...(form.address && Object.keys(addressPatch).length > 0
      ? { address: mergeAddress(form.address, addressPatch) }
      : {}),
    ...(form.contact_persons && businessName
      ? { contact_persons: prefillContactName(form.contact_persons, businessName) }
      : {}),
  };
}
