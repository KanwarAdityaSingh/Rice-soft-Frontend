import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function DateRangeFilter({ onPreset, onCustom }: { onPreset: (p: 'this_month'|'this_quarter'|'this_year'|'last_7'|'last_30'|'last_90'|'all_time') => void; onCustom?: (start?: string|null, end?: string|null) => void; }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="btn-secondary">Date Range</button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="glass min-w-[12rem] rounded-xl p-1 shadow-lg z-50" sideOffset={8}>
          {(['this_month','this_quarter','this_year','last_7','last_30','last_90','all_time'] as const).map((p) => (
            <DropdownMenu.Item key={p} className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground" onSelect={() => onPreset(p)}>
              {label(p)}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function label(preset: string) {
  switch (preset) {
    case 'this_month': return 'This Month';
    case 'this_quarter': return 'This Quarter';
    case 'this_year': return 'This Year';
    case 'last_7': return 'Last 7 Days';
    case 'last_30': return 'Last 30 Days';
    case 'last_90': return 'Last 90 Days';
    case 'all_time': return 'All Time';
    default: return preset;
  }
}


