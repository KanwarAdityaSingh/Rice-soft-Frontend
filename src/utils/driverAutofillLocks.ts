import type { Driver, DriverVerificationResponse } from '../types/entities';

export type DriverFieldLockKey =
  | 'license_number'
  | 'name'
  | 'date_of_birth'
  | 'license_expires_at'
  | 'address'
  | 'pincode'
  | 'gender'
  | 'profile_image'
  | 'vehicle_classes';

export const DRIVER_LOCKED_INPUT_CLASS = 'opacity-60 cursor-not-allowed bg-muted/30';

function addIfPresent(locks: Set<DriverFieldLockKey>, key: DriverFieldLockKey, value: unknown) {
  if (value == null) return;
  if (typeof value === 'string' && !value.trim()) return;
  if (Array.isArray(value) && value.length === 0) return;
  locks.add(key);
}

/** Lock fields populated on the driver record from Surepass verification. */
export function collectApiLockedFieldsFromDriver(driver: Driver): Set<DriverFieldLockKey> {
  const locks = new Set<DriverFieldLockKey>();
  if (!driver.is_verified) return locks;

  addIfPresent(locks, 'license_number', driver.license_number);
  addIfPresent(locks, 'name', driver.name);
  addIfPresent(locks, 'date_of_birth', driver.date_of_birth);
  addIfPresent(locks, 'license_expires_at', driver.license_expires_at ?? driver.doe);
  addIfPresent(locks, 'address', driver.address);
  addIfPresent(locks, 'pincode', driver.pincode);
  addIfPresent(locks, 'gender', driver.gender);
  addIfPresent(locks, 'profile_image', driver.profile_image);
  addIfPresent(locks, 'vehicle_classes', driver.vehicle_classes);
  return locks;
}

/** Lock fields returned from a Surepass DL verify response (lookup or persist). */
export function collectApiLockedFieldsFromVerifyResult(
  result: DriverVerificationResponse,
): Set<DriverFieldLockKey> {
  const locks = new Set<DriverFieldLockKey>();
  addIfPresent(locks, 'license_number', result.license_number);
  addIfPresent(locks, 'name', result.full_name ?? result.name);
  addIfPresent(locks, 'date_of_birth', result.date_of_birth);
  addIfPresent(locks, 'license_expires_at', result.date_of_expiry ?? result.doe);
  addIfPresent(locks, 'address', result.address);
  addIfPresent(locks, 'pincode', result.pincode);
  addIfPresent(locks, 'gender', result.gender);
  addIfPresent(locks, 'profile_image', result.profile_image);
  addIfPresent(locks, 'vehicle_classes', result.vehicle_classes);

  const driver = result.driver;
  if (driver) {
    for (const key of collectApiLockedFieldsFromDriver(driver)) {
      locks.add(key);
    }
  }
  return locks;
}

export function mergeApiLockedFields(
  ...sources: Array<Set<DriverFieldLockKey> | Iterable<DriverFieldLockKey>>
): Set<DriverFieldLockKey> {
  const merged = new Set<DriverFieldLockKey>();
  for (const source of sources) {
    for (const key of source) merged.add(key);
  }
  return merged;
}

export function isDriverFieldLocked(
  locks: Set<DriverFieldLockKey>,
  key: DriverFieldLockKey,
): boolean {
  return locks.has(key);
}
