import type { DrivingLicenseOcrResponse } from '../types/entities';
import { normalizeIsoDateInput } from './dateFormatting';
import { sanitizeDrivingLicenseInput } from './validation';

export const LICENSE_OCR_ACCEPT = 'image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf';
export const LICENSE_OCR_IMAGE_TYPES = ['image/jpeg', 'image/png'];
export const LICENSE_OCR_MAX_BYTES = 10 * 1024 * 1024;
export const LICENSE_OCR_FILE_HINT = 'JPEG, PNG, or PDF · 10 MB max';

export function validateLicenseOcrFile(file: File): string | null {
  const isImage = LICENSE_OCR_IMAGE_TYPES.includes(file.type);
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isImage && !isPdf) {
    return 'Upload a JPEG, PNG, or PDF file.';
  }
  if (file.size > LICENSE_OCR_MAX_BYTES) {
    return 'File must be 10 MB or smaller.';
  }
  return null;
}

export function resolveOcrDateOfBirth(result: DrivingLicenseOcrResponse): string | null {
  const raw = result.date_of_birth ?? result.dob;
  if (!raw?.trim()) return null;
  return normalizeIsoDateInput(raw) || null;
}

export function resolveOcrLicenseNumber(result: DrivingLicenseOcrResponse): string | null {
  const raw = result.license_number?.trim();
  if (!raw) return null;
  return sanitizeDrivingLicenseInput(raw);
}

export function resolveOcrName(result: DrivingLicenseOcrResponse): string | null {
  const raw = (result.full_name ?? result.name)?.trim();
  return raw || null;
}
