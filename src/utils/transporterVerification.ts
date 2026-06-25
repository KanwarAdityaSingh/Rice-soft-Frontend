import type { EntityKycVerificationDetails } from '../types/entities';
import {
  TRANSPORTER_CREATE_LENIENT_BANK_MESSAGE,
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
): { alertType: 'success' | 'warning'; alertTitle: string; alertMessage: string } {
  const lenientMsg = isEdit
    ? TRANSPORTER_UPDATE_LENIENT_BANK_MESSAGE
    : TRANSPORTER_CREATE_LENIENT_BANK_MESSAGE;
  const isLenientBank =
    message.trim() === lenientMsg.trim() || /bank could not be verified/i.test(message);
  if (isLenientBank) {
    const main = message || lenientMsg;
    const detail = verification_error?.trim();
    return {
      alertType: 'warning',
      alertTitle: isEdit ? 'Transporter Updated' : 'Transporter Created',
      alertMessage: detail ? `${main}\n\n${detail}` : main,
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
