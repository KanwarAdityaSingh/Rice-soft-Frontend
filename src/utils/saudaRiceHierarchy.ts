import type { Sauda } from '../types/entities';

const UNSET_RICE_TYPE = '__unset_rice_type__';
const UNSET_RICE_LENGTH = '__unset_rice_length__';
const UNSET_RICE_CATEGORY = '__unset_rice_category__';

export function riceCategoryGroupKey(sauda: Sauda): string {
  return sauda.rice_category?.trim() || UNSET_RICE_CATEGORY;
}

export function isUnsetRiceCategoryKey(key: string): boolean {
  return key === UNSET_RICE_CATEGORY;
}

export function filterSaudasByCategory(saudas: Sauda[], category: string): Sauda[] {
  return saudas.filter((s) => riceCategoryGroupKey(s) === category);
}

export function riceTypeGroupKey(sauda: Sauda): string {
  return sauda.rice_type?.trim() || UNSET_RICE_TYPE;
}

export function riceLengthGroupKey(sauda: Sauda): string {
  if (sauda.rice_length_id?.trim()) return sauda.rice_length_id.trim();
  if (sauda.rice_length?.trim()) return sauda.rice_length.trim();
  return UNSET_RICE_LENGTH;
}

export function isUnsetRiceTypeKey(key: string): boolean {
  return key === UNSET_RICE_TYPE;
}

export function isUnsetRiceLengthKey(key: string): boolean {
  return key === UNSET_RICE_LENGTH;
}

export function filterSaudasByRiceCode(saudas: Sauda[], riceCodeId: string): Sauda[] {
  return saudas.filter((s) => s.rice_code_id === riceCodeId);
}

export function filterSaudasByRiceType(saudas: Sauda[], riceTypeKey: string): Sauda[] {
  return saudas.filter((s) => riceTypeGroupKey(s) === riceTypeKey);
}

export function saudaMatchesRiceLengthKey(
  sauda: Sauda,
  lengthKey: string,
  lengthCode?: string | null,
): boolean {
  if (isUnsetRiceLengthKey(lengthKey)) {
    return isUnsetRiceLengthKey(riceLengthGroupKey(sauda));
  }
  const key = riceLengthGroupKey(sauda);
  if (key === lengthKey) return true;
  if (lengthCode && key === lengthCode) return true;
  return false;
}

export function filterSaudasByRiceLength(
  saudas: Sauda[],
  lengthKey: string,
  lengthCode?: string | null,
): Sauda[] {
  return saudas.filter((s) => saudaMatchesRiceLengthKey(s, lengthKey, lengthCode));
}

export function groupSaudasByRiceType(saudas: Sauda[]): Map<string, Sauda[]> {
  const map = new Map<string, Sauda[]>();
  for (const sauda of saudas) {
    const key = riceTypeGroupKey(sauda);
    const list = map.get(key);
    if (list) list.push(sauda);
    else map.set(key, [sauda]);
  }
  return map;
}

export function groupSaudasByRiceLength(saudas: Sauda[]): Map<string, Sauda[]> {
  const map = new Map<string, Sauda[]>();
  for (const sauda of saudas) {
    const key = riceLengthGroupKey(sauda);
    const list = map.get(key);
    if (list) list.push(sauda);
    else map.set(key, [sauda]);
  }
  return map;
}

export function countSaudasForRiceCode(saudas: Sauda[], riceCodeId: string): number {
  return saudas.filter((s) => s.rice_code_id === riceCodeId).length;
}
