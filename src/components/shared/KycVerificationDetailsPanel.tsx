import { Shield } from 'lucide-react';
import type { KycVerificationEntry } from '../../utils/kycVerification';
import { formatKycVerifiedAt } from '../../utils/kycVerification';

interface KycVerificationDetailsPanelProps {
  entries: KycVerificationEntry[];
  title?: string;
  emptyMessage?: string;
}

export function KycVerificationDetailsPanel({
  entries,
  title = 'Stored Surepass verifications',
  emptyMessage = 'No Surepass snapshots saved on this record yet. Run a lookup or verify action in edit mode to persist the full API response.',
}: KycVerificationDetailsPanelProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">({entries.length})</span>
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <details key={entry.key} className="rounded-lg border border-border bg-background/80">
            <summary className="cursor-pointer px-3 py-2 text-sm flex items-center justify-between gap-2">
              <span className="font-medium">{entry.label}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatKycVerifiedAt(entry.verified_at)}
              </span>
            </summary>
            <div className="border-t border-border px-3 py-2 space-y-2">
              {entry.snapshot.mapped !== undefined && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Mapped fields</p>
                  <pre className="text-[11px] leading-relaxed overflow-x-auto rounded bg-muted/40 p-2 max-h-40">
                    {JSON.stringify(entry.snapshot.mapped, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Full Surepass response</p>
                <pre className="text-[11px] leading-relaxed overflow-x-auto rounded bg-muted/40 p-2 max-h-56">
                  {JSON.stringify(entry.snapshot.raw, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
