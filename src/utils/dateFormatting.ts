/** Strict ISO calendar date: YYYY-MM-DD */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize user/API date strings to YYYY-MM-DD for backend contracts (Surepass, etc.).
 * Handles ISO datetimes, DD/MM/YYYY, and DD-MM-YYYY.
 */
export function normalizeIsoDateInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (ISO_DATE_REGEX.test(trimmed)) return trimmed;

  const datePrefix = trimmed.slice(0, 10);
  if (ISO_DATE_REGEX.test(datePrefix)) return datePrefix;

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const dashMatch = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(trimmed);
  if (dashMatch) {
    const [, dd, mm, yyyy] = dashMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  const compactMatch = /^(\d{2})(\d{2})(\d{4})$/.exec(digitsOnly);
  if (compactMatch) {
    const [, dd, mm, yyyy] = compactMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  return trimmed;
}

export function isValidIsoDateString(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  return toIsoDateString(parsed) === value;
}

/** YYYY-MM-DD from a Date (local calendar day via noon anchor). */
export function toIsoDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getIsoDateValidationError(value: string, required = false): string | null {
  const normalized = normalizeIsoDateInput(value);
  if (!normalized) {
    return required ? 'Date is required' : null;
  }
  if (!isValidIsoDateString(normalized)) {
    return 'Date must be in YYYY-MM-DD format (e.g. 1998-08-06)';
  }
  return null;
}

export const ISO_DATE_FORMAT_HINT = 'YYYY-MM-DD (e.g. 1998-08-06)';

export const INDIAN_DATE_FORMAT_HINT = 'DD/MM/YYYY (e.g. 06/08/1998)';

/** Display length for DD/MM/YYYY with slashes. */
export const INDIAN_DATE_INPUT_MAX_LENGTH = 10;

/** Strip non-digits and cap at 8 (DDMMYYYY). */
export function sanitizeIndianDateDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

/** Format typed digits as DD/MM/YYYY (e.g. 06081998 → 06/08/1998). */
export function formatIndianDateInput(value: string): string {
  const digits = sanitizeIndianDateDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Display an ISO or API date string as DD/MM/YYYY. */
export function formatIsoDateAsDdMmYyyy(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const normalized = normalizeIsoDateInput(value);
  if (!normalized || !ISO_DATE_REGEX.test(normalized)) return value.trim();
  const [yyyy, mm, dd] = normalized.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export function getIndianDateValidationError(
  value: string,
  required = false,
  options?: { maxIso?: string },
): string | null {
  const normalized = normalizeIsoDateInput(value);
  if (!normalized) {
    return required ? 'Date is required' : null;
  }
  if (!isValidIsoDateString(normalized)) {
    return `Date must be in DD/MM/YYYY format (e.g. 06/08/1998)`;
  }
  if (options?.maxIso && normalized > options.maxIso) {
    return 'Date cannot be in the future';
  }
  return null;
}
