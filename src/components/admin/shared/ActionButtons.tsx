import { Edit2, Trash2, MoreVertical, Key, ToggleLeft, ToggleRight, MapPin, MapPinned } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { StatusBadge } from './StatusBadge';
import type { PermissionsEntityKey } from '../../../types/entities';
import { canDelete, canUpdate, isAdmin, isCustomUser } from '../../../utils/permissions';

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  isActive?: boolean;
  permissionEntity?: PermissionsEntityKey;
  onPermissions?: () => void;
  /** Extra locations (vendor / sales party sites) */
  onAddSite?: () => void;
  onViewSites?: () => void;
}

export function ActionButtons({
  onEdit,
  onDelete,
  onToggleStatus,
  isActive,
  permissionEntity,
  onPermissions,
  onAddSite,
  onViewSites,
}: ActionButtonsProps) {
  const allowEdit = (() => {
    if (!onEdit) return false;
    if (!permissionEntity) return true;
    if (isAdmin()) return true;
    return isCustomUser() ? canUpdate(permissionEntity) : true;
  })();

  const allowDelete = (() => {
    if (!onDelete) return false;
    if (!permissionEntity) return true;
    if (isAdmin()) return true;
    return isCustomUser() ? canDelete(permissionEntity) : true;
  })();

  return (
    <div className="flex items-center gap-2">
      {onToggleStatus && <StatusBadge isActive={isActive ?? true} />}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="rounded-lg p-2 hover:bg-muted transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="glass min-w-[8rem] rounded-xl p-1 shadow-lg z-50"
            sideOffset={8}
            align="end"
          >
            {onPermissions && (
              <DropdownMenu.Item
                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onSelect={onPermissions}
              >
                <Key className="h-4 w-4" /> Permissions
              </DropdownMenu.Item>
            )}
            {allowEdit && onAddSite && (
              <DropdownMenu.Item
                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onSelect={onAddSite}
              >
                <MapPin className="h-4 w-4" /> Add site
              </DropdownMenu.Item>
            )}
            {allowEdit && onViewSites && (
              <DropdownMenu.Item
                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onSelect={onViewSites}
              >
                <MapPinned className="h-4 w-4" /> View sites
              </DropdownMenu.Item>
            )}
            {allowEdit && (
              <DropdownMenu.Item
                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onSelect={onEdit}
              >
                <Edit2 className="h-4 w-4" /> Edit
              </DropdownMenu.Item>
            )}
            {onToggleStatus && (
              <DropdownMenu.Item
                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onSelect={onToggleStatus}
              >
                {isActive ? (
                  <ToggleLeft className="h-4 w-4" />
                ) : (
                  <ToggleRight className="h-4 w-4" />
                )}
                <span>{isActive ? 'Deactivate' : 'Activate'}</span>
              </DropdownMenu.Item>
            )}
            {allowDelete && (
              <DropdownMenu.Item
                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onSelect={onDelete}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

