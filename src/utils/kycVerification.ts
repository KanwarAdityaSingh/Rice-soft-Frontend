import type {
  AadhaarValidationResult,
  BankVerificationResult,
  EntityKycVerificationDetails,
  GSTLookupResponseData,
  KycPersistContext,
  PANLookupResponseData,
  RcFullLookupResult,
  SurepassVerificationSnapshot,
  VehicleVerificationDetails,
} from '../types/entities';
import { extractRcFullData } from './rcFullMapping';

export const KYC_VERIFICATION_LABELS: Record<string, string> = {
  pan: 'PAN',
  pan_comprehensive: 'PAN (Comprehensive)',
  gstin_by_pan: 'GSTIN by PAN',
  pan_contact: 'PAN contact',
  gst: 'GST',
  gst_advanced: 'GST (Advanced)',
  aadhaar: 'Aadhaar',
  bank: 'Bank account',
  email: 'Email',
  driving_license: 'Driving licence',
  rc: 'RC verification',
  rc_full: 'RC (Full)',
  rc_challan: 'RC challan details',
};

export interface KycVerificationEntry {
  key: string;
  label: string;
  verified_at: string;
  snapshot: SurepassVerificationSnapshot;
}

export function vendorPersist(vendorId?: string | null): KycPersistContext | undefined {
  return vendorId ? { entity_type: 'vendor', entity_id: vendorId } : undefined;
}

export function salesPartyPersist(salesPartyId?: string | null): KycPersistContext | undefined {
  return salesPartyId ? { entity_type: 'sales_party', entity_id: salesPartyId } : undefined;
}

export function brokerPersist(brokerId?: string | null): KycPersistContext | undefined {
  return brokerId ? { entity_type: 'broker', entity_id: brokerId } : undefined;
}

export function transporterPersist(transporterId?: string | null): KycPersistContext | undefined {
  return transporterId ? { entity_type: 'transporter', entity_id: transporterId } : undefined;
}

export function vehiclePersist(vehicleId?: string | null): KycPersistContext | undefined {
  return vehicleId ? { entity_type: 'vehicle', entity_id: vehicleId } : undefined;
}

export function driverPersist(driverId?: string | null): KycPersistContext | undefined {
  return driverId ? { entity_type: 'driver', entity_id: driverId } : undefined;
}

export function buildSurepassSnapshot(
  raw: unknown,
  mapped?: unknown,
  verifiedAt?: string,
): SurepassVerificationSnapshot {
  return {
    provider: 'surepass',
    verified_at: verifiedAt ?? new Date().toISOString(),
    raw: raw as SurepassVerificationSnapshot['raw'],
    ...(mapped !== undefined ? { mapped } : {}),
  };
}

/** Store Surepass GST advanced snapshot from a successful lookup (session + save payload). */
export function persistGstLookupSnapshot(
  existing: EntityKycVerificationDetails | undefined,
  response: GSTLookupResponseData,
): EntityKycVerificationDetails {
  if (!response.surepass_response) return existing ?? {};
  return mergeEntityKycSnapshot(
    existing,
    'gst_advanced',
    buildSurepassSnapshot(response.surepass_response, response.gst_data),
  );
}

/** Store Surepass PAN comprehensive snapshot from a successful lookup (session + save payload). */
export function persistPanLookupSnapshot(
  existing: EntityKycVerificationDetails | undefined,
  response: PANLookupResponseData,
): EntityKycVerificationDetails {
  if (!response.surepass_response) return existing ?? {};
  return mergeEntityKycSnapshot(
    existing,
    'pan_comprehensive',
    buildSurepassSnapshot(response.surepass_response, response.pan_data),
  );
}

/** Store Surepass Aadhaar validation snapshot from a successful lookup. */
export function persistAadhaarValidationSnapshot(
  existing: EntityKycVerificationDetails | undefined,
  response: AadhaarValidationResult & { surepass_response?: unknown },
): EntityKycVerificationDetails {
  if (!response.surepass_response) return existing ?? {};
  const { surepass_response, ...mapped } = response;
  return mergeEntityKycSnapshot(
    existing,
    'aadhaar',
    buildSurepassSnapshot(surepass_response, mapped),
  );
}

/** Store Surepass bank verification snapshot from a successful lookup. */
export function persistBankVerificationSnapshot(
  existing: EntityKycVerificationDetails | undefined,
  result: BankVerificationResult & { surepass_response?: unknown },
): EntityKycVerificationDetails {
  if (!result.surepass_response) return existing ?? {};
  const { surepass_response, ...mapped } = result;
  return mergeEntityKycSnapshot(
    existing,
    'bank',
    buildSurepassSnapshot(surepass_response, mapped),
  );
}

export function isEmailVerifiedInKyc(
  details: EntityKycVerificationDetails | undefined,
  email: string,
): boolean {
  const normalized = email.trim().toLowerCase();
  return Boolean(details?.emails?.[normalized]?.verified_at);
}

export function mergeEntityKycSnapshot(
  existing: EntityKycVerificationDetails | undefined,
  key: keyof EntityKycVerificationDetails,
  snapshot: SurepassVerificationSnapshot,
  email?: string,
): EntityKycVerificationDetails {
  if (key === 'emails' && email) {
    const normalized = email.trim().toLowerCase();
    return {
      ...existing,
      emails: {
        ...(existing?.emails ?? {}),
        [normalized]: snapshot,
      },
    };
  }
  return {
    ...existing,
    [key]: snapshot,
  };
}

export function collectEntityKycEntries(
  details?: EntityKycVerificationDetails | null,
): KycVerificationEntry[] {
  if (!details) return [];

  const entries: KycVerificationEntry[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (key === 'emails' && value && typeof value === 'object') {
      for (const [email, snapshot] of Object.entries(value as Record<string, SurepassVerificationSnapshot>)) {
        if (!snapshot?.verified_at) continue;
        entries.push({
          key: `email:${email}`,
          label: `${KYC_VERIFICATION_LABELS.email} (${email})`,
          verified_at: snapshot.verified_at,
          snapshot,
        });
      }
      continue;
    }
    const snapshot = value as SurepassVerificationSnapshot | undefined;
    if (!snapshot?.verified_at) continue;
    entries.push({
      key,
      label: KYC_VERIFICATION_LABELS[key] ?? key,
      verified_at: snapshot.verified_at,
      snapshot,
    });
  }
  return entries.sort(
    (a, b) => new Date(b.verified_at).getTime() - new Date(a.verified_at).getTime(),
  );
}

export function collectVehicleKycEntries(
  details?: VehicleVerificationDetails | null,
): KycVerificationEntry[] {
  if (!details) return [];
  const entries: KycVerificationEntry[] = [];
  for (const key of ['rc_full', 'rc', 'rc_challan'] as const) {
    const snapshot = details[key];
    if (!snapshot?.verified_at) continue;
    entries.push({
      key,
      label: KYC_VERIFICATION_LABELS[key] ?? key,
      verified_at: snapshot.verified_at,
      snapshot,
    });
  }
  return entries.sort(
    (a, b) => new Date(b.verified_at).getTime() - new Date(a.verified_at).getTime(),
  );
}

export function collectDriverKycEntries(
  details?: SurepassVerificationSnapshot | Record<string, unknown> | null,
): KycVerificationEntry[] {
  if (!details || typeof details !== 'object') return [];
  const snapshot = details as SurepassVerificationSnapshot;
  if (!snapshot.verified_at || snapshot.provider !== 'surepass') return [];
  return [
    {
      key: 'driving_license',
      label: KYC_VERIFICATION_LABELS.driving_license,
      verified_at: snapshot.verified_at,
      snapshot,
    },
  ];
}

export function formatKycVerifiedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-IN');
}

/** Store Surepass RC full snapshot from a successful lookup. */
export function persistRcFullSnapshot(
  existing: VehicleVerificationDetails | undefined,
  result: RcFullLookupResult,
): VehicleVerificationDetails {
  if (!result.surepass_response) return existing ?? {};
  const rcData = extractRcFullData(result);
  return {
    ...existing,
    rc_full: buildSurepassSnapshot(result.surepass_response, rcData ?? result.data),
  };
}

function hasVehicleKycSnapshots(details?: VehicleVerificationDetails | null): boolean {
  return collectVehicleKycEntries(details).length > 0;
}

/** Attach vehicle verification snapshots to create/update payloads. */
export function buildVehicleSavePayload<
  T extends { verification_details?: VehicleVerificationDetails },
>(base: T, verificationDetails: VehicleVerificationDetails): T {
  const payload: T = { ...base };
  if (hasVehicleKycSnapshots(verificationDetails)) {
    payload.verification_details = verificationDetails;
  }
  return payload;
}

/** Minimal bank fields required for backend `verify_bank`. */
export interface BankVerifyInput {
  account_number?: string | null;
  ifsc_code?: string | null;
  account_holder_name?: string | null;
}

/** True when bank fields are complete enough for backend verify_bank. */
export function shouldVerifyBankFields(bd: BankVerifyInput | undefined | null): boolean {
  if (!bd) return false;
  const accountNumber = bd.account_number?.trim();
  const ifsc = bd.ifsc_code?.trim().toUpperCase();
  const holder = bd.account_holder_name?.trim();
  return Boolean(accountNumber && holder && ifsc && ifsc.length === 11);
}

function hasKycSnapshots(details?: EntityKycVerificationDetails | null): boolean {
  return collectEntityKycEntries(details).length > 0;
}

/**
 * Attach session KYC snapshots to create/update payloads.
 * With verify_bank, the backend compares bank_details to kyc_verification_details.bank
 * (from a prior GET /kyc/bank/verify) — it does not call Surepass on create.
 */
export function buildEntitySavePayload<
  T extends {
    verify_bank?: boolean;
    kyc_verification_details?: EntityKycVerificationDetails;
    bank_details?: BankVerifyInput | null;
    is_active?: boolean;
  },
>(
  base: T,
  options: {
    kycVerificationDetails: EntityKycVerificationDetails;
    /** Server-side bank verification timestamp — skip verify_bank when already persisted. */
    bankDetailsVerifiedAt?: string | null;
    /** When true (KYC identity verified), save as active. */
    identityVerified?: boolean;
  },
): T {
  const { kycVerificationDetails, bankDetailsVerifiedAt, identityVerified } = options;
  const payload: T = { ...base };

  if (identityVerified) {
    payload.is_active = true;
  }

  if (hasKycSnapshots(kycVerificationDetails)) {
    payload.kyc_verification_details = kycVerificationDetails;
  }

  const bankReady = shouldVerifyBankFields(payload.bank_details);
  const hasBankSnapshot = Boolean(kycVerificationDetails.bank?.verified_at);
  /** Only the persisted entity timestamp skips verify_bank; session snapshots still need save. */
  const alreadyVerifiedOnServer = Boolean(bankDetailsVerifiedAt);

  if (bankReady) {
    if (alreadyVerifiedOnServer) {
      delete payload.verify_bank;
    } else if (hasBankSnapshot) {
      payload.verify_bank = true;
    } else {
      delete payload.verify_bank;
    }
  } else {
    delete payload.verify_bank;
  }

  return payload;
}

/** Remove stored bank snapshot when account/IFSC changes after verification. */
export function clearBankKycSnapshot(
  details: EntityKycVerificationDetails,
): EntityKycVerificationDetails {
  if (!details.bank) return details;
  const next = { ...details };
  delete next.bank;
  return next;
}

/** Server timestamp on the entity, or session bank snapshot time for UI. */
export function resolveEntityBankVerifiedAt(
  bankDetailsVerifiedAt?: string | null,
  kyc?: EntityKycVerificationDetails | null,
): string | null {
  const server = bankDetailsVerifiedAt?.trim();
  if (server) return server;
  const session = kyc?.bank?.verified_at?.trim();
  return session || null;
}

export function isEntityBankVerified(
  bankDetailsVerifiedAt?: string | null,
  kyc?: EntityKycVerificationDetails | null,
  bankVerifiedInSession?: boolean,
): boolean {
  return Boolean(resolveEntityBankVerifiedAt(bankDetailsVerifiedAt, kyc) || bankVerifiedInSession);
}
