import { PERMISSION_ACTIONS, PERMISSION_ENTITIES } from '../../../utils/permissions';
import type { PermissionsMap, PermissionsEntityKey, PermissionAction } from '../../../types/entities';
import { Users, UserCheck, UserCircle, Store, Sprout } from 'lucide-react';

interface PermissionsTableSimpleProps {
  value: PermissionsMap;
  onChange: (next: PermissionsMap) => void;
}

export function PermissionsTableSimple({ value, onChange }: PermissionsTableSimpleProps) {
  const toggle = (entity: PermissionsEntityKey, action: PermissionAction) => {
    const current = value[entity]?.[action] === true;
    onChange({
      ...value,
      [entity]: {
        create: false,
        read: false,
        update: false,
        delete: false,
        ...(value[entity] || {}),
        [action]: !current,
      },
    });
  };

  const entityIcon = (entity: PermissionsEntityKey) => {
    switch (entity) {
      case 'salesman':
        return UserCheck;
      case 'broker':
        return UserCircle;
      case 'vendor':
        return Store;
      case 'leads':
        return Users;
      case 'riceCode':
        return Sprout;
      default:
        return Users;
    }
  };

  return (
    <div className="overflow-x-auto relative z-50 pointer-events-auto">
      {/* Legend */}
      <div className="flex items-center justify-end gap-3 mb-3 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 bg-primary/10 text-primary">Allowed</span>
        <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 bg-muted text-muted-foreground">Denied</span>
      </div>

      <table className="w-full overflow-hidden rounded-xl border border-border/60">
        <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <tr className="border-b border-border/60">
            <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">Entity</th>
            {PERMISSION_ACTIONS.map((action) => (
              <th key={action} className="text-center py-3 px-4 text-xs sm:text-sm font-semibold capitalize">
                {action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_ENTITIES.map((entity, idx) => {
            const Icon = entityIcon(entity);
            return (
              <tr key={entity} className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="py-3 px-4 text-sm font-medium capitalize">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted/70">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate">{entity}</span>
                  </div>
                </td>
              {PERMISSION_ACTIONS.map((action) => {
                const id = `${entity}-${action}-chk`;
                const checked = value[entity]?.[action] === true;
                return (
                  <td key={action} className="py-3 px-4">
                    <div className="flex items-center justify-center">
                      <input
                        id={id}
                        type="checkbox"
                        className="peer sr-only"
                        checked={checked}
                        onChange={() => toggle(entity, action)}
                      />
                      <label
                        htmlFor={id}
                        className={`select-none cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${checked ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border/60 hover:bg-muted/80'}`}
                      >
                        {checked ? 'Allowed' : 'Denied'}
                      </label>
                    </div>
                  </td>
                );
              })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


