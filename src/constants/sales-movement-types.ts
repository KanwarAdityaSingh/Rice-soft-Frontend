/**
 * Sales sauda movement types — keep in sync with backend migration 181.
 * List API defaults to `sale`; use `all` or `godown_transfer` to filter.
 */
export const SALES_MOVEMENT_TYPES = ['sale', 'godown_transfer'] as const;

export type SalesMovementType = (typeof SALES_MOVEMENT_TYPES)[number];

/** List query: sale (default) | godown_transfer | all */
export type SalesMovementTypeFilter = SalesMovementType | 'all';

export const SALES_MOVEMENT_TYPE_OPTIONS: Array<{ value: SalesMovementType; label: string }> = [
  { value: 'sale', label: 'Sale' },
  { value: 'godown_transfer', label: 'Godown transfer' },
];

export const SALES_MOVEMENT_TYPE_FILTER_OPTIONS: Array<{
  value: SalesMovementTypeFilter;
  label: string;
}> = [
  { value: 'sale', label: 'Sale' },
  { value: 'godown_transfer', label: 'Godown transfer' },
  { value: 'all', label: 'All' },
];

export function isSalesMovementType(value: string | null | undefined): value is SalesMovementType {
  return !!value && (SALES_MOVEMENT_TYPES as readonly string[]).includes(value);
}

export function isGodownTransfer(
  value: Pick<{ movement_type?: string | null }, 'movement_type'> | string | null | undefined,
): boolean {
  if (typeof value === 'string' || value == null) {
    return value === 'godown_transfer';
  }
  return value.movement_type === 'godown_transfer';
}
