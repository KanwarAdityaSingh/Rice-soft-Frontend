import type {
  ContactPerson,
  EntityKycVerificationDetails,
  VendorAddress,
  VendorBankDetails,
} from '../types/entities';
import { isEmailVerifiedInKyc } from './kycVerification';
import type { GstLookupAutofill } from './gstLookupAutofill';
import type { PanLookupAutofill } from './panLookupEnrichment';
import type { AadhaarValidationAutofill } from './aadhaarValidationAutofill';

export type VendorFieldLockKey = string;

export const VENDOR_LOCKED_INPUT_CLASS =
  'read-only:cursor-not-allowed opacity-80 bg-muted/40 pointer-events-none';

export function isVendorFieldLocked(locks: Set<VendorFieldLockKey>, key: VendorFieldLockKey): boolean {
  return locks.has(key);
}

export function lockedClassFor(locks: Set<VendorFieldLockKey>, key: VendorFieldLockKey): string {
  return isVendorFieldLocked(locks, key) ? VENDOR_LOCKED_INPUT_CLASS : '';
}

export function mergeFieldLocks(
  existing: Set<VendorFieldLockKey>,
  incoming: Set<VendorFieldLockKey>,
): Set<VendorFieldLockKey> {
  return new Set([...existing, ...incoming]);
}

function lockAddressFields(locks: Set<VendorFieldLockKey>, address: Partial<VendorAddress> | undefined) {
  if (!address) return;
  if (address.street?.trim()) locks.add('address.street');
  if (address.city?.trim()) locks.add('address.city');
  if (address.state?.trim()) locks.add('address.state');
  if (address.pincode?.trim()) locks.add('address.pincode');
  if (address.country?.trim()) locks.add('address.country');
}

export function collectContactAutofillLocks(contactPersons: ContactPerson[]): Set<VendorFieldLockKey> {
  const locks = new Set<VendorFieldLockKey>();
  contactPersons.forEach((cp, personIdx) => {
    (cp.phones ?? []).forEach((phone, phoneIdx) => {
      if (phone?.trim()) locks.add(`contact_person_${personIdx}_phone_${phoneIdx}`);
    });
    (cp.emails ?? []).forEach((email, emailIdx) => {
      if (email?.trim()) locks.add(`contact_person_${personIdx}_email_${emailIdx}`);
    });
  });
  return locks;
}

export function collectVerifiedEmailFieldLocks(
  contactPersons: ContactPerson[],
  kyc: EntityKycVerificationDetails | undefined,
): Set<VendorFieldLockKey> {
  const locks = new Set<VendorFieldLockKey>();
  if (!kyc?.emails) return locks;

  contactPersons.forEach((cp, personIdx) => {
    (cp.emails ?? []).forEach((email, emailIdx) => {
      const trimmed = email?.trim();
      if (trimmed && isEmailVerifiedInKyc(kyc, trimmed)) {
        locks.add(`contact_person_${personIdx}_email_${emailIdx}`);
      }
    });
  });

  return locks;
}

export function collectVerifiedEmailFieldLocksFromList(
  contactPersons: ContactPerson[],
  verifiedEmails: string[],
): Set<VendorFieldLockKey> {
  const locks = new Set<VendorFieldLockKey>();
  const verified = new Set(verifiedEmails.map((email) => email.trim().toLowerCase()));

  contactPersons.forEach((cp, personIdx) => {
    (cp.emails ?? []).forEach((email, emailIdx) => {
      if (verified.has(email.trim().toLowerCase())) {
        locks.add(`contact_person_${personIdx}_email_${emailIdx}`);
      }
    });
  });

  return locks;
}

export function collectGstLookupAutofillLocks(
  autofill: GstLookupAutofill,
  contactPersons: ContactPerson[],
): Set<VendorFieldLockKey> {
  const locks = new Set<VendorFieldLockKey>();
  if (autofill.gstNumber) locks.add('gst_number');
  if (autofill.panNumber) locks.add('pan_number');
  if (autofill.businessName) {
    locks.add('account_holder_name');
  }
  if (autofill.businessType) locks.add('business_type');
  lockAddressFields(locks, autofill.address);
  return mergeFieldLocks(locks, collectContactAutofillLocks(contactPersons));
}

export function collectPanLookupAutofillLocks(
  autofill: PanLookupAutofill,
  contactPersons: ContactPerson[],
): Set<VendorFieldLockKey> {
  const locks = new Set<VendorFieldLockKey>(autofill.lockedFields);
  lockAddressFields(locks, autofill.address);
  if (autofill.businessName) locks.add('account_holder_name');
  return mergeFieldLocks(locks, collectContactAutofillLocks(contactPersons));
}

export function collectAadhaarAutofillLocks(
  autofill: Pick<AadhaarValidationAutofill, 'aadhaarNumber' | 'addressState'>,
  address: VendorAddress,
): Set<VendorFieldLockKey> {
  const locks = new Set<VendorFieldLockKey>();
  if (autofill.aadhaarNumber) locks.add('aadhar_number');
  if (autofill.addressState?.trim() && address.state?.trim()) {
    locks.add('address.state');
  }
  return locks;
}

/** Restore locks when editing a vendor that already has KYC snapshots. */
export function collectLockedFieldsFromSavedVendorKyc(
  kyc: EntityKycVerificationDetails | undefined,
  form: {
    business_name: string;
    business_details: { gst_number?: string; pan_number?: string };
    aadhar_number?: string | null;
    address: VendorAddress;
    contact_persons: ContactPerson[];
  },
): Set<VendorFieldLockKey> {
  const locks = new Set<VendorFieldLockKey>();
  if (!kyc) return locks;

  const hasGst = Boolean(kyc.gst_advanced || kyc.gst);
  const hasPan = Boolean(kyc.pan_comprehensive || kyc.pan_contact || kyc.pan || kyc.gstin_by_pan);
  const hasAadhaar = Boolean(kyc.aadhaar);

  if (hasGst) {
    if (form.business_details.gst_number) locks.add('gst_number');
    if (form.business_details.pan_number) locks.add('pan_number');
    lockAddressFields(locks, form.address);
    collectContactAutofillLocks(form.contact_persons).forEach((key) => locks.add(key));
    collectVerifiedEmailFieldLocks(form.contact_persons, kyc).forEach((key) => locks.add(key));
  } else if (hasPan) {
    if (form.business_details.pan_number) locks.add('pan_number');
    lockAddressFields(locks, form.address);
    collectContactAutofillLocks(form.contact_persons).forEach((key) => locks.add(key));
    collectVerifiedEmailFieldLocks(form.contact_persons, kyc).forEach((key) => locks.add(key));
  }

  if (hasAadhaar) {
    if (form.aadhar_number) locks.add('aadhar_number');
    if (form.address.state?.trim()) locks.add('address.state');
  }

  return locks;
}

export function collectVendorBankFieldLocks(
  bankDetails: VendorBankDetails | undefined,
  kyc: EntityKycVerificationDetails | undefined,
  options?: { ifscLookupOnly?: boolean; bankDetailsVerifiedAt?: string | null },
): Set<VendorFieldLockKey> {
  const locks = new Set<VendorFieldLockKey>();
  if (!bankDetails) return locks;

  /** Server marked bank verified — lock credentials. Snapshot alone does not count. */
  const bankVerified = Boolean(options?.bankDetailsVerifiedAt);

  if (bankVerified || options?.ifscLookupOnly) {
    if (bankDetails.bank_name?.trim()) locks.add('bank_name');
    if (bankDetails.branch?.trim()) locks.add('branch');
  }

  if (bankVerified && !options?.ifscLookupOnly) {
    if (bankDetails.account_holder_name?.trim()) locks.add('account_holder_name');
    if (bankDetails.account_number?.trim()) locks.add('account_number');
    if (bankDetails.ifsc_code?.trim()) locks.add('ifsc_code');
  }

  return locks;
}
