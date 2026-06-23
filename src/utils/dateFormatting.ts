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
