import type { EntityKycVerificationDetails, TransporterBankDetails } from '../types/entities';
import { shouldVerifyBankFields } from './kycVerification';

export { mapBankVerifyToBankDetails } from './bankVerification';

export function hasTransporterBankInput(bd?: TransporterBankDetails | null): boolean {
  if (!bd) return false;
  return Boolean(
    bd.account_holder_name?.trim() ||
      bd.account_number?.trim() ||
      bd.ifsc_code?.trim() ||
      bd.bank_name?.trim() ||
      bd.branch?.trim(),
  );
}

/** @deprecated Use shouldVerifyBankFields from kycVerification */
export function canVerifyTransporterBank(bd?: TransporterBankDetails | null): boolean {
  return shouldVerifyBankFields(bd);
}

export function isTransporterBankVerified(
  source?: {
    bank_details_verified_at?: string | null;
    kyc_verification_details?: EntityKycVerificationDetails | null;
  } | null,
  bankVerifiedInSession?: boolean,
): boolean {
  return Boolean(
    source?.bank_details_verified_at ||
      source?.kyc_verification_details?.bank?.verified_at ||
      bankVerifiedInSession,
  );
}
