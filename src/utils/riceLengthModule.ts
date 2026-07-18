import type { RiceLengthRecord, RiceType, Sauda } from '../types/entities';
import { isUnsetRiceLengthKey } from './saudaRiceHierarchy';

/** Label lookup options for legacy `rice_length` codes and new `rice_length_id` values. */
export function toRiceLengthLabelOptions(records: RiceLengthRecord[]): RiceType[] {
  return records.map((row) => ({ value: row.id, label: row.name }));
}

export function getRiceLengthNameById(
  id: string | null | undefined,
  riceLengths: RiceLengthRecord[],
  fallbackName?: string | null,
): string {
  if (fallbackName?.trim()) return fallbackName.trim();
  if (!id) return '';
  return riceLengths.find((row) => row.id === id)?.name ?? '';
}

export function formatRiceLengthGroupLabel(
  key: string,
  riceLengths: RiceLengthRecord[],
  sampleSauda?: Sauda,
): string {
  if (isUnsetRiceLengthKey(key)) return 'Unspecified length';
  const fromCatalog = getRiceLengthNameById(key, riceLengths);
  if (fromCatalog) return fromCatalog;
  if (sampleSauda?.rice_length_name?.trim()) return sampleSauda.rice_length_name.trim();
  return key;
}
