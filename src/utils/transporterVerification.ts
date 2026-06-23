import type { EntityKycVerificationDetails } from '../types/entities';

/** Client-side check aligned with backend identity verification rules (bank excluded). */
export function computeTransporterVerifiedFromKyc(
  transportType: 'registered' | 'unregistered',
  kyc?: EntityKycVerificationDetails | null,
): boolean {
  if (!kyc) return false;

  if (transportType === 'registered') {
    return Boolean(kyc.gst_advanced || kyc.gst || kyc.pan_comprehensive || kyc.pan);
  }

  return Boolean(kyc.aadhaar);
}

export function formatTransporterVerifiedAt(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
