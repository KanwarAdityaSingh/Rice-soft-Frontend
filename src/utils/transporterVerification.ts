import type { EntityKycVerificationDetails } from '../types/entities';
import {
  TRANSPORTER_CREATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE,
  TRANSPORTER_CREATE_LENIENT_BANK_MESSAGE,
  TRANSPORTER_UPDATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE,
  TRANSPORTER_UPDATE_LENIENT_BANK_MESSAGE,
} from '../services/transporters.api';

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

export function getTransporterSaveAlert(
  isEdit: boolean,
  message: string,
  verification_error?: string,
  verification_message?: string,
  options?: {
    bankVerificationFlagged?: boolean;
    transporterBankVerificationError?: string | null;
  },
): { alertType: 'success' | 'warning'; alertTitle: string; alertMessage: string } {
  const lenientMessages = isEdit
    ? [TRANSPORTER_UPDATE_LENIENT_BANK_MESSAGE, TRANSPORTER_UPDATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE]
    : [TRANSPORTER_CREATE_LENIENT_BANK_MESSAGE, TRANSPORTER_CREATE_LENIENT_BANK_HOLDER_MISMATCH_MESSAGE];
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
      options?.transporterBankVerificationError?.trim() ||
      '';
    const parts = [main, detail].filter(Boolean);
    return {
      alertType: 'warning',
      alertTitle: isEdit ? 'Transporter Updated' : 'Transporter Created',
      alertMessage: parts.join('\n\n'),
    };
  }
  const defaultSuccess = isEdit
    ? 'Transporter updated successfully.'
    : 'Transporter created successfully.';
  const baseMsg = message?.trim() || defaultSuccess;
  const bankLine = verification_message?.trim() || '';
  return {
    alertType: 'success',
    alertTitle: isEdit ? 'Transporter Updated' : 'Transporter Created',
    alertMessage: bankLine ? `${baseMsg}\n\n${bankLine}` : baseMsg,
  };
}
