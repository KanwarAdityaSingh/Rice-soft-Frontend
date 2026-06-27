import type { Driver } from '../types/entities';
import { resolveDriverTransportLicenseExpiry } from './driverProfile';

export const DRIVER_TRANSPORT_DOE_NOT_FOUND_LABEL = 'Transport DOE not found';

export const DRIVER_CREATE_LENIENT_TRANSPORT_DOE_MESSAGE = 'Driver created successfully';

/** Format driver identity verification timestamp for list/detail views. */
export function formatDriverVerifiedAt(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** True when driver has a Surepass DL snapshot in verification_details. */
export function computeDriverVerifiedFromDetails(
  verificationDetails?: Record<string, unknown> | null,
): boolean {
  if (!verificationDetails || typeof verificationDetails !== 'object') return false;
  const snapshot = verificationDetails as { provider?: string; verified_at?: string };
  return snapshot.provider === 'surepass' && Boolean(snapshot.verified_at);
}

/** Warning text when transport licence DOE could not be resolved from Surepass. */
export function getDriverTransportDoeWarning(
  driver: Pick<
    Driver,
    | 'transport_doe_not_found'
    | 'verification_error'
    | 'is_verified'
    | 'transport_license_expires_at'
    | 'transport_doe'
    | 'verification_details'
  >,
): string | null {
  const detail = driver.verification_error?.trim();
  if (detail) return detail;
  if (driver.transport_doe_not_found) return DRIVER_TRANSPORT_DOE_NOT_FOUND_LABEL;
  if (driver.is_verified && !resolveDriverTransportLicenseExpiry(driver)) {
    return DRIVER_TRANSPORT_DOE_NOT_FOUND_LABEL;
  }
  return null;
}

export function hasDriverTransportDoeNotFound(
  driver: Pick<
    Driver,
    | 'transport_doe_not_found'
    | 'verification_error'
    | 'is_verified'
    | 'transport_license_expires_at'
    | 'transport_doe'
    | 'verification_details'
  >,
): boolean {
  return Boolean(getDriverTransportDoeWarning(driver));
}

export function hasDriverTransportDoePresent(
  driver: Pick<
    Driver,
    'transport_license_expires_at' | 'transport_doe' | 'verification_details'
  >,
): boolean {
  return Boolean(resolveDriverTransportLicenseExpiry(driver));
}

export function getDriverSaveAlert(
  isEdit: boolean,
  message: string,
  verification_error?: string,
  transport_doe_not_found?: boolean,
): { alertType: 'success' | 'warning'; alertTitle: string; alertMessage: string } {
  const trimmedMessage = message.trim();
  const isLenientTransportDoe =
    Boolean(transport_doe_not_found) ||
    Boolean(verification_error?.trim()) ||
    /transport doe not found/i.test(trimmedMessage);

  if (isLenientTransportDoe) {
    const main =
      trimmedMessage ||
      (isEdit ? 'Driver updated successfully' : DRIVER_CREATE_LENIENT_TRANSPORT_DOE_MESSAGE);
    const detail = verification_error?.trim() || DRIVER_TRANSPORT_DOE_NOT_FOUND_LABEL;
    return {
      alertType: 'warning',
      alertTitle: isEdit ? 'Driver Updated' : 'Driver Created',
      alertMessage: [main, detail].filter(Boolean).join('\n\n'),
    };
  }

  const defaultSuccess = isEdit ? 'Driver updated successfully' : 'Driver created successfully';
  return {
    alertType: 'success',
    alertTitle: 'Success',
    alertMessage: trimmedMessage || defaultSuccess,
  };
}
