import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function SortDropdown({ value, order, onChange }: { value: 'total_leads'|'conversion_rate'|'total_revenue'|'performance_score'; order: 'asc'|'desc'; onChange: (v: { value: 'total_leads'|'conversion_rate'|'total_revenue'|'performance_score'; order: 'asc'|'desc' }) => void; }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="btn-secondary">Sort</button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="glass min-w-[12rem] rounded-xl p-1 shadow-lg z-50" sideOffset={8}>
          {(['performance_score','total_revenue','conversion_rate','total_leads'] as const).map((k) => (
            <DropdownMenu.Item key={k} className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground" onSelect={() => onChange({ value: k, order })}>
              <span className="capitalize">{k.replace('_',' ')}</span>
              {value === k && <span className="text-xs text-muted-foreground">selected</span>}
            </DropdownMenu.Item>
          ))}
          <div className="border-t border-border/60 my-1" />
          <DropdownMenu.Item className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground" onSelect={() => onChange({ value, order: order==='asc'?'desc':'asc' })}>
            Toggle order ({order})
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}


