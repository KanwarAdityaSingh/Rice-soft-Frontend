import type { AadhaarValidationResult, VendorAddress } from '../types/entities';
import { toTitleCase } from './panLookupEnrichment';

export interface AadhaarValidationAutofill {
  aadhaarNumber: string;
  addressState?: string;
  gender?: string;
  ageRange?: string;
  lastDigits?: string;
  isMobileLinked?: boolean;
  remarks?: string;
}

export function buildAadhaarValidationAutofill(
  data: AadhaarValidationResult,
): AadhaarValidationAutofill {
  const cleaned = data.aadhaar_number?.replace(/\s/g, '').trim() || '';

  return {
    aadhaarNumber: cleaned,
    ...(data.state?.trim() ? { addressState: toTitleCase(data.state.trim()) } : {}),
    ...(data.gender?.trim() ? { gender: data.gender.trim() } : {}),
    ...(data.age_range?.trim() ? { ageRange: data.age_range.trim() } : {}),
    ...(data.last_digits?.trim() ? { lastDigits: data.last_digits.trim() } : {}),
    ...(data.is_mobile !== undefined ? { isMobileLinked: data.is_mobile } : {}),
    ...(data.remarks?.trim() ? { remarks: data.remarks.trim() } : {}),
  };
}

export function applyAadhaarStateToAddress(
  existing: VendorAddress,
  autofill: Pick<AadhaarValidationAutofill, 'addressState'>,
): VendorAddress {
  if (!autofill.addressState?.trim()) return existing;
  return {
    ...existing,
    state: existing.state?.trim() ? existing.state : autofill.addressState,
  };
}

export function formatAadhaarValidationSummary(autofill: AadhaarValidationAutofill): string {
  const details: string[] = [];
  if (autofill.addressState) details.push(`State: ${autofill.addressState}`);
  if (autofill.gender) details.push(`Gender: ${autofill.gender}`);
  if (autofill.ageRange) details.push(`Age: ${autofill.ageRange}`);
  if (autofill.lastDigits) details.push(`Last digits: ${autofill.lastDigits}`);
  if (autofill.isMobileLinked !== undefined) {
    details.push(`Mobile linked: ${autofill.isMobileLinked ? 'Yes' : 'No'}`);
  }

  if (details.length === 0) {
    return 'Aadhaar validated via Surepass.';
  }

  return `Aadhaar validated via Surepass. ${details.join(' · ')}`;
}
