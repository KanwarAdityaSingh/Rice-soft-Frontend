export interface VehicleNumberFormat {
  id: string;
  label: string;
  example: string;
  pattern: RegExp;
}

/** Accepted Indian / special vehicle registration formats (no spaces or dashes). */
export const VEHICLE_NUMBER_FORMATS: VehicleNumberFormat[] = [
  { id: 'ab121234', label: 'Standard', example: 'AB121234', pattern: /^[A-Z]{2}[0-9]{2}[0-9]{4}$/ },
  { id: 'ab12a1234', label: 'Standard + series letter', example: 'AB12A1234', pattern: /^[A-Z]{2}[0-9]{2}[A-Z]{1}[0-9]{4}$/ },
  { id: 'ab12ab1234', label: 'Standard + 2 series letters', example: 'AB12AB1234', pattern: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/ },
  { id: 'abc1234', label: '3-letter prefix', example: 'ABC1234', pattern: /^[A-Z]{3}[0-9]{4}$/ },
  { id: 'ab123a1234', label: '3-digit RTO + series', example: 'AB123A1234', pattern: /^[A-Z]{2}[0-9]{3}[A-Z]{1}[0-9]{4}$/ },
  { id: 'ab12abc1234', label: '3 series letters', example: 'AB12ABC1234', pattern: /^[A-Z]{2}[0-9]{2}[A-Z]{3}[0-9]{4}$/ },
  { id: 'bh_series', label: 'Bharat (BH) series', example: '25BH1234AB', pattern: /^[0-9]{2}BH[0-9]{4}[A-Z]{2}$/ },
  { id: 'defence', label: 'Defence vehicle', example: 'DF123456', pattern: /^DF[A-Z0-9]{6}$/ },
  { id: 'temporary', label: 'Temporary RC', example: 'TM123456', pattern: /^TM[A-Z0-9]{6}$/ },
  { id: 'bhutan', label: 'Bhutan', example: 'BP123456', pattern: /^BP[A-Z0-9]{6}$/ },
  { id: 'nepal', label: 'Nepal', example: 'NP123456', pattern: /^NP[A-Z0-9]{6}$/ },
];

export const VEHICLE_NUMBER_MAX_LENGTH = 11;

export const VEHICLE_NUMBER_FORMAT_HINT =
  'Valid formats: AB121234, AB12A1234, AB12AB1234, ABC1234, AB123A1234, AB12ABC1234, 25BH1234AB, DF/TM/BP/NP + 6 chars — no dashes or spaces';

/** Strip spaces, dashes, slashes, and other non-alphanumeric characters; uppercase. */
export function sanitizeVehicleNumberInput(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function validateVehicleNumber(vehicleNumber: string): boolean {
  const normalized = sanitizeVehicleNumberInput(vehicleNumber);
  if (!normalized) return false;
  return VEHICLE_NUMBER_FORMATS.some(({ pattern }) => pattern.test(normalized));
}

function hasDisallowedSeparators(value: string): boolean {
  return /[-/\s._]/.test(value);
}

function explainInvalidVehicleNumber(raw: string, normalized: string): string {
  if (hasDisallowedSeparators(raw)) {
    return 'Remove dashes, slashes, and spaces. Use letters and digits only (e.g. HR55AZ6789, not HR55AZ/6789).';
  }

  if (!normalized) {
    return 'Vehicle number is required.';
  }

  if (normalized.length < 7) {
    return `Too short (${normalized.length} characters). Shortest valid format is 7 characters (e.g. ABC1234).`;
  }

  if (normalized.length > VEHICLE_NUMBER_MAX_LENGTH) {
    return `Too long (${normalized.length} characters). Maximum is ${VEHICLE_NUMBER_MAX_LENGTH} (e.g. AB12ABC1234).`;
  }

  if (normalized.startsWith('DF')) {
    return 'Defence vehicle numbers must be DF followed by exactly 6 letters or digits (e.g. DF123456).';
  }
  if (normalized.startsWith('TM')) {
    return 'Temporary RC numbers must be TM followed by exactly 6 letters or digits (e.g. TM123456).';
  }
  if (normalized.startsWith('BP')) {
    return 'Bhutan vehicle numbers must be BP followed by exactly 6 letters or digits (e.g. BP123456).';
  }
  if (normalized.startsWith('NP')) {
    return 'Nepal vehicle numbers must be NP followed by exactly 6 letters or digits (e.g. NP123456).';
  }

  if (normalized.includes('BH')) {
    return 'Bharat (BH) series must be: 2 digits + BH + 4 digits + 2 letters (e.g. 25BH1234AB).';
  }

  if (/^[A-Z]{2}/.test(normalized)) {
    const endsWithFourDigits = /[0-9]{4}$/.test(normalized);
    if (!endsWithFourDigits) {
      return 'Standard numbers must end with 4 digits (e.g. MH01AB1234, AB12A1234).';
    }
    return (
      'Standard format: 2-letter state code + RTO digits + optional series letters + 4-digit number. ' +
      'Examples: AB121234, AB12A1234, AB12AB1234, AB123A1234, AB12ABC1234.'
    );
  }

  if (/^[A-Z]{3}[0-9]/.test(normalized)) {
    return '3-letter prefix format must be 3 letters followed by 4 digits (e.g. ABC1234).';
  }

  const examples = VEHICLE_NUMBER_FORMATS.map((f) => f.example).join(', ');
  return `Not a recognised vehicle number format. Accepted examples: ${examples}.`;
}

export function getVehicleNumberValidationError(vehicleNumber: string): string | null {
  const normalized = sanitizeVehicleNumberInput(vehicleNumber);
  if (!normalized && !vehicleNumber.trim()) {
    return 'Vehicle number is required';
  }
  if (validateVehicleNumber(vehicleNumber)) {
    return null;
  }
  return explainInvalidVehicleNumber(vehicleNumber, normalized);
}
