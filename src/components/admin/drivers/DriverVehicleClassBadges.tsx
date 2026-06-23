import { normalizeVehicleClasses } from '../../../utils/driverProfile';

interface DriverVehicleClassBadgesProps {
  classes?: string[] | null;
  className?: string;
}

export function DriverVehicleClassBadges({ classes, className = '' }: DriverVehicleClassBadgesProps) {
  const normalized = normalizeVehicleClasses(classes);
  if (normalized.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {normalized.map((code) => (
        <span
          key={code}
          className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
        >
          {code}
        </span>
      ))}
    </div>
  );
}
