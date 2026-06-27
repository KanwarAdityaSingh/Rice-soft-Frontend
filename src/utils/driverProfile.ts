import type { Driver, DriverVerificationResponse } from '../types/entities';
import { ISO_DATE_REGEX, normalizeIsoDateInput } from './dateFormatting';

/** Build `src` for a Surepass base64 profile photo. */
export function driverProfileImageSrc(profileImage?: string | null): string | null {
  if (!profileImage?.trim()) return null;
  const trimmed = profileImage.trim();
  if (trimmed.startsWith('data:')) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}

export function formatDriverGender(gender?: string | null): string {
  if (!gender?.trim()) return '—';
  const key = gender.trim().toUpperCase();
  const labels: Record<string, string> = {
    M: 'Male',
    F: 'Female',
    O: 'Other',
    MALE: 'Male',
    FEMALE: 'Female',
  };
  return labels[key] ?? gender;
}

type DriverExpirySource =
  | Pick<Driver, 'license_expires_at' | 'doe' | 'transport_license_expires_at' | 'transport_doe'>
  | Pick<DriverVerificationResponse, 'date_of_expiry' | 'doe' | 'transport_date_of_expiry' | 'transport_doe'>;

function parseIsoDateOrNull(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const normalized = normalizeIsoDateInput(value);
  return normalized && ISO_DATE_REGEX.test(normalized) ? normalized : null;
}

/** Earliest of licence DOE and transport DOE (whichever expires sooner). */
export function resolveDriverLicenseExpiry(source: DriverExpirySource): string | null {
  const regular = resolveDriverRegularLicenseExpiry(source);
  const transport = resolveDriverTransportLicenseExpiry(source);
  const dates = [regular, transport].filter(Boolean) as string[];
  if (dates.length === 0) return null;
  return dates.reduce((earliest, d) => (d < earliest ? d : earliest));
}

type DriverRegularExpirySource =
  | Pick<Driver, 'license_expires_at' | 'doe' | 'verification_details'>
  | Pick<DriverVerificationResponse, 'date_of_expiry' | 'doe'>;

type DriverTransportExpirySource =
  | Pick<Driver, 'transport_license_expires_at' | 'transport_doe' | 'verification_details'>
  | Pick<DriverVerificationResponse, 'transport_date_of_expiry' | 'transport_doe'>;

/** Non-transport licence date of expiry. */
export function resolveDriverRegularLicenseExpiry(source: DriverRegularExpirySource): string | null {
  return (
    parseIsoDateOrNull('license_expires_at' in source ? source.license_expires_at : null) ??
    parseIsoDateOrNull(source.doe) ??
    parseIsoDateOrNull('date_of_expiry' in source ? source.date_of_expiry : null) ??
    mappedString(
      getDriverVerificationMapped('verification_details' in source ? source.verification_details : null),
      'date_of_expiry',
    )
  );
}

/** Transport licence date of expiry. */
export function resolveDriverTransportLicenseExpiry(source: DriverTransportExpirySource): string | null {
  return (
    parseIsoDateOrNull('transport_license_expires_at' in source ? source.transport_license_expires_at : null) ??
    parseIsoDateOrNull('transport_doe' in source ? source.transport_doe : null) ??
    parseIsoDateOrNull('transport_date_of_expiry' in source ? source.transport_date_of_expiry : null) ??
    mappedString(
      getDriverVerificationMapped('verification_details' in source ? source.verification_details : null),
      'transport_date_of_expiry',
    )
  );
}

export function formatDriverExpiryDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const normalized = normalizeIsoDateInput(iso);
  if (!normalized || !ISO_DATE_REGEX.test(normalized)) return iso.trim();
  return new Date(`${normalized}T12:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDriverVerificationMapped(
  details: Driver['verification_details'],
): Record<string, unknown> | null {
  if (!details || typeof details !== 'object') return null;
  if ('mapped' in details && details.mapped && typeof details.mapped === 'object') {
    return details.mapped as Record<string, unknown>;
  }
  return null;
}

/** Surepass DL raw payload (`verification_details.raw.data`). */
function getDriverVerificationRawData(
  details: Driver['verification_details'],
): Record<string, unknown> | null {
  if (!details || typeof details !== 'object') return null;
  const raw = 'raw' in details ? details.raw : null;
  if (!raw || typeof raw !== 'object') return null;
  const data = 'data' in raw ? (raw as { data?: unknown }).data : raw;
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

function mappedString(mapped: Record<string, unknown> | null, key: string): string | null {
  const value = mapped?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** Read the first non-empty string for the given keys from mapped, then raw Surepass data. */
function pickFromDriverVerification(
  details: Driver['verification_details'],
  keys: string[],
): string | null {
  const mapped = getDriverVerificationMapped(details);
  const raw = getDriverVerificationRawData(details);
  for (const key of keys) {
    const fromMapped = mappedString(mapped, key);
    if (fromMapped) return fromMapped;
    const fromRaw = mappedString(raw, key);
    if (fromRaw) return fromRaw;
  }
  return null;
}

/** True when a value is likely a full street address, not a state name. */
function looksLikeStreetAddress(value: string, address?: string | null): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (address?.trim() && trimmed === address.trim()) return true;
  return trimmed.length > 40 || (trimmed.split(',').length >= 3 && trimmed.length > 20);
}

function readSurepassRawField(
  details: Driver['verification_details'],
  key: string,
): string | null | undefined {
  const raw = getDriverVerificationRawData(details);
  if (!raw || !(key in raw)) return undefined;
  const value = raw[key];
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
}

function readSurepassOlaName(details: Driver['verification_details']): string | null {
  return (
    readSurepassRawField(details, 'ola_name') ??
    mappedString(getDriverVerificationMapped(details), 'ola_name')
  );
}

/** True when a stored city value is actually the issuing RTO office (`ola_name`), not a city. */
function isDriverCityIssuingOffice(
  city: string,
  details: Driver['verification_details'],
): boolean {
  const olaName = readSurepassOlaName(details);
  return Boolean(olaName && city.trim() === olaName);
}

export function resolveDriverCityName(
  driver: Pick<Driver, 'city_name' | 'verification_details'>,
): string | null {
  const rawCity = readSurepassRawField(driver.verification_details, 'city_name');
  if (rawCity !== undefined) {
    return rawCity;
  }

  const direct = driver.city_name?.trim();
  if (!direct) return null;
  if (isDriverCityIssuingOffice(direct, driver.verification_details)) return null;
  return direct;
}

export function resolveDriverStateName(
  driver: Pick<Driver, 'state' | 'address' | 'verification_details'>,
): string | null {
  const rawState = readSurepassRawField(driver.verification_details, 'state');
  if (rawState !== undefined) {
    if (!rawState) return null;
    return looksLikeStreetAddress(rawState, driver.address) ? null : rawState;
  }

  const direct = driver.state?.trim();
  if (direct && !looksLikeStreetAddress(direct, driver.address)) return direct;

  const fromSurepass = pickFromDriverVerification(driver.verification_details, ['state']);
  if (fromSurepass && !looksLikeStreetAddress(fromSurepass, driver.address)) return fromSurepass;

  return null;
}

/** City/state values to persist — respects Surepass raw nulls (no RTO office as city). */
export function resolveDriverLocationForSave(
  driver: Pick<Driver, 'city_name' | 'state' | 'address' | 'verification_details'>,
): { city_name: string | null; state: string | null } {
  return {
    city_name: resolveDriverCityName(driver),
    state: resolveDriverStateName(driver),
  };
}

/** Display city and state; omit city when unavailable. */
export function formatDriverCityAndState(
  driver: Pick<Driver, 'city_name' | 'state' | 'address' | 'verification_details'>,
): string {
  const city = resolveDriverCityName(driver);
  const state = resolveDriverStateName(driver);
  if (city && state) return `${city}, ${state}`;
  return state ?? city ?? '—';
}

/** Prefer state from Surepass; fall back to city when state is unavailable. */
export function formatDriverCityOrState(
  driver: Pick<Driver, 'city_name' | 'state' | 'address' | 'verification_details'>,
): string {
  return resolveDriverStateName(driver) ?? resolveDriverCityName(driver) ?? '—';
}

export function normalizeVehicleClasses(classes?: string[] | null): string[] {
  if (!classes?.length) return [];
  return classes.map((c) => c.trim()).filter(Boolean);
}

export function hasDriverProfileData(
  data: Partial<
    Pick<
      Driver,
      | 'name'
      | 'address'
      | 'pincode'
      | 'gender'
      | 'date_of_birth'
      | 'license_expires_at'
      | 'doe'
      | 'transport_license_expires_at'
      | 'transport_doe'
      | 'father_or_husband_name'
      | 'state'
      | 'city_name'
      | 'profile_image'
      | 'vehicle_classes'
    >
  >,
): boolean {
  return Boolean(
    data.name ||
      data.address ||
      data.pincode ||
      data.gender ||
      data.date_of_birth ||
      data.license_expires_at ||
      data.doe ||
      data.transport_license_expires_at ||
      data.transport_doe ||
      data.father_or_husband_name ||
      data.state ||
      data.city_name ||
      data.profile_image ||
      normalizeVehicleClasses(data.vehicle_classes).length > 0,
  );
}
