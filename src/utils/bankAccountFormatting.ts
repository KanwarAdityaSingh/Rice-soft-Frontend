/** Indian bank account numbers are typically 9–18 digits. */
export const BANK_ACCOUNT_MIN_LENGTH = 9;
export const BANK_ACCOUNT_MAX_LENGTH = 18;
export const BANK_ACCOUNT_PLACEHOLDER = '1234 5678 9012';

/** Store digits only (max 18). */
export function sanitizeBankAccountInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, BANK_ACCOUNT_MAX_LENGTH);
}

/** Display as groups of four digits: "1234 5678 9012". */
export function formatBankAccountDisplay(value: string | null | undefined): string {
  const digits = sanitizeBankAccountInput(value ?? '');
  if (!digits) return '';
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function getBankAccountValidationError(accountNumber: string | null | undefined): string | null {
  const digits = sanitizeBankAccountInput(accountNumber ?? '');
  if (!digits) return null;
  if (digits.length < BANK_ACCOUNT_MIN_LENGTH) {
    return `Account number must be at least ${BANK_ACCOUNT_MIN_LENGTH} digits.`;
  }
  return null;
}
