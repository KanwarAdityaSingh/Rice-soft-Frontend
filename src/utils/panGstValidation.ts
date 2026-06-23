/** PAN 4th character — holder type: P Individual, F Firm, C Company, H HUF, A Association, T Trust */
export const PAN_HOLDER_TYPE_CHARS = 'PFCHAT';

export const PAN_EXAMPLE = 'AFZPK7190K';
export const GST_EXAMPLE = '22AFZPK7190K1Z5';

export const PAN_FORMAT_HINT =
  '3 letters + holder type (P/F/C/H/A/T) + 1 letter + 4 digits + check letter — e.g. AFZPK7190K';

export const GST_FORMAT_HINT =
  '2-digit state code + PAN (10 chars) + entity digit + Z + checksum — e.g. 22AFZPK7190K1Z5';

export const PAN_MAX_LENGTH = 10;
export const GST_MAX_LENGTH = 15;

/** Core PAN body: AAA–ZZZ + holder type + surname initial + 0001–9999 + check letter */
const PAN_BODY_REGEX = /^[A-Z]{3}[PFCHAT][A-Z][0-9]{4}[A-Z]$/;

/** GSTIN: state (2) + PAN (10) + entity (1) + Z + checksum (1) */
const GST_REGEX = /^[0-9]{2}[A-Z]{3}[PFCHAT][A-Z][0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function sanitizePanInput(value: string): string {
  return value.replace(/\s/g, '').toUpperCase();
}

export function sanitizeGstInput(value: string): string {
  return value.replace(/\s/g, '').toUpperCase();
}

/** Extract embedded PAN from a normalized 15-character GSTIN (chars 3–12). */
export function extractPanFromGst(gst: string): string {
  const normalized = sanitizeGstInput(gst);
  return normalized.length >= 12 ? normalized.slice(2, 12) : '';
}

export function validatePAN(pan: string): boolean {
  const normalized = sanitizePanInput(pan);
  return PAN_BODY_REGEX.test(normalized);
}

export function validateGST(gst: string): boolean {
  const normalized = sanitizeGstInput(gst);
  return GST_REGEX.test(normalized);
}

function explainInvalidPan(normalized: string): string {
  if (!normalized) {
    return 'PAN is required.';
  }

  if (normalized.length !== PAN_MAX_LENGTH) {
    return `PAN must be exactly ${PAN_MAX_LENGTH} characters (e.g. ${PAN_EXAMPLE}).`;
  }

  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return 'PAN must contain only letters and digits.';
  }

  if (!/^[A-Z]{3}/.test(normalized)) {
    return `First 3 characters must be letters (e.g. AFZ in ${PAN_EXAMPLE}).`;
  }

  const holderType = normalized.charAt(3);
  if (!PAN_HOLDER_TYPE_CHARS.includes(holderType)) {
    return `4th character must be holder type: P (Individual), F (Firm), C (Company), H (HUF), A (Association), or T (Trust).`;
  }

  if (!/^[A-Z]$/.test(normalized.charAt(4))) {
    return `5th character must be a letter (first letter of surname, e.g. K in ${PAN_EXAMPLE}).`;
  }

  if (!/^[0-9]{4}$/.test(normalized.slice(5, 9))) {
    return `Characters 6–9 must be 4 digits (e.g. 7190 in ${PAN_EXAMPLE}).`;
  }

  if (!/^[A-Z]$/.test(normalized.charAt(9))) {
    return `10th character must be an alphabetic check digit (e.g. K in ${PAN_EXAMPLE}).`;
  }

  return `Invalid PAN format. Expected: ${PAN_FORMAT_HINT}`;
}

function explainInvalidGst(normalized: string): string {
  if (!normalized) {
    return 'GSTIN is required.';
  }

  if (normalized.length !== GST_MAX_LENGTH) {
    return `GSTIN must be exactly ${GST_MAX_LENGTH} characters (e.g. ${GST_EXAMPLE}).`;
  }

  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return 'GSTIN must contain only letters and digits.';
  }

  if (!/^[0-9]{2}/.test(normalized)) {
    return `First 2 characters must be the state code (e.g. 22 in ${GST_EXAMPLE}).`;
  }

  const embeddedPan = extractPanFromGst(normalized);
  const panError = getPanValidationError(embeddedPan);
  if (panError) {
    return `Embedded PAN (characters 3–12) is invalid: ${panError}`;
  }

  const entityChar = normalized.charAt(12);
  if (!/^[1-9A-Z]$/.test(entityChar)) {
    return `13th character must be the entity number for the same PAN in that state (1–9 or A–Z).`;
  }

  if (normalized.charAt(13) !== 'Z') {
    return `14th character must be Z (e.g. ${GST_EXAMPLE}).`;
  }

  if (!/^[0-9A-Z]$/.test(normalized.charAt(14))) {
    return `15th character must be the checksum digit.`;
  }

  return `Invalid GSTIN format. Expected: ${GST_FORMAT_HINT}`;
}

export function getPanValidationError(pan: string): string | null {
  const normalized = sanitizePanInput(pan);
  if (!normalized) return null;
  return validatePAN(normalized) ? null : explainInvalidPan(normalized);
}

export function getGstValidationError(gst: string): string | null {
  const normalized = sanitizeGstInput(gst);
  if (!normalized) return null;
  return validateGST(normalized) ? null : explainInvalidGst(normalized);
}

/** When both are present, the PAN embedded in GSTIN must match the standalone PAN. */
export function getGstPanMismatchError(gst: string, pan: string): string | null {
  const gstNorm = sanitizeGstInput(gst);
  const panNorm = sanitizePanInput(pan);
  if (!gstNorm || !panNorm) return null;
  if (!validateGST(gstNorm) || !validatePAN(panNorm)) return null;

  const embedded = extractPanFromGst(gstNorm);
  if (embedded !== panNorm) {
    return `PAN (${panNorm}) does not match the PAN embedded in GSTIN (${embedded}).`;
  }
  return null;
}
