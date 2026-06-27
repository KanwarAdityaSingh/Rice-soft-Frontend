import type { CreateDriverRequest, Driver } from '../../../types/entities';
import { formatIsoDateAsDdMmYyyy } from '../../../utils/dateFormatting';
import {
  driverProfileImageSrc,
  formatDriverExpiryDate,
  formatDriverGender,
  hasDriverProfileData,
  normalizeVehicleClasses,
  resolveDriverCityName,
  resolveDriverRegularLicenseExpiry,
  resolveDriverStateName,
  resolveDriverTransportLicenseExpiry,
} from '../../../utils/driverProfile';
import { DRIVER_LOCKED_INPUT_CLASS, type DriverFieldLockKey } from '../../../utils/driverAutofillLocks';
import { DriverVehicleClassBadges } from './DriverVehicleClassBadges';

interface DriverProfileSectionProps {
  loadedDriver: Driver | null;
  formData: CreateDriverRequest;
  lockedClass: (key: DriverFieldLockKey) => string;
}

export function DriverProfileSection({ loadedDriver, formData, lockedClass }: DriverProfileSectionProps) {
  const profileSource = loadedDriver ?? formData;
  const profile = {
    name: loadedDriver?.name ?? formData.name,
    address: loadedDriver?.address ?? formData.address,
    pincode: loadedDriver?.pincode ?? formData.pincode,
    gender: loadedDriver?.gender ?? formData.gender,
    date_of_birth: loadedDriver?.date_of_birth ?? formData.date_of_birth,
    license_expires_at: resolveDriverRegularLicenseExpiry(profileSource),
    transport_license_expires_at: resolveDriverTransportLicenseExpiry(profileSource),
    father_or_husband_name: loadedDriver?.father_or_husband_name ?? formData.father_or_husband_name,
    state: loadedDriver?.state ?? formData.state,
    city_name: loadedDriver?.city_name ?? formData.city_name,
    profile_image: loadedDriver?.profile_image ?? formData.profile_image,
    vehicle_classes: loadedDriver?.vehicle_classes ?? formData.vehicle_classes,
  };

  if (!hasDriverProfileData(profile)) return null;

  const avatarSrc = driverProfileImageSrc(profile.profile_image);
  const cityName = resolveDriverCityName(profileSource);
  const stateName = resolveDriverStateName(profileSource);

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
        {profile.father_or_husband_name && (
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Father / husband name</label>
            <input
              type="text"
              className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${DRIVER_LOCKED_INPUT_CLASS}`}
              value={profile.father_or_husband_name}
              disabled
              readOnly
            />
          </div>
        )}
        {profile.date_of_birth && (
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Date of birth</label>
            <input
              type="text"
              className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${lockedClass('date_of_birth') || DRIVER_LOCKED_INPUT_CLASS}`}
              value={formatIsoDateAsDdMmYyyy(profile.date_of_birth)}
              disabled
              readOnly
            />
          </div>
        )}
        {profile.license_expires_at && (
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Licence expires (DOE)</label>
            <input
              type="text"
              className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${lockedClass('license_expires_at') || DRIVER_LOCKED_INPUT_CLASS}`}
              value={formatDriverExpiryDate(profile.license_expires_at)}
              disabled
              readOnly
            />
          </div>
        )}
        {profile.transport_license_expires_at && (
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Transport expires (DOE)</label>
            <input
              type="text"
              className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${DRIVER_LOCKED_INPUT_CLASS}`}
              value={formatDriverExpiryDate(profile.transport_license_expires_at)}
              disabled
              readOnly
            />
          </div>
        )}
        {cityName && (
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">City</label>
            <input
              type="text"
              className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${DRIVER_LOCKED_INPUT_CLASS}`}
              value={cityName}
              disabled
              readOnly
            />
          </div>
        )}
        {stateName && (
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">State</label>
            <input
              type="text"
              className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${DRIVER_LOCKED_INPUT_CLASS}`}
              value={stateName}
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
