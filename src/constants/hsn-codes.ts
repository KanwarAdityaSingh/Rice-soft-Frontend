/**
 * HSN codes allowed on products.
 * Keep in sync with backend `src/constants/hsn-codes.ts` — the UI loads
 * options from GET /products/hsn-codes, which reads that source of truth.
 */
export const HSN_CODES = ['1006'] as const;

export type HsnCode = (typeof HSN_CODES)[number];

export const HSN_CODE_OPTIONS: Array<{ value: HsnCode; label: string }> = HSN_CODES.map(
  (code) => ({ value: code, label: code }),
);

export function isValidHsnCode(value: string | null | undefined): value is HsnCode {
  return !!value && (HSN_CODES as readonly string[]).includes(value);
}
