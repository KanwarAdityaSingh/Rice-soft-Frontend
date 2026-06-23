import { AlertTriangle } from 'lucide-react';
import type { PaymentAdvice, PaymentAdvicePreviewResponse } from '../../../types/entities';
import {
  formatMismatchDelta,
  formatMismatchValue,
  getPaymentAdviceStoredPreviewMismatches,
} from '../../../utils/paymentAdviceMismatch';

interface PaymentAdviceStoredMismatchPanelProps {
  stored: PaymentAdvice | null | undefined;
  preview: PaymentAdvicePreviewResponse | null | undefined;
  /** Shown in edit form; view dialog uses a shorter note. */
  variant?: 'form' | 'view';
}

export function PaymentAdviceStoredMismatchPanel({
  stored,
  preview,
  variant = 'form',
}: PaymentAdviceStoredMismatchPanelProps) {
  const mismatches = getPaymentAdviceStoredPreviewMismatches(stored, preview);
  if (mismatches.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-2">
      <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Stored record differs from recalculated preview</p>
          <p className="text-[11px] text-amber-900/80 dark:text-amber-100/80 mt-0.5 leading-snug">
            {variant === 'form'
              ? 'The document below uses recalculated (preview) values. Saving will send preview amounts to the server.'
              : 'The document below uses recalculated (preview) values. Stored DB values are shown for comparison.'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-amber-500/20 bg-background/60">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-amber-500/20 text-muted-foreground">
              <th className="text-left font-medium px-2 py-1.5">Field</th>
              <th className="text-right font-medium px-2 py-1.5">Stored (DB)</th>
              <th className="text-right font-medium px-2 py-1.5">Recalculated</th>
              <th className="text-right font-medium px-2 py-1.5">Δ</th>
            </tr>
          </thead>
          <tbody>
            {mismatches.map((row) => (
              <tr key={row.field} className="border-b border-border/40 last:border-0">
                <td className="px-2 py-1.5 font-medium">{row.label}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                  {formatMismatchValue(row.stored, row.format)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-foreground">
                  {formatMismatchValue(row.calculated, row.format)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-300">
                  {formatMismatchDelta(row.delta, row.format)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
