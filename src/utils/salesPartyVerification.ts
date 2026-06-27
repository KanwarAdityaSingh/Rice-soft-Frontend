import type { EntityKycVerificationDetails } from '../types/entities';
import { computeVendorVerifiedFromKyc, formatVendorVerifiedAt } from './vendorVerification';

/** Client-side check aligned with backend identity verification rules (bank excluded). */
export function computeSalesPartyVerifiedFromKyc(
  registrationType: 'registered' | 'unregistered',
  kyc?: EntityKycVerificationDetails | null,
): boolean {
  return computeVendorVerifiedFromKyc(registrationType, kyc);
}

export function formatSalesPartyVerifiedAt(date: string | null | undefined): string {
  return formatVendorVerifiedAt(date);
}
