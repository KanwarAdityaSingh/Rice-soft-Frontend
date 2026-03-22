import { Receipt } from 'lucide-react';
import type { EmptyBagReceiptSnapshot } from '../../../utils/empty-bag-cost';
import {
  EMPTY_BAG_SNAPSHOT_FIELDS,
  formatEmptyBagSnapshotValue,
} from '../../../utils/empty-bag-cost';

type SnapshotValues = Partial<
  Record<keyof EmptyBagReceiptSnapshot, number | string | null | undefined>
>;

interface EmptyBagSnapshotDisplayProps {
  title: string;
  /** When set, shows a small receipt icon next to the title */
  variant?: 'default' | 'preview';
  values: SnapshotValues;
}

export function EmptyBagSnapshotDisplay({
  title,
  variant = 'default',
  values,
}: EmptyBagSnapshotDisplayProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/35 px-3 py-3 text-sm space-y-3">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        {variant === 'preview' && <Receipt className="h-3.5 w-3.5 shrink-0" />}
        {title}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {EMPTY_BAG_SNAPSHOT_FIELDS.map(({ apiKey, hint }) => (
          <div
            key={apiKey}
            className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-2 space-y-1"
          >
            <div className="font-mono text-[10px] leading-tight text-foreground break-all">{apiKey}</div>
            <p className="text-[10px] leading-snug text-muted-foreground">{hint}</p>
            <div className="font-mono text-sm font-medium tabular-nums text-foreground pt-0.5">
              {formatEmptyBagSnapshotValue(apiKey, values[apiKey])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
