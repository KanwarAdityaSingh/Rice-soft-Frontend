/**
 * Indian financial year: 1 Apr – 31 Mar.
 * - Short UI key: "2025-26" (purchase filters)
 * - API / storage label (payment advice, sales docs): "2025-2026"
 */

export function parseIsoDate(dateStr: string): Date | null {
  if (!dateStr?.trim()) return null;
  const d = new Date(`${dateStr.trim()}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getFinancialYearKey(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 3) {
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
  }
  return `${year - 1}-${String(year % 100).padStart(2, '0')}`;
}

/** API / storage format e.g. "2025-2026" (same as payment advice). */
export function getFinancialYearApiValue(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 3) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

export function getFinancialYearApiValueFromIsoDate(
  dateStr: string | null | undefined,
): string | null {
  const d = dateStr ? parseIsoDate(dateStr) : null;
  return d ? getFinancialYearApiValue(d) : null;
}

export function getCurrentFinancialYearApiValue(referenceDate = new Date()): string {
  return getFinancialYearApiValue(referenceDate);
}

/** Normalize short or long FY strings to API form "YYYY-YYYY". */
export function toFinancialYearApiValue(value: string | null | undefined): string | null {
  const short = normalizeFinancialYearKey(value);
  if (!short) return null;
  const start = parseInt(short.slice(0, 4), 10);
  if (Number.isNaN(start)) return null;
  return `${start}-${start + 1}`;
}

export function formatFinancialYearApiLabel(value: string): string {
  return `FY ${toFinancialYearApiValue(value) ?? value}`;
}

function shiftFinancialYearApiValue(apiValue: string, deltaYears: number): string | null {
  const normalized = toFinancialYearApiValue(apiValue);
  if (!normalized) return null;
  const start = parseInt(normalized.slice(0, 4), 10) + deltaYears;
  if (Number.isNaN(start)) return null;
  return `${start}-${start + 1}`;
}

/**
 * Filter options using API FY values (`2025-2026`).
 * Always includes the current FY and `previousYears` prior years so users can switch
 * even when the current result set is empty for those years.
 */
export function buildFinancialYearApiFilterOptions(
  apiYearValues: Array<string | null | undefined> = [],
  referenceDate = new Date(),
  previousYears = 2,
): { label: string; value: string }[] {
  const keys = new Set<string>();
  let cursor = getCurrentFinancialYearApiValue(referenceDate);
  keys.add(cursor);
  for (let i = 0; i < previousYears; i++) {
    const prev = shiftFinancialYearApiValue(cursor, -1);
    if (!prev) break;
    keys.add(prev);
    cursor = prev;
  }
  for (const v of apiYearValues) {
    const api = toFinancialYearApiValue(v);
    if (api) keys.add(api);
  }
  return [...keys]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: formatFinancialYearApiLabel(value) }));
}

export function getFinancialYearKeyFromIsoDate(dateStr: string | null | undefined): string | null {
  const d = dateStr ? parseIsoDate(dateStr) : null;
  return d ? getFinancialYearKey(d) : null;
}

export function formatFinancialYearLabel(key: string): string {
  return `FY ${key}`;
}

export function isIsoDateInFinancialYear(
  dateStr: string | null | undefined,
  fyKey: string,
): boolean {
  return getFinancialYearKeyFromIsoDate(dateStr) === fyKey;
}

export function getCurrentFinancialYearKey(referenceDate = new Date()): string {
  return getFinancialYearKey(referenceDate);
}

export function buildFinancialYearFilterOptions(
  saudas: Array<{ sauda_date?: string | null }>,
  referenceDate = new Date(),
): { label: string; value: string }[] {
  return buildFinancialYearFilterOptionsFromDates(
    saudas.map((s) => s.sauda_date),
    referenceDate,
  );
}

export function buildFinancialYearFilterOptionsFromDates(
  dateStrings: Array<string | null | undefined>,
  referenceDate = new Date(),
): { label: string; value: string }[] {
  const keys = new Set<string>();
  keys.add(getCurrentFinancialYearKey(referenceDate));
  for (const dateStr of dateStrings) {
    const key = getFinancialYearKeyFromIsoDate(dateStr);
    if (key) keys.add(key);
  }
  return [...keys]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: formatFinancialYearLabel(value) }));
}

/** Normalize API values like "2025-2026" to filter key "2025-26". */
export function normalizeFinancialYearKey(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const longMatch = /^(\d{4})-(\d{4})$/.exec(trimmed);
  if (longMatch) {
    const start = parseInt(longMatch[1], 10);
    const end = parseInt(longMatch[2], 10);
    if (end === start + 1) {
      return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
    }
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

export function resolvePaymentAdviceFinancialYearKey(
  pa: {
    financial_year?: string | null;
    sauda_id?: string | null;
    inward_slip_pass_id?: string | null;
    date_of_payment?: string;
  },
  saudaDateById: ReadonlyMap<string, string | null | undefined>,
  ispDateById: ReadonlyMap<string, string | null | undefined>,
): string | null {
  const fromField = normalizeFinancialYearKey(pa.financial_year);
  if (fromField) return fromField;
  if (pa.sauda_id) {
    return getFinancialYearKeyFromIsoDate(saudaDateById.get(pa.sauda_id));
  }
  if (pa.inward_slip_pass_id) {
    return getFinancialYearKeyFromIsoDate(ispDateById.get(pa.inward_slip_pass_id));
  }
  return getFinancialYearKeyFromIsoDate(pa.date_of_payment);
}
