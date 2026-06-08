/** Coerce API values that may arrive as string/number into a finite number. */
export function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value == null || value === '') return fallback;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

export function formatKg(value: unknown, decimals = 2): string {
  return `${coerceNumber(value).toFixed(decimals)} kg`;
}
