import { Edit2, Trash2, MoreVertical } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { StatusBadge } from './StatusBadge';

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  isActive?: boolean;
}

export function ActionButtons({ onEdit, onDelete, onToggleStatus, isActive }: ActionButtonsProps) {
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
            {onEdit && (
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
                <span>{isActive ? 'Deactivate' : 'Activate'}</span>
              </DropdownMenu.Item>
            )}
            {onDelete && (
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

