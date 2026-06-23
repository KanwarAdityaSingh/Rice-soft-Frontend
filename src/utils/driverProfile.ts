import type { Driver, DriverVerificationResponse } from '../types/entities';
import { normalizeIsoDateInput } from './dateFormatting';

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

export function resolveDriverLicenseExpiry(
  source: Pick<Driver, 'license_expires_at' | 'doe'> | Pick<DriverVerificationResponse, 'date_of_expiry' | 'doe'>,
): string | null {
  const raw =
    'license_expires_at' in source
      ? source.license_expires_at ?? source.doe
      : source.date_of_expiry ?? source.doe;
  if (!raw?.trim()) return null;
  return normalizeIsoDateInput(raw) || null;
}

export function normalizeVehicleClasses(classes?: string[] | null): string[] {
  if (!classes?.length) return [];
  return classes.map((c) => c.trim()).filter(Boolean);
}

export function hasDriverProfileData(
  data: Partial<
    Pick<Driver, 'name' | 'address' | 'pincode' | 'gender' | 'date_of_birth' | 'license_expires_at' | 'doe' | 'profile_image' | 'vehicle_classes'>
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
      data.profile_image ||
      normalizeVehicleClasses(data.vehicle_classes).length > 0,
  );
}
