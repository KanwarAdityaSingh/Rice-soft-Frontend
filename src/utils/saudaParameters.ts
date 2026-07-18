import type { Sauda, SaudaParameters, SaudaParametersInput } from '../types/entities';

export const SAUDA_WHITENESS_MIN = 5;
export const SAUDA_WHITENESS_MAX = 69.9;

export const SAUDA_AVG_GRAIN_LENGTH_MIN = 2;
export const SAUDA_AVG_GRAIN_LENGTH_MAX = 12;

/** Block input when parsed value is already above max (no valid continuation). */
export function isSaudaNumericAboveMax(value: string, max: number): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > max;
}

/** Allow digits and a single decimal point while typing (blocks letters, symbols, IME junk). */
export function sanitizeSaudaDecimalInput(
  raw: string,
  maxFractionDigits = 1,
): string {
  let out = '';
  let seenDot = false;
  let fractionDigits = 0;

  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      if (seenDot) {
        if (fractionDigits >= maxFractionDigits) continue;
        fractionDigits += 1;
      }
      out += ch;
      continue;
    }
    if (ch === '.' && !seenDot) {
      seenDot = true;
      out += ch;
    }
  }

  return out;
}

export function processSaudaDecimalFieldInput(
  raw: string,
  max: number,
  validate: (value: string) => string | null,
): { value: string; error: string; reject: boolean } {
  const next = sanitizeSaudaDecimalInput(raw);
  if (!next) {
    return { value: '', error: '', reject: false };
  }
  if (isSaudaNumericAboveMax(next, max)) {
    return {
      value: '',
      error:
        validate(next) ??
        `Value must be between the allowed range (max ${max})`,
      reject: true,
    };
  }
  return {
    value: next,
    error: validate(next) ?? '',
    reject: false,
  };
}

export function validateSaudaWhiteness(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return 'Whiteness (W) must be a number';
  }
  if (n < SAUDA_WHITENESS_MIN || n > SAUDA_WHITENESS_MAX) {
    return `Whiteness (W) must be between ${SAUDA_WHITENESS_MIN} and ${SAUDA_WHITENESS_MAX}`;
  }
  return null;
}

export function validateSaudaAvgGrainLength(value: string): string | null {
  const trimmed = normalizeAvgGrainLengthInput(value);
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return 'Avg grain length (mm) must be a number';
  }
  if (n < SAUDA_AVG_GRAIN_LENGTH_MIN || n > SAUDA_AVG_GRAIN_LENGTH_MAX) {
    return `Avg grain length must be between ${SAUDA_AVG_GRAIN_LENGTH_MIN} and ${SAUDA_AVG_GRAIN_LENGTH_MAX} mm`;
  }
  return null;
}

/** Strip optional trailing "mm" from stored/API values for numeric inputs. */
export function normalizeAvgGrainLengthInput(value: string): string {
  return value.trim().replace(/\s*mm\s*$/i, '');
}

export function formatSaudaParameterValue(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : '—';
}

export function formatSaudaWhitenessDisplay(value: string | null | undefined): string {
  const t = value?.trim();
  if (!t) return '—';
  return `${t} W`;
}

export function formatSaudaAvgGrainLengthDisplay(value: string | null | undefined): string {
  const t = normalizeAvgGrainLengthInput(value ?? '');
  if (!t) return '—';
  return `${t} mm`;
}

/** API-ready parameters object, or omit from request body when empty. */
export function normalizeSaudaParametersForApi(
  input: SaudaParametersInput | Sauda['parameters'] | null | undefined,
): SaudaParametersInput | undefined {
  if (!input) return undefined;
  const w = input.whiteness?.trim() ?? '';
  const g = normalizeAvgGrainLengthInput(input.average_grain_length ?? '');
  if (!w && !g) return undefined;
  const out: SaudaParametersInput = {};
  if (w) out.whiteness = w;
  if (g) out.average_grain_length = g;
  return out;
}

export function buildSaudaParametersPayload(
  whiteness: string,
  averageGrainLength: string,
): SaudaParametersInput | undefined {
  return normalizeSaudaParametersForApi({
    whiteness,
    average_grain_length: averageGrainLength,
  });
}

export function saudaParametersFromSauda(sauda: Pick<Sauda, 'parameters'>): {
  whiteness: string;
  average_grain_length: string;
} {
  return {
    whiteness: sauda.parameters?.whiteness?.trim() ?? '',
    average_grain_length: normalizeAvgGrainLengthInput(
      sauda.parameters?.average_grain_length ?? '',
    ),
  };
}

export function hasSaudaParameters(parameters: SaudaParameters | null | undefined): boolean {
  if (!parameters) return false;
  return Boolean(parameters.whiteness?.trim() || parameters.average_grain_length?.trim());
}
