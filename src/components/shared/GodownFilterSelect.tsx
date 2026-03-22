import { useGodowns } from '../../hooks/useGodowns';

interface GodownFilterSelectProps {
  value: string | undefined;
  onChange: (godownId: string | undefined) => void;
  label?: string;
  showAllOption?: boolean;
  includeInactive?: boolean;
  className?: string;
}

/** Page-level godown filter — not a global app selector */
export function GodownFilterSelect({
  value,
  onChange,
  label = 'Godown',
  showAllOption = true,
  includeInactive = true,
  className = '',
}: GodownFilterSelectProps) {
  const { godowns, loading } = useGodowns(includeInactive);

  return (
    <div className={`min-w-[180px] ${className}`}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <select
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={loading}
      >
        {showAllOption && <option value="">All godowns</option>}
        {godowns.map((g) => (
          <option key={g.id} value={g.id} disabled={!g.is_active}>
            {g.name}
            {!g.is_active ? ' (inactive)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
