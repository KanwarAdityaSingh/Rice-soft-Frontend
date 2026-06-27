import type { RiceCode, RiceCodeVariantLink } from '../types/entities';

export function isRiceCodeVariantLink(value: unknown): value is RiceCodeVariantLink {
  return (
    typeof value === 'object' &&
    value != null &&
    'variant' in value &&
    typeof (value as RiceCodeVariantLink).variant === 'string'
  );
}

/** Variant keys from API objects (`{ variant }`) or legacy string arrays. */
export function getRiceCodeVariantKeys(
  variants: RiceCode['variants'] | null | undefined,
): string[] {
  if (!variants?.length) return [];
  const first = variants[0];
  if (typeof first === 'string') return [...(variants as string[])];
  return (variants as RiceCodeVariantLink[]).map((row) => row.variant);
}
