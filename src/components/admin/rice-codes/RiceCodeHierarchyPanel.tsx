import { useEffect, useMemo, useState } from 'react';
import { Eye, Package, X } from 'lucide-react';
import type { RiceCode, RiceLengthRecord, RiceType, Sauda } from '../../../types/entities';
import { getRiceTypeLabel } from '../../../utils/riceType';
import {
  filterSaudasByCategory,
  filterSaudasByRiceCode,
  filterSaudasByRiceLength,
  filterSaudasByRiceType,
  isUnsetRiceTypeKey,
} from '../../../utils/saudaRiceHierarchy';
import { getRiceCategoryLabel } from '../../../utils/riceCategory';
import { getCompletionStatus, formatCompletionPercentage, formatWeightDisplay } from '../../../utils/saudaCompletion';
import { getSaudaSerialNumber, formatSaudaIdShort } from '../../../utils/saudaSerial';
import { saudasAPI } from '../../../services/saudas.api';
import { SaudaWorkflowStatusBadge } from '../../purchases/saudas/SaudaWorkflowStatusBadge';
import { EmptyState } from '../shared/EmptyState';
import { LoadingSpinner } from '../shared/LoadingSpinner';

export interface RiceCodeHierarchySelection {
  riceCodeId: string;
  riceTypeKey: string;
  riceLengthKey: string;
}

interface RiceCodeHierarchyPanelProps {
  riceCode: RiceCode;
  riceCategoryKey: string;
  riceTypeKey: string;
  riceLengthKey: string;
  riceLengthLabel: string;
  allSaudas: Sauda[];
  riceCategories: RiceType[];
  riceTypes: RiceType[];
  riceLengths: RiceLengthRecord[];
  onPreview: (sauda: Sauda, serial: number | null) => void;
  onClose: () => void;
}

function formatTypeLabel(key: string, riceTypes: RiceType[]): string {
  return isUnsetRiceTypeKey(key) ? 'Unspecified type' : getRiceTypeLabel(key, riceTypes);
}

async function fetchSaudasForHierarchy(
  riceCodeId: string,
  riceCategoryKey: string,
  riceTypeKey: string,
  riceLengthKey: string,
  lengthCode?: string | null,
): Promise<Sauda[]> {
  const apiRiceType = isUnsetRiceTypeKey(riceTypeKey) ? undefined : riceTypeKey;
  try {
    const data = await saudasAPI.getAllSaudas({
      rice_code_id: riceCodeId,
      ...(apiRiceType ? { rice_type: apiRiceType } : {}),
    });
    return filterSaudasByRiceLength(
      filterSaudasByRiceType(
        filterSaudasByCategory(filterSaudasByRiceCode(data, riceCodeId), riceCategoryKey),
        riceTypeKey,
      ),
      riceLengthKey,
      lengthCode,
    );
  } catch {
    const data = await saudasAPI.getAllSaudas();
    return filterSaudasByRiceLength(
      filterSaudasByRiceType(
        filterSaudasByCategory(filterSaudasByRiceCode(data, riceCodeId), riceCategoryKey),
        riceTypeKey,
      ),
      riceLengthKey,
      lengthCode,
    );
  }
}

export function RiceCodeHierarchyPanel({
  riceCode,
  riceCategoryKey,
  riceTypeKey,
  riceLengthKey,
  riceLengthLabel,
  allSaudas,
  riceCategories,
  riceTypes,
  riceLengths,
  onPreview,
  onClose,
}: RiceCodeHierarchyPanelProps) {
  const riceCodeId = riceCode.rice_code_id;
  const riceCodeName = riceCode.rice_code_name.trim();
  const riceTypeLabel = formatTypeLabel(riceTypeKey, riceTypes);
  const riceCategoryLabel = getRiceCategoryLabel(riceCategoryKey, riceCategories);
  const lengthRecord = riceLengths.find((row) => row.id === riceLengthKey);

  const [loading, setLoading] = useState(true);
  const [lengthSaudas, setLengthSaudas] = useState<Sauda[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const data = await fetchSaudasForHierarchy(
          riceCodeId,
          riceCategoryKey,
          riceTypeKey,
          riceLengthKey,
          lengthRecord?.code,
        );
        if (!cancelled) setLengthSaudas(data);
      } catch {
        if (!cancelled) {
          setFetchError('Failed to load saudas.');
          setLengthSaudas([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [riceCodeId, riceCategoryKey, riceTypeKey, riceLengthKey, lengthRecord?.code]);

  const totalQty = useMemo(
    () => lengthSaudas.reduce((sum, sauda) => sum + (sauda.quantity ?? 0), 0),
    [lengthSaudas],
  );

  return (
    <div className="rounded-2xl border border-primary/30 bg-muted/15 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saudas</p>
          <h3 className="text-base font-semibold truncate mt-1">
            {riceCategoryLabel} · {riceCodeName} · {riceTypeLabel} · {riceLengthLabel}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            {lengthSaudas.length} sauda{lengthSaudas.length === 1 ? '' : 's'} · {Math.round(totalQty)} kg
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-lg border border-border p-2 hover:bg-muted/60 transition-colors shrink-0"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : lengthSaudas.length === 0 ? (
        <EmptyState icon={Package} title="No saudas" description="No saudas for this rice length." />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground bg-muted/25">
                  <th className="py-2.5 px-4 sm:px-5 font-medium w-14">S.No.</th>
                  <th className="py-2.5 px-4 font-medium w-24">Type</th>
                  <th className="py-2.5 px-4 font-medium w-24">Rate</th>
                  <th className="py-2.5 px-4 font-medium w-32">Progress</th>
                  <th className="py-2.5 px-4 font-medium w-28">Status</th>
                  <th className="py-2.5 px-4 sm:px-5 font-medium w-16 text-right" />
                </tr>
              </thead>
              <tbody>
                {lengthSaudas.map((sauda) => {
                  const serial = getSaudaSerialNumber(sauda.id, allSaudas);
                  const completion = sauda.completion_percentage;
                  const completionStyle =
                    completion != null ? getCompletionStatus(completion) : null;

                  return (
                    <tr
                      key={sauda.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 px-4 sm:px-5 text-sm tabular-nums text-muted-foreground">
                        <div>{serial ?? '—'}</div>
                        <div className="text-[11px] truncate">{formatSaudaIdShort(sauda.id)}</div>
                      </td>
                      <td className="py-3 px-4 text-xs uppercase text-muted-foreground">
                        {sauda.sauda_type}
                      </td>
                      <td className="py-3 px-4 text-sm whitespace-nowrap">
                        ₹{(sauda.rate ?? 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {sauda.quantity != null ? (
                          <span className="block">
                            {formatWeightDisplay(sauda.received_until_now, sauda.quantity)}
                          </span>
                        ) : (
                          '—'
                        )}
                        {completionStyle && completion != null && (
                          <span
                            className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full ${completionStyle.bgColor} ${completionStyle.color}`}
                          >
                            {formatCompletionPercentage(completion)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <SaudaWorkflowStatusBadge status={sauda.status} />
                      </td>
                      <td className="py-3 px-4 sm:px-5 text-right">
                        <button
                          type="button"
                          onClick={() => onPreview(sauda, serial)}
                          className="inline-flex items-center justify-center rounded-lg border border-border p-2 hover:bg-muted/60 transition-colors"
                          title="Preview sauda"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
