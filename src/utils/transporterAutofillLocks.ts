import type {
  ContactPerson,
  CreateTransporterRequest,
  EntityKycVerificationDetails,
  VendorAddress,
} from '../types/entities';
import { isEmailVerifiedInKyc } from './kycVerification';
import type { AadhaarValidationAutofill } from './aadhaarValidationAutofill';
import type { TransporterKycAutofill } from './transporterKycAutofill';

export type TransporterFieldLockKey = string;

function lockAddressFields(locks: Set<TransporterFieldLockKey>, address: VendorAddress | undefined) {
  if (!address) return;
  if (address.street?.trim()) locks.add('address.street');
  if (address.city?.trim()) locks.add('address.city');
  if (address.state?.trim()) locks.add('address.state');
  if (address.pincode?.trim()) locks.add('address.pincode');
  if (address.country?.trim()) locks.add('address.country');
}

function lockContactPhones(locks: Set<TransporterFieldLockKey>, contactPersons: ContactPerson[] | undefined) {
  (contactPersons ?? []).forEach((cp, personIdx) => {
    (cp.phones ?? []).forEach((phone, phoneIdx) => {
      if (phone?.trim()) locks.add(`contact_person_${personIdx}_phone_${phoneIdx}`);
    });
  });
}

/** Lock email inputs that were successfully verified via /kyc/email/verify. */
export function collectVerifiedEmailFieldLocks(
  contactPersons: ContactPerson[],
  kyc: EntityKycVerificationDetails | undefined,
): Set<TransporterFieldLockKey> {
  const locks = new Set<TransporterFieldLockKey>();
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
): Set<TransporterFieldLockKey> {
  const locks = new Set<TransporterFieldLockKey>();
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

/** Fields filled from GST / PAN autofill in the current session. */
export function collectTransporterAutofillLocks(
  autofill: Pick<
    TransporterKycAutofill,
    | 'businessName'
    | 'panNumber'
    | 'gstNumber'
    | 'address'
    | 'contactNames'
    | 'phones'
    | 'emails'
    | 'fillBusinessName'
    | 'fillAddress'
  >,
  contactPersons: ContactPerson[],
): Set<TransporterFieldLockKey> {
  const locks = new Set<TransporterFieldLockKey>();

  if (autofill.gstNumber) locks.add('gst_number');
  if (autofill.panNumber) locks.add('pan_number');
  if (autofill.fillAddress) {
    lockAddressFields(locks, autofill.address as VendorAddress);
  }

  if (autofill.phones.length > 0 && contactPersons[0]) {
    autofill.phones.forEach((phone, phoneIdx) => {
      const value = contactPersons[0].phones?.[phoneIdx]?.trim();
      if (phone?.trim() && value) {
        locks.add(`contact_person_0_phone_${phoneIdx}`);
      }
    });
  }

  return locks;
}

export function collectAadhaarAutofillLocks(
  autofill: Pick<AadhaarValidationAutofill, 'aadhaarNumber' | 'addressState'>,
  address: VendorAddress,
): Set<TransporterFieldLockKey> {
  const locks = new Set<TransporterFieldLockKey>();
  if (autofill.aadhaarNumber) locks.add('aadhar_number');
  if (autofill.addressState?.trim() && address.state?.trim()) {
    locks.add('address.state');
  }
  return locks;
}

/** Restore locks when editing a transporter that already has KYC snapshots. */
export function collectLockedFieldsFromSavedKyc(
  kyc: EntityKycVerificationDetails | undefined,
  form: Pick<
    CreateTransporterRequest,
    'business_name' | 'gst_number' | 'pan_number' | 'aadhar_number' | 'address' | 'contact_persons'
  >,
): Set<TransporterFieldLockKey> {
  const locks = new Set<TransporterFieldLockKey>();
  if (!kyc) return locks;

  const hasGst = Boolean(kyc.gst_advanced || kyc.gst);
  const hasPan = Boolean(kyc.pan_comprehensive || kyc.pan_contact || kyc.pan || kyc.gstin_by_pan);
  const hasAadhaar = Boolean(kyc.aadhaar);

  if (hasGst) {
    if (form.gst_number) locks.add('gst_number');
    if (form.pan_number) locks.add('pan_number');
    lockAddressFields(locks, form.address);
    lockContactPhones(locks, form.contact_persons);
    collectVerifiedEmailFieldLocks(form.contact_persons ?? [], kyc).forEach((key) => locks.add(key));
  } else if (hasPan) {
    if (form.pan_number) locks.add('pan_number');
    lockAddressFields(locks, form.address);
    lockContactPhones(locks, form.contact_persons);
    collectVerifiedEmailFieldLocks(form.contact_persons ?? [], kyc).forEach((key) => locks.add(key));
  }

  if (hasAadhaar) {
    if (form.aadhar_number) locks.add('aadhar_number');
    if (form.address.state?.trim()) locks.add('address.state');
  }

  return locks;
}

export function mergeFieldLocks(
  existing: Set<TransporterFieldLockKey>,
  incoming: Set<TransporterFieldLockKey>,
): Set<TransporterFieldLockKey> {
  return new Set([...existing, ...incoming]);
}

export function isTransporterFieldLocked(
  locks: Set<TransporterFieldLockKey>,
  key: TransporterFieldLockKey,
): boolean {
  return locks.has(key);
}

export function contactRowHasLockedField(
  locks: Set<TransporterFieldLockKey>,
  personIdx: number,
): boolean {
  return [...locks].some((key) => key.startsWith(`contact_person_${personIdx}_`));
}

export const TRANSPORTER_LOCKED_INPUT_CLASS =
  'read-only:cursor-not-allowed opacity-80 bg-muted/40 pointer-events-none';
