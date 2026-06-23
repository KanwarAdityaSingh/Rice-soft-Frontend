export const PHONE_DIGIT_LENGTH = 10;
/** Display length with grouping space: "XXXXX XXXXX" */
export const PHONE_FORMATTED_MAX_LENGTH = 11;
export const PHONE_PLACEHOLDER = '98765 43210';
export const PHONE_FORMAT_HINT = '10-digit Indian mobile (e.g. 98765 43210)';

/** Strip non-digits; remove leading +91 / 0; cap at 10 digits. */
export function sanitizePhoneInput(value: string): string {
  let digits = value.replace(/\D/g, '');

  if (digits.length >= 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, PHONE_DIGIT_LENGTH);
}

/** Format 10-digit mobile as "XXXXX XXXXX" for display. */
export function formatPhoneDisplay(value: string | null | undefined): string {
  const digits = sanitizePhoneInput(value ?? '');
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function validatePhone(phone: string): boolean {
  return sanitizePhoneInput(phone).length === PHONE_DIGIT_LENGTH;
}

export function getPhoneValidationError(phone: string): string | null {
  const digits = sanitizePhoneInput(phone);
  if (!digits) return null;

  if (digits.length !== PHONE_DIGIT_LENGTH) {
    return `Phone must be ${PHONE_DIGIT_LENGTH} digits (e.g. ${PHONE_PLACEHOLDER}).`;
  }

  return null;
}

/** Normalize phone arrays before API save. */
export function sanitizePhoneList(phones: string[]): string[] {
  return phones.map((phone) => sanitizePhoneInput(phone)).filter(Boolean);
}

/** Format multiple phones for read-only display (e.g. tables, previews). */
export function formatPhonesForDisplay(phones: (string | null | undefined)[] | null | undefined): string {
  if (!phones?.length) return '';
  return phones
    .map((phone) => formatPhoneDisplay(phone))
    .filter(Boolean)
    .join(', ');
}
