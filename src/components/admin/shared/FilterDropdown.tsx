import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Filter } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
          <Filter className="h-4 w-4" />
          <span>{label}</span>
          {value && <span className="text-xs text-muted-foreground">({value})</span>}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="glass min-w-[10rem] rounded-xl p-1 shadow-lg z-50"
          sideOffset={8}
          align="start"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            onSelect={() => onChange(undefined)}
          >
            All
          </DropdownMenu.Item>
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              className="flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onSelect={() => onChange(option.value)}
            >
              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
