/** Sarathi-style Indian driving licence: SS + RR + YYYY + 7-digit serial (15 chars). */
export const DRIVING_LICENSE_EXAMPLE = 'DL0420110012345';
export const DRIVING_LICENSE_DISPLAY_EXAMPLE = 'DL04 20110012345';

export const DRIVING_LICENSE_FORMAT_HINT =
  '2-letter state + 2-digit RTO + 4-digit issue year + 7-digit serial';

export const DRIVING_LICENSE_FORMAT_EXAMPLE = `e.g. ${DRIVING_LICENSE_DISPLAY_EXAMPLE}`;

export const DRIVING_LICENSE_MAX_LENGTH = 15;

/** Compact Sarathi format after removing spaces/hyphens. */
const DRIVING_LICENSE_REGEX = /^[A-Z]{2}[0-9]{2}(19|20)[0-9]{2}[0-9]{7}$/;

/** Strip spaces, hyphens, slashes; uppercase letters. */
export function sanitizeDrivingLicenseInput(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function validateDrivingLicense(licenseNumber: string): boolean {
  const normalized = sanitizeDrivingLicenseInput(licenseNumber);
  if (!normalized) return false;
  return DRIVING_LICENSE_REGEX.test(normalized);
}

function hasDisallowedSeparators(value: string): boolean {
  return /[-/\s._]/.test(value);
}

function explainInvalidDrivingLicense(raw: string, normalized: string): string {
  if (hasDisallowedSeparators(raw)) {
    return `Remove dashes and extra spaces. Use the compact form or a single space after RTO (e.g. ${DRIVING_LICENSE_DISPLAY_EXAMPLE}).`;
  }

  if (!normalized) {
    return 'Driving licence number is required.';
  }

  if (normalized.length !== DRIVING_LICENSE_MAX_LENGTH) {
    return `Licence number must be exactly ${DRIVING_LICENSE_MAX_LENGTH} characters after removing spaces (e.g. ${DRIVING_LICENSE_DISPLAY_EXAMPLE}).`;
  }

  if (!/^[A-Z]{2}/.test(normalized)) {
    return 'First 2 characters must be the state code (letters, e.g. DL, MH, KA).';
  }

  if (!/^[A-Z]{2}[0-9]{2}/.test(normalized)) {
    return 'Characters 3–4 must be the 2-digit RTO code (e.g. 04 in DL04).';
  }

  const yearPart = normalized.slice(4, 8);
  if (!/^(19|20)[0-9]{2}$/.test(yearPart)) {
    return 'Characters 5–8 must be a valid 4-digit issue year (1900–2099, e.g. 2011).';
  }

  if (!/^[0-9]{7}$/.test(normalized.slice(8))) {
    return 'Last 7 characters must be digits (serial number, pad with leading zeros if needed).';
  }

  return `Invalid licence format. Expected: ${DRIVING_LICENSE_FORMAT_HINT} — ${DRIVING_LICENSE_FORMAT_EXAMPLE}`;
}

export function getDrivingLicenseValidationError(licenseNumber: string): string | null {
  const normalized = sanitizeDrivingLicenseInput(licenseNumber);
  if (!normalized && !licenseNumber.trim()) {
    return 'Driving licence number is required';
  }
  if (validateDrivingLicense(licenseNumber)) {
    return null;
  }
  return explainInvalidDrivingLicense(licenseNumber, normalized);
}
