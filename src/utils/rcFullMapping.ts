import type { CreateVehicleRequest, RcChallanItem, RcFullData, RcFullLookupResult } from '../types/entities';
import { sanitizeVehicleNumberInput } from './validation';

/** Surepass / RTO placeholders that mean “no data” rather than a real value. */
const RC_NA_VALUE = /^(na|n\/a|n\.a\.?|nil|null|none|not available|not applicable|-+|\.+)$/i;

export function isRcNaValue(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return RC_NA_VALUE.test(trimmed);
}

function sanitizeRcTextField(value: string | null | undefined): string | null {
  if (isRcNaValue(value)) return null;
  return value!.trim();
}

function toTitleCase(str: string | undefined | null): string {
  if (!str?.trim()) return '';
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

/** Parse YYYY-MM-DD only when month/day are valid (Surepass sometimes returns 2099-00-04). */
export function normalizeRcDateForInput(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const parsed = new Date(`${y}-${m}-${d}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${y}-${m}-${d}`;
}

function normalizeFuelType(value: string | null | undefined): string | null {
  if (isRcNaValue(value)) return null;
  const v = value!.trim().toLowerCase();
  if (v.includes('diesel')) return 'Diesel';
  if (v.includes('petrol') || v.includes('gasoline')) return 'Petrol';
  if (v.includes('cng')) return 'CNG';
  if (v.includes('electric')) return 'Electric';
  return toTitleCase(value);
}

function buildMakerModel(data: RcFullData): string | null {
  const parts = [data.maker_description, data.maker_model]
    .map((s) => (s != null ? String(s).trim() : ''))
    .filter((s) => s && !isRcNaValue(s));
  if (parts.length === 0) return null;
  return parts.join(' ').replace(/\s+/g, ' ');
}

/** True when RC full response has at least one usable field beyond the registration number. */
export function isRcFullDataEligibleForVerification(
  form: Partial<CreateVehicleRequest>,
  data: RcFullData,
): boolean {
  const hasTextField = Boolean(
    form.owner_name ||
      form.maker_model ||
      form.vehicle_class ||
      form.fuel_type,
  );
  const hasDate = Boolean(
    form.registration_date ||
      form.insurance_validity ||
      form.fitness_validity ||
      form.permit_validity,
  );
  const hasIdentifiers = Boolean(
    sanitizeRcTextField(data.vehicle_chasi_number) ||
      sanitizeRcTextField(data.vehicle_engine_number),
  );
  return hasTextField || hasDate || hasIdentifiers;
}

function parseChallanDetails(raw: unknown): RcChallanItem[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.length > 0 ? (raw as RcChallanItem[]) : null;
  }
  if (typeof raw === 'object' && raw !== null && 'challans' in raw) {
    const challans = (raw as { challans?: RcChallanItem[] }).challans;
    return challans?.length ? challans : null;
  }
  return null;
}

export function extractRcFullData(result: RcFullLookupResult): RcFullData | null {
  if (result.data?.rc_number) return result.data;
  const rawData = result.surepass_response?.data as RcFullData | undefined;
  if (rawData?.rc_number) return rawData;
  if (result.rc_number) {
    return {
      rc_number: result.rc_number,
      owner_name: result.owner_name ?? undefined,
      vehicle_category: result.vehicle_class ?? undefined,
      fuel_type: result.fuel_type ?? undefined,
      maker_model: result.maker_model ?? undefined,
      registration_date: result.registration_date ?? undefined,
      insurance_upto: result.insurance_validity ?? undefined,
      fit_up_to: result.fitness_validity ?? undefined,
      permit_valid_upto: result.permit_validity ?? undefined,
    };
  }
  return null;
}

export interface RcFullMappedVehicle {
  form: Partial<CreateVehicleRequest>;
  chassisNumber: string;
  engineNumber: string;
  verifiedFieldKeys: string[];
  rcData: RcFullData;
}

/** Map Surepass RC Full payload into vehicle form fields. */
export function mapRcFullToVehicleForm(result: RcFullLookupResult): RcFullMappedVehicle | null {
  const data = extractRcFullData(result);
  if (!data?.rc_number) return null;

  const form: Partial<CreateVehicleRequest> = {
    vehicle_number: sanitizeVehicleNumberInput(data.rc_number),
    rc_number: sanitizeVehicleNumberInput(data.rc_number),
    owner_name: (() => {
      const name = sanitizeRcTextField(data.owner_name);
      return name ? toTitleCase(name) : null;
    })(),
    vehicle_class:
      sanitizeRcTextField(data.vehicle_category_description) ||
      sanitizeRcTextField(data.vehicle_category) ||
      null,
    fuel_type: normalizeFuelType(data.fuel_type),
    maker_model: (() => {
      const combined = buildMakerModel(data);
      return combined ? toTitleCase(combined) : null;
    })(),
    registration_date: normalizeRcDateForInput(
      isRcNaValue(data.registration_date) ? null : data.registration_date,
    ),
    insurance_validity: normalizeRcDateForInput(
      isRcNaValue(data.insurance_upto) ? null : data.insurance_upto,
    ),
    fitness_validity: normalizeRcDateForInput(
      isRcNaValue(data.fit_up_to) ? null : data.fit_up_to,
    ),
    permit_validity: normalizeRcDateForInput(
      isRcNaValue(data.permit_valid_upto) ? null : data.permit_valid_upto,
    ),
    challan_details: parseChallanDetails(data.challan_details),
    is_verified: false,
    verified_at: null,
  };

  const canVerify = isRcFullDataEligibleForVerification(form, data);
  if (canVerify) {
    form.is_verified = true;
    form.verified_at = new Date().toISOString();
  }

  const verifiedFieldKeys: string[] = [];
  if (form.owner_name) verifiedFieldKeys.push('owner_name');
  if (form.maker_model) verifiedFieldKeys.push('maker_model');
  if (form.vehicle_class) verifiedFieldKeys.push('vehicle_class');
  if (form.fuel_type) verifiedFieldKeys.push('fuel_type');
  if (form.rc_number) verifiedFieldKeys.push('rc_number');
  if (form.registration_date) verifiedFieldKeys.push('registration_date');
  if (form.insurance_validity) verifiedFieldKeys.push('insurance_validity');
  if (form.fitness_validity) verifiedFieldKeys.push('fitness_validity');
  if (form.permit_validity) verifiedFieldKeys.push('permit_validity');

  return {
    form,
    chassisNumber: (data.vehicle_chasi_number || '').trim().toUpperCase(),
    engineNumber: (data.vehicle_engine_number || '').trim().toUpperCase(),
    verifiedFieldKeys,
    rcData: data,
  };
}
