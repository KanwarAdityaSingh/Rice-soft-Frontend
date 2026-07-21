import type {
  EntityKycVerificationDetails,
  SalesPartyCustomerType,
  SalesPartyRegistrationType,
} from '../types/entities';
import { computeVendorVerifiedFromKyc, formatVendorVerifiedAt } from './vendorVerification';

/** Client-side check aligned with backend identity verification rules (bank excluded). */
export function computeSalesPartyVerifiedFromKyc(
  registrationType: SalesPartyRegistrationType,
  kyc?: EntityKycVerificationDetails | null,
): boolean {
  // Retail parties skip KYC and are treated as verified.
  if (registrationType === 'retail') return true;
  return computeVendorVerifiedFromKyc(registrationType, kyc);
}

export function formatSalesPartyVerifiedAt(date: string | null | undefined): string {
  return formatVendorVerifiedAt(date);
}

export function formatSalesPartyRegistrationLabel(
  registrationType: SalesPartyRegistrationType | string | undefined,
): string {
  if (registrationType === 'retail') return 'Retail';
  if (registrationType === 'unregistered') return 'Unregistered';
  return 'Registered';
}

export function formatSalesPartyCustomerTypeLabel(
  customerType: SalesPartyCustomerType | string | null | undefined,
): string {
  switch (customerType) {
    case 'individual':
      return 'Individual';
    case 'small_retailer':
      return 'Small Retailer Unregistered';
    case 'cash_customer':
      return 'Cash Customer';
    default:
      return '';
  }
}
