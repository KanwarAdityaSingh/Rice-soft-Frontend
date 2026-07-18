import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  Boxes,
  CalendarDays,
  Hourglass,
  IndianRupee,
  Package,
  PackageCheck,
  Sparkles,
  Ruler,
  Scale,
  Tag,
  UserRound,
  Weight,
  Wheat,
} from 'lucide-react';

interface SaudaDetailRowProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}

function SaudaDetailRow({ icon: Icon, label, value, valueClassName }: SaudaDetailRowProps) {
  return (
    <div className="relative flex items-center gap-3 border-b border-primary/10 px-3 py-2.5 last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-inner">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <span className="min-w-0 flex-1 text-sm text-muted-foreground">{label}</span>
      <span
        className={`max-w-[55%] truncate text-right text-sm font-semibold tabular-nums ${valueClassName ?? 'text-foreground'}`}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </span>
      <div
        className="pointer-events-none absolute bottom-2 right-0 top-2 w-[3px] rounded-full bg-primary/50"
        aria-hidden
      />
    </div>
  );
}

export interface SaudaCardProps {
  partyName: string;
  saudaDate: string;
  riceCategoryLabel: string;
  riceTypeLabel: string;
  riceCodeName: string;
  riceLengthLabel: string | null;
  whitenessLabel: string | null;
  avgGrainLengthLabel: string | null;
  weightLabel: string;
  noOfBags: number | null;
  bagWeightLabel: string | null;
  rateLabel: string;
  saudaTypeLabel: string;
  brokerName: string;
  receivedLabel: string;
  pendingLabel: string;
  actions: ReactNode;
}

export function SaudaCard({
  partyName,
  saudaDate,
  riceCategoryLabel,
  riceTypeLabel,
  riceCodeName,
  riceLengthLabel,
  whitenessLabel,
  avgGrainLengthLabel,
  weightLabel,
  noOfBags,
  bagWeightLabel,
  rateLabel,
  saudaTypeLabel,
  brokerName,
  receivedLabel,
  pendingLabel,
  actions,
}: SaudaCardProps) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.08] shadow-md shadow-primary/5 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="border-b border-primary/10 bg-primary/[0.06] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner ring-1 ring-primary/25">
              <Package className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold leading-tight text-foreground sm:text-base">
                {partyName || '—'}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-primary/80">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>{saudaDate}</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
        </div>
      </div>

      <div className="p-3">
        <div className="overflow-hidden rounded-xl border border-primary/15 bg-background/50 shadow-inner backdrop-blur-sm">
          {riceCategoryLabel && (
            <SaudaDetailRow icon={Wheat} label="Category" value={riceCategoryLabel} />
          )}
          <SaudaDetailRow icon={Tag} label="Rice Code" value={riceCodeName || '—'} />
          <SaudaDetailRow icon={Wheat} label="Rice Type" value={riceTypeLabel || '—'} />
          {riceLengthLabel && (
            <SaudaDetailRow icon={Ruler} label="Rice Length" value={riceLengthLabel} />
          )}
          {whitenessLabel && (
            <SaudaDetailRow icon={Sparkles} label="Whiteness (W)" value={whitenessLabel} />
          )}
          {avgGrainLengthLabel && (
            <SaudaDetailRow icon={Ruler} label="Avg Grain Length (mm)" value={avgGrainLengthLabel} />
          )}
          <SaudaDetailRow icon={Weight} label="Weight" value={weightLabel} />
          {noOfBags != null && (
            <SaudaDetailRow
              icon={Boxes}
              label="No. of Bags"
              value={noOfBags.toLocaleString('en-IN')}
            />
          )}
          {bagWeightLabel && (
            <SaudaDetailRow icon={Scale} label="Bag Weight" value={bagWeightLabel} />
          )}
          <SaudaDetailRow
            icon={IndianRupee}
            label="Rate"
            value={rateLabel}
            valueClassName="text-emerald-500"
          />
          <SaudaDetailRow
            icon={ArrowLeftRight}
            label="Ex / FOR"
            value={saudaTypeLabel}
            valueClassName="text-emerald-500"
          />
          <SaudaDetailRow icon={UserRound} label="Broker" value={brokerName || '—'} />
          <SaudaDetailRow icon={PackageCheck} label="Received" value={receivedLabel} />
          <SaudaDetailRow icon={Hourglass} label="Pending" value={pendingLabel} />
        </div>
      </div>
    </article>
  );
}
