/**
 * Sales sauda types — keep in sync with backend `src/constants/sales-sauda-types.ts`.
 * UI options load from GET /sales-saudas/types.
 */
export const SALES_SAUDA_TYPES = ['ex', 'for'] as const;

export type SalesSaudaType = (typeof SALES_SAUDA_TYPES)[number];

export const SALES_SAUDA_TYPE_OPTIONS: Array<{ value: SalesSaudaType; label: string }> =
  SALES_SAUDA_TYPES.map((value) => ({
    value,
    label: value === 'ex' ? 'EX' : 'FOR',
  }));

export function isSalesSaudaType(value: string | null | undefined): value is SalesSaudaType {
  return !!value && (SALES_SAUDA_TYPES as readonly string[]).includes(value);
}
