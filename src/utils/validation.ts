// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export {
  sanitizePanInput,
  sanitizeGstInput,
  validatePAN,
  validateGST,
  extractPanFromGst,
  getPanValidationError,
  getGstValidationError,
  getGstPanMismatchError,
  PAN_EXAMPLE,
  GST_EXAMPLE,
  PAN_FORMAT_HINT,
  GST_FORMAT_HINT,
  PAN_MAX_LENGTH,
  GST_MAX_LENGTH,
  PAN_HOLDER_TYPE_CHARS,
} from './panGstValidation';

export {
  sanitizePhoneInput,
  formatPhoneDisplay,
  validatePhone,
  getPhoneValidationError,
  sanitizePhoneList,
  formatPhonesForDisplay,
  PHONE_DIGIT_LENGTH,
  PHONE_FORMATTED_MAX_LENGTH,
  PHONE_PLACEHOLDER,
  PHONE_FORMAT_HINT,
} from './phoneFormatting';

// Aadhaar validation (12 digits, cannot start with 0 or 1)
export const validateAadhaar = (aadhaar: string): boolean => {
  const cleaned = aadhaar.replace(/\s/g, ''); // Remove spaces
  const aadhaarRegex = /^[2-9]{1}[0-9]{11}$/;
  return aadhaarRegex.test(cleaned);
};

// Password validation (minimum 6 characters)
export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

// Google Maps link or Plus Code validation (lenient)
export const validateGoogleLocationLink = (value: string): boolean => {
  if (!value) return true;
  if (value.length > 500) return false;
  const trimmed = value.trim();
  // Try URL validation (http/https)
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return true;
    }
  } catch {
    // not a URL, fall back to plus code check
  }
  // Basic Plus Code pattern: contains a '+' and at least 4 chars before it
  // Reference: Plus codes are typically 6-8 chars + '+' + 2 chars, may include locality after space/comma
  const plusCodePattern = /^[0-9A-Z]{4,}\+[0-9A-Z]{2,}([\s,].+)?$/i;
  return plusCodePattern.test(trimmed);
};

// Username validation (alphanumeric with underscore)
export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return usernameRegex.test(username) && username.length >= 3;
};

// Pincode validation (6 digits)
export const validatePincode = (pincode: string): boolean => {
  const pincodeRegex = /^[0-9]{6}$/;
  return pincodeRegex.test(pincode);
};

// IFSC validation
export const validateIFSC = (ifsc: string): boolean => {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc.toUpperCase());
};

import { getVehicleNumberValidationError } from './vehicleNumberValidation';
import { getGstValidationError, getPanValidationError } from './panGstValidation';
import { getPhoneValidationError } from './phoneFormatting';
import { getDrivingLicenseValidationError } from './drivingLicenseValidation';

export {
  sanitizeVehicleNumberInput,
  validateVehicleNumber,
  getVehicleNumberValidationError,
  VEHICLE_NUMBER_FORMAT_HINT,
  VEHICLE_NUMBER_FORMATS,
  VEHICLE_NUMBER_MAX_LENGTH,
} from './vehicleNumberValidation';

export {
  sanitizeDrivingLicenseInput,
  validateDrivingLicense,
  getDrivingLicenseValidationError,
  DRIVING_LICENSE_EXAMPLE,
  DRIVING_LICENSE_DISPLAY_EXAMPLE,
  DRIVING_LICENSE_FORMAT_HINT,
  DRIVING_LICENSE_MAX_LENGTH,
} from './drivingLicenseValidation';

export const getValidationError = (field: string, value: string): string | null => {
  switch (field) {
    case 'email':
      return validateEmail(value) ? null : 'Invalid email format';
    case 'gst_number':
      return getGstValidationError(value) ?? null;
    case 'pan_number':
      return getPanValidationError(value) ?? null;
    case 'aadhaar_number':
      return validateAadhaar(value) ? null : 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)';
    case 'phone':
      return getPhoneValidationError(value) ?? null;
    case 'password':
      return validatePassword(value) ? null : 'Password must be at least 6 characters';
    case 'username':
      return validateUsername(value) ? null : 'Username must be alphanumeric with underscore (min 3 chars)';
    case 'pincode':
      return validatePincode(value) ? null : 'Pincode must be 6 digits';
    case 'ifsc_code':
      return validateIFSC(value) ? null : 'Invalid IFSC format (e.g., ABCD0123456)';
    case 'vehicle_number':
      return getVehicleNumberValidationError(value);
    case 'license_number':
      return getDrivingLicenseValidationError(value);
    case 'google_location_link':
      return validateGoogleLocationLink(value) ? null : 'Invalid Google Maps link format';
    default:
      return null;
  }
};

