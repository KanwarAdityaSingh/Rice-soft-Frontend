import type { RiceCategory, RiceType } from '../types/entities';

export function getRiceCategoryLabel(
  value: string | null | undefined,
  categories: RiceType[],
): string {
  if (!value) return '';
  const row = categories.find((c) => c.value === value);
  return row?.label ?? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatRiceCategoryFallback(value: RiceCategory): string {
  return value === 'basmati' ? 'Basmati' : 'Non Basmati';
}
