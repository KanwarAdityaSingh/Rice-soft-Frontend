import type { CreateDriverRequest, Driver } from '../../../types/entities';
import {
  driverProfileImageSrc,
  formatDriverGender,
  hasDriverProfileData,
  normalizeVehicleClasses,
  resolveDriverLicenseExpiry,
} from '../../../utils/driverProfile';
import { DRIVER_LOCKED_INPUT_CLASS, type DriverFieldLockKey } from '../../../utils/driverAutofillLocks';
import { DriverVehicleClassBadges } from './DriverVehicleClassBadges';

interface DriverProfileSectionProps {
  loadedDriver: Driver | null;
  formData: CreateDriverRequest;
  lockedClass: (key: DriverFieldLockKey) => string;
}

export function DriverProfileSection({ loadedDriver, formData, lockedClass }: DriverProfileSectionProps) {
  const profile = {
    name: loadedDriver?.name ?? formData.name,
    address: loadedDriver?.address ?? formData.address,
    pincode: loadedDriver?.pincode ?? formData.pincode,
    gender: loadedDriver?.gender ?? formData.gender,
    date_of_birth: loadedDriver?.date_of_birth ?? formData.date_of_birth,
    license_expires_at:
      resolveDriverLicenseExpiry(loadedDriver ?? {}) ??
      formData.license_expires_at ??
      null,
    profile_image: loadedDriver?.profile_image ?? formData.profile_image,
    vehicle_classes: loadedDriver?.vehicle_classes ?? formData.vehicle_classes,
  };

  if (!hasDriverProfileData(profile)) return null;

  const avatarSrc = driverProfileImageSrc(profile.profile_image);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
      <p className="text-sm font-medium">Licence profile (from Surepass)</p>

      <div className="flex items-start gap-3">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={profile.name ? `${profile.name} licence photo` : 'Driver licence photo'}
            className="h-16 w-16 rounded-lg object-cover border border-border shrink-0"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg border border-dashed border-border bg-background shrink-0" />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          {normalizeVehicleClasses(profile.vehicle_classes).length > 0 && (
            <DriverVehicleClassBadges classes={profile.vehicle_classes} />
          )}
          {profile.gender && (
            <p className="text-xs text-muted-foreground">
              Gender: <span className="text-foreground">{formatDriverGender(profile.gender)}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {profile.date_of_birth && (
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Date of birth</label>
            <input
              type="text"
              className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${lockedClass('date_of_birth') || DRIVER_LOCKED_INPUT_CLASS}`}
              value={profile.date_of_birth}
              disabled
              readOnly
            />
          </div>
        )}
        {profile.license_expires_at && (
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Licence expires</label>
            <input
              type="text"
              className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${lockedClass('license_expires_at') || DRIVER_LOCKED_INPUT_CLASS}`}
              value={profile.license_expires_at}
              disabled
              readOnly
            />
          </div>
        )}
        {profile.pincode && (
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Pincode</label>
            <input
              type="text"
              className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${lockedClass('pincode') || DRIVER_LOCKED_INPUT_CLASS}`}
              value={profile.pincode}
              disabled
              readOnly
            />
          </div>
        )}
      </div>

      {profile.address && (
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Address</label>
          <textarea
            className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[72px] resize-none ${lockedClass('address') || DRIVER_LOCKED_INPUT_CLASS}`}
            value={profile.address}
            disabled
            readOnly
          />
        </div>
      )}
    </div>
  );
}
