import { Minus, Plus } from 'lucide-react';

function parseIsoToLocalNoon(iso: string | undefined): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(`${iso.trim()}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** YYYY-MM-DD from a Date (local calendar day via noon anchor). */
export function toIsoDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Add calendar days; empty `current` starts from today. Result clamped to min/max when provided. */
export function shiftIsoDate(
  current: string | undefined,
  deltaDays: number,
  min?: string,
  max?: string
): string {
  const base = parseIsoToLocalNoon(current) ?? (() => {
    const n = new Date();
    n.setHours(12, 0, 0, 0);
    return n;
  })();
  base.setDate(base.getDate() + deltaDays);
  let next = toIsoDateString(base);
  if (min && next < min) next = min;
  if (max && next > max) next = max;
  return next;
}

export interface DateInputWithSteppersProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Visual error border (e.g. validation failed) */
  invalid?: boolean;
  id?: string;
  name?: string;
  /** Outer wrapper (flex row) */
  className?: string;
  /** Passed to the native date input */
  inputClassName?: string;
}

/**
 * Native date input with − / + buttons to move one calendar day (common form pattern).
 */
export function DateInputWithSteppers({
  value,
  onChange,
  min,
  max,
  disabled = false,
  readOnly = false,
  required,
  invalid = false,
  id,
  name,
  className = '',
  inputClassName = '',
}: DateInputWithSteppersProps) {
  const v = value ?? '';
  const atMin = min != null && v !== '' && v <= min;
  const atMax = max != null && v !== '' && v >= max;
  const stepDisabled = disabled || readOnly;

  const step = (delta: number) => {
    if (stepDisabled) return;
    onChange(shiftIsoDate(v || undefined, delta, min, max));
  };

  return (
    <div
      className={`flex items-stretch rounded-lg border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring/30 ${
        invalid ? 'border-destructive' : 'border-border'
      } ${className}`}
    >
      <button
        type="button"
        tabIndex={-1}
        disabled={stepDisabled || (v !== '' && atMin)}
        onClick={() => step(-1)}
        className="shrink-0 px-2 flex items-center justify-center border-r border-border bg-muted/30 hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none text-muted-foreground"
        aria-label="Previous day"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        id={id}
        name={name}
        type="date"
        required={required}
        value={v}
        min={min}
        max={max}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 min-w-0 border-0 bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-0 ${inputClassName}`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={stepDisabled || (v !== '' && atMax)}
        onClick={() => step(1)}
        className="shrink-0 px-2 flex items-center justify-center border-l border-border bg-muted/30 hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none text-muted-foreground"
        aria-label="Next day"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
