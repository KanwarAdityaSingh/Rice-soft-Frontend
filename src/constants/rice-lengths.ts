import type { RiceLength } from '../types/entities';

export type { RiceLength };

/** Canonical order for UI; labels should match GET /riceCodes/getRiceLengths when possible. */
export const RICE_LENGTH_VALUES: readonly RiceLength[] = ['dubar', 'tibar', 'wand'];

export const RICE_LENGTH_OPTIONS: { value: RiceLength; label: string }[] = [
  { value: 'dubar', label: 'Dubar (Double)' },
  { value: 'tibar', label: 'Tibar' },
  { value: 'wand', label: 'Wand' },
];
