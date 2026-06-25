import type { EntityKycVerificationDetails } from '../types/entities';
import {
  VENDOR_CREATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE,
  VENDOR_CREATE_LENIENT_BANK_MESSAGE,
  VENDOR_UPDATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE,
  VENDOR_UPDATE_LENIENT_BANK_MESSAGE,
} from '../services/vendors.api';

/** Client-side check aligned with backend identity verification rules (bank excluded). */
export function computeVendorVerifiedFromKyc(
  registrationType: 'registered' | 'unregistered',
  kyc?: EntityKycVerificationDetails | null,
): boolean {
  if (!kyc) return false;

  if (registrationType === 'registered') {
    return Boolean(kyc.gst_advanced || kyc.gst || kyc.pan_comprehensive || kyc.pan);
  }

  return Boolean(kyc.aadhaar);
}

export function formatVendorVerifiedAt(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getVendorSaveAlert(
  isEdit: boolean,
  message: string,
  verification_error?: string,
  verification_message?: string,
  options?: {
    bankVerificationFlagged?: boolean;
    vendorBankVerificationError?: string | null;
    isActive?: boolean;
  },
): { alertType: 'success' | 'warning'; alertTitle: string; alertMessage: string } {
  const lenientMessages = isEdit
    ? [VENDOR_UPDATE_LENIENT_BANK_MESSAGE, VENDOR_UPDATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE]
    : [VENDOR_CREATE_LENIENT_BANK_MESSAGE, VENDOR_CREATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE];
  const trimmedMessage = message.trim();
  const isLenientBank =
    Boolean(options?.bankVerificationFlagged) ||
    Boolean(verification_error?.trim()) ||
    lenientMessages.some((m) => trimmedMessage === m.trim()) ||
    /bank could not be verified|account holder name does not match/i.test(trimmedMessage);
  if (isLenientBank) {
    const main = trimmedMessage || lenientMessages[0];
    const detail =
      verification_error?.trim() ||
      options?.vendorBankVerificationError?.trim() ||
      '';
    const inactiveNote =
      !isEdit && options?.isActive === false
        ? 'The vendor was saved as inactive until bank details are corrected.'
        : '';
    const parts = [main, detail, inactiveNote].filter(Boolean);
    return {
      alertType: 'warning',
      alertTitle: isEdit ? 'Vendor Updated' : 'Vendor Created',
      alertMessage: parts.join('\n\n'),
    };
  }
  const defaultSuccess = isEdit
    ? 'The vendor has been updated successfully.'
    : 'The vendor has been created successfully.';
  const baseMsg = message?.trim() || defaultSuccess;
  const bankLine = verification_message?.trim() || '';
  return {
    alertType: 'success',
    alertTitle: isEdit ? 'Vendor Updated Successfully' : 'Vendor Created Successfully',
    alertMessage: bankLine ? `${baseMsg}\n\n${bankLine}` : baseMsg,
  };
}
