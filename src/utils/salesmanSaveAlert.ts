import {
  SALESMAN_CREATE_LENIENT_BANK_MESSAGE,
  SALESMAN_UPDATE_LENIENT_BANK_MESSAGE,
} from '../services/salesmen.api';

export function getSalesmanSaveAlert(
  isEdit: boolean,
  message: string,
  verification_error?: string,
  verification_message?: string,
): { alertType: 'success' | 'warning'; alertTitle: string; alertMessage: string } {
  const lenientMessages = isEdit
    ? [SALESMAN_UPDATE_LENIENT_BANK_MESSAGE]
    : [SALESMAN_CREATE_LENIENT_BANK_MESSAGE];
  const trimmedMessage = message.trim();
  const isLenientBank =
    Boolean(verification_error?.trim()) ||
    lenientMessages.some((m) => trimmedMessage === m.trim()) ||
    /bank could not be verified|account holder name does not match/i.test(trimmedMessage);

  if (isLenientBank) {
    const main = trimmedMessage || lenientMessages[0];
    const detail = verification_error?.trim() || '';
    return {
      alertType: 'warning',
      alertTitle: isEdit ? 'Salesperson Updated' : 'Salesperson Created',
      alertMessage: [main, detail].filter(Boolean).join('\n\n'),
    };
  }

  const defaultSuccess = isEdit
    ? 'The salesperson has been updated successfully.'
    : 'The salesperson has been created successfully.';
  const baseMsg = trimmedMessage || defaultSuccess;
  const bankLine = verification_message?.trim() || '';

  return {
    alertType: 'success',
    alertTitle: isEdit ? 'Salesperson Updated Successfully' : 'Salesperson Created Successfully',
    alertMessage: bankLine ? `${baseMsg}\n\n${bankLine}` : baseMsg,
  };
}
