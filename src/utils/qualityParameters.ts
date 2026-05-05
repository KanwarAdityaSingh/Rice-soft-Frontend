import type { QualityParameter } from '../types/entities';

export const QUALITY_PARAMETER_KEYS = [
  'purity',
  'natural_admixture',
  'average_grain_length',
  'moisture',
  'broken_grain',
  'damage_discolour_grain',
  'immature_grains',
  'whiteness',
  'foreign_matter',
  'black_grains',
] as const;

export type QualityParameterFieldKey = (typeof QUALITY_PARAMETER_KEYS)[number];

export type QualityParameterDraft = Record<QualityParameterFieldKey, string>;

/** Per-field copy aligned with typical rice spec sheets (% / mm / kett / NIL). */
export const QUALITY_PARAMETER_SPECS = {
  purity: {
    label: 'Purity',
    unit: '%',
    placeholder: 'e.g. 90%–95%',
  },
  natural_admixture: {
    label: 'Natural admixture',
    unit: '%',
    placeholder: 'e.g. 5%–10%',
  },
  average_grain_length: {
    label: 'Average grain length',
    unit: 'mm',
    placeholder: 'e.g. 8.35 mm',
  },
  moisture: {
    label: 'Moisture',
    unit: '% max',
    placeholder: 'e.g. 13% Max',
  },
  broken_grain: {
    label: 'Broken grain',
    unit: '%',
    placeholder: 'e.g. 1%–2%',
  },
  damage_discolour_grain: {
    label: 'Damage / discoloured grain',
    unit: '%',
    placeholder: 'e.g. 1%–2%',
  },
  immature_grains: {
    label: 'Immature grains',
    unit: '%',
    placeholder: 'e.g. 1%–2%',
  },
  whiteness: {
    label: 'Whiteness',
    unit: 'kett',
    placeholder: 'e.g. 30–32 kett',
  },
  foreign_matter: {
    label: 'Foreign matter',
    unit: '',
    placeholder: 'e.g. NIL',
  },
  black_grains: {
    label: 'Black grains',
    unit: '',
    placeholder: 'e.g. NIL',
  },
} as const satisfies Record<
  QualityParameterFieldKey,
  { label: string; unit: string; placeholder: string }
>;

/** Short label only (for tight layouts). */
export const QUALITY_PARAMETER_LABELS: Record<QualityParameterFieldKey, string> = QUALITY_PARAMETER_KEYS.reduce(
  (acc, k) => {
    acc[k] = QUALITY_PARAMETER_SPECS[k].label;
    return acc;
  },
  {} as Record<QualityParameterFieldKey, string>
);

/** Label with unit for tables and read-only grids, e.g. "Purity (%)", "Moisture (% max)". */
export function qualityParameterLabelWithUnit(key: QualityParameterFieldKey): string {
  const { label, unit } = QUALITY_PARAMETER_SPECS[key];
  const u = unit.trim();
  return u ? `${label} (${u})` : label;
}

export function emptyQualityParameterDraft(): QualityParameterDraft {
  return QUALITY_PARAMETER_KEYS.reduce(
    (acc, k) => ({ ...acc, [k]: '' }),
    {} as QualityParameterDraft
  );
}

export function draftFromQualityParameter(row: QualityParameter | null): QualityParameterDraft {
  const d = emptyQualityParameterDraft();
  if (!row) return d;
  for (const k of QUALITY_PARAMETER_KEYS) {
    const v = row[k];
    d[k] = v != null && v !== '' ? String(v) : '';
  }
  return d;
}

export function qualityDraftHasAnyValue(draft: QualityParameterDraft): boolean {
  return QUALITY_PARAMETER_KEYS.some((k) => draft[k].trim().length > 0);
}

export function qualityParameterRowHasValues(row: QualityParameter | null): boolean {
  if (!row) return false;
  return QUALITY_PARAMETER_KEYS.some((k) => {
    const v = row[k];
    return v != null && String(v).trim() !== '';
  });
}

/** Non-empty fields for read-only display (e.g. batch detail). */
export function qualityParameterDisplayRows(row: QualityParameter | null): {
  key: QualityParameterFieldKey;
  label: string;
  value: string;
}[] {
  if (!row) return [];
  return QUALITY_PARAMETER_KEYS.filter((k) => {
    const v = row[k];
    return v != null && String(v).trim() !== '';
  }).map((k) => ({
    key: k,
    label: qualityParameterLabelWithUnit(k),
    value: String(row[k]).trim(),
  }));
}

/** Map draft to nullable strings for API (trimmed empty → null). */
export function qualityDraftToNullableFields(
  draft: QualityParameterDraft
): Record<QualityParameterFieldKey, string | null> {
  const out = {} as Record<QualityParameterFieldKey, string | null>;
  for (const k of QUALITY_PARAMETER_KEYS) {
    const t = draft[k].trim();
    out[k] = t.length > 0 ? t : null;
  }
  return out;
}
