import { PERMISSION_ACTIONS, PERMISSION_ENTITIES } from '../../../utils/permissions';
import type { PermissionsMap, PermissionsEntityKey, PermissionAction } from '../../../types/entities';

interface PermissionsTableProps {
  value: PermissionsMap;
  onChange: (next: PermissionsMap) => void;
}

export function PermissionsTable({ value, onChange }: PermissionsTableProps) {
  const setCell = (entity: PermissionsEntityKey, action: PermissionAction, allowed: boolean) => {
    onChange({
      ...value,
      [entity]: {
        create: false,
        read: false,
        update: false,
        delete: false,
        ...(value[entity] || {}),
        [action]: allowed,
      },
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/60">
            <th className="text-left py-3 px-4 text-sm font-semibold">Entity</th>
            {PERMISSION_ACTIONS.map((action) => (
              <th key={action} className="text-center py-3 px-4 text-sm font-semibold capitalize">
                {action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_ENTITIES.map((entity) => (
            <tr key={entity} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
              <td className="py-3 px-4 text-sm font-medium capitalize">{entity}</td>
              {PERMISSION_ACTIONS.map((action) => (
                <td key={action} className="py-3 px-4 pointer-events-auto">
                  <div 
                    className="flex items-center justify-center gap-4"
                    role="group"
                    onClick={() => setCell(entity, action, !(value[entity]?.[action] === true))}
                  >
                    {(() => {
                      const allowId = `${entity}-${action}-allow`;
                      const denyId = `${entity}-${action}-deny`;
                      return (
                        <>
                          <div className="inline-flex items-center gap-2 text-xs">
                            <input
                              id={allowId}
                              type="radio"
                              name={`${entity}-${action}`}
                              className="accent-primary cursor-pointer pointer-events-auto"
                              checked={value[entity]?.[action] === true}
                              onChange={() => setCell(entity, action, true)}
                            />
                            <label htmlFor={allowId} className="cursor-pointer pointer-events-auto">Allow</label>
                          </div>
                          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                              id={denyId}
                              type="radio"
                              name={`${entity}-${action}`}
                              className="accent-muted-foreground cursor-pointer pointer-events-auto"
                              checked={value[entity]?.[action] !== true}
                              onChange={() => setCell(entity, action, false)}
                            />
                            <label htmlFor={denyId} className="cursor-pointer pointer-events-auto">Deny</label>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


