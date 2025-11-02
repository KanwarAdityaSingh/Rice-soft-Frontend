// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// GST validation (15 characters: 2 digits + 10 PAN + 2 check digits + 1 'Z' + 1 digit)
export const validateGST = (gst: string): boolean => {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst.toUpperCase());
};

// PAN validation (10 characters: 5 letters + 4 digits + 1 letter)
export const validatePAN = (pan: string): boolean => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase());
};

// Aadhaar validation (12 digits, cannot start with 0 or 1)
export const validateAadhaar = (aadhaar: string): boolean => {
  const cleaned = aadhaar.replace(/\s/g, ''); // Remove spaces
  const aadhaarRegex = /^[2-9]{1}[0-9]{11}$/;
  return aadhaarRegex.test(cleaned);
};

// Phone validation (10 digits)
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

// Password validation (minimum 6 characters)
export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
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

// Validation error messages
export const getValidationError = (field: string, value: string): string | null => {
  switch (field) {
    case 'email':
      return validateEmail(value) ? null : 'Invalid email format';
    case 'gst_number':
      return validateGST(value) ? null : 'Invalid GST format (e.g., 27ABCDE1234F1Z5)';
    case 'pan_number':
      return validatePAN(value) ? null : 'Invalid PAN format (e.g., ABCDE1234F)';
    case 'aadhaar_number':
      return validateAadhaar(value) ? null : 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)';
    case 'phone':
      return validatePhone(value) ? null : 'Phone must be 10 digits';
    case 'password':
      return validatePassword(value) ? null : 'Password must be at least 6 characters';
    case 'username':
      return validateUsername(value) ? null : 'Username must be alphanumeric with underscore (min 3 chars)';
    case 'pincode':
      return validatePincode(value) ? null : 'Pincode must be 6 digits';
    case 'ifsc_code':
      return validateIFSC(value) ? null : 'Invalid IFSC format (e.g., ABCD0123456)';
    default:
      return null;
  }
};

