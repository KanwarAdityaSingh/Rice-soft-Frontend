import { useEffect, useRef, useState } from 'react';
import { Eye, Package, X } from 'lucide-react';
import { useVendors } from '../../../hooks/useVendors';
import { vendorsAPI } from '../../../services/vendors.api';
import { inventoryAPI } from '../../../services/inventory.api';
import { lotsAPI } from '../../../services/lots.api';
import type { Lot, PurchaseSummaryLotDetail, RiceCode, RiceLengthRecord, RiceType, Sauda } from '../../../types/entities';
import { getRiceTypeLabel } from '../../../utils/riceType';
import {
  filterSaudasByCategory,
  filterSaudasByRiceCode,
  filterSaudasByRiceLength,
  filterSaudasByRiceType,
  isUnsetRiceTypeKey,
} from '../../../utils/saudaRiceHierarchy';
import { getRiceCategoryLabel } from '../../../utils/riceCategory';
import { formatKgQuantity } from '../../../utils/saudaCompletion';
import { getSaudaPurchaserName } from '../../../utils/saudaDisplay';
import { getSaudaSerialNumber } from '../../../utils/saudaSerial';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { purchaseSummaryAPI } from '../../../services/purchaseSummary.api';
import { saudasAPI } from '../../../services/saudas.api';
import { getLotSerialNumberInFullPurchasesList } from '../../../utils/purchasesLotsDisplay';
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

function formatSaudaDate(sauda: Sauda): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (sauda.sauda_date) {
    return new Date(`${sauda.sauda_date}T00:00:00`).toLocaleDateString('en-IN', opts);
  }
  if (sauda.created_at) {
    return new Date(sauda.created_at).toLocaleDateString('en-IN', opts);
  }
  return '—';
}

function mergeById<T extends { id: string }>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(row.id, row);
  }
  return [...map.values()];
}

function parseQty(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface SaudaLotStock {
  lotSerialNumbers: number[];
  receivedWeight: number;
  availableWeight: number;
  usedSoldWeight: number;
  receivedBags: number;
  availableBags: number;
  usedSoldBags: number;
}

function aggregateSaudaLotStock(
  lots: PurchaseSummaryLotDetail[],
  availableByLotId: Record<string, number>,
  allLots: Lot[],
): SaudaLotStock {
  let receivedWeight = 0;
  let availableWeight = 0;
  let receivedBags = 0;

  for (const lot of lots) {
    const received = parseQty(lot.received_weight);
    const available = availableByLotId[lot.id] ?? 0;
    receivedWeight += received;
    availableWeight += available;
    receivedBags += parseQty(lot.no_of_bags);
  }

  const usedSoldWeight = Math.max(0, receivedWeight - availableWeight);
  let usedSoldBags = 0;
  let availableBags = 0;

  if (receivedBags > 0 && receivedWeight > 0) {
    usedSoldBags = Math.min(
      receivedBags,
      Math.round((receivedBags * usedSoldWeight) / receivedWeight),
    );
    availableBags = Math.max(0, receivedBags - usedSoldBags);
  }

  return {
    lotSerialNumbers: lots
      .map((lot) => getLotSerialNumberInFullPurchasesList(allLots, lot.id))
      .filter((serial): serial is number => serial != null)
      .sort((a, b) => a - b),
    receivedWeight,
    availableWeight,
    usedSoldWeight,
    receivedBags,
    availableBags,
    usedSoldBags,
  };
}

const EMPTY_SAUDA_LOT_STOCK: SaudaLotStock = {
  lotSerialNumbers: [],
  receivedWeight: 0,
  availableWeight: 0,
  usedSoldWeight: 0,
  receivedBags: 0,
  availableBags: 0,
  usedSoldBags: 0,
};

async function fetchSaudaLotStockBySaudaId(
  saudaIds: string[],
): Promise<Record<string, SaudaLotStock>> {
  if (saudaIds.length === 0) return {};

  const [inwardSlipPasses, lotsInventory, allLots] = await Promise.all([
    inwardSlipPassesAPI.getAllInwardSlipPasses(),
    inventoryAPI.getLots().catch(() => []),
    lotsAPI.getAllLots().catch(() => []),
  ]);

  const availableByLotId: Record<string, number> = {};
  for (const row of lotsInventory) {
    availableByLotId[row.lot_id] = parseQty(row.available_quantity);
  }

  const pairs: { saudaId: string; ispId: string }[] = [];
  for (const saudaId of saudaIds) {
    for (const isp of inwardSlipPasses) {
      if (isp.sauda_ids?.includes(saudaId)) {
        pairs.push({ saudaId, ispId: isp.id });
      }
    }
  }

  const detailResults = await Promise.all(
    pairs.map(({ saudaId, ispId }) =>
      purchaseSummaryAPI.getKaantaPurchaseIspDetail(saudaId, ispId).catch(() => null),
    ),
  );

  const lotsBySaudaId = new Map<string, Map<string, PurchaseSummaryLotDetail>>();

  pairs.forEach(({ saudaId }, index) => {
    const detail = detailResults[index];
    if (!detail?.lots?.length) return;

    const lotMap = lotsBySaudaId.get(saudaId) ?? new Map<string, PurchaseSummaryLotDetail>();
    for (const lot of mergeById(detail.lots)) {
      lotMap.set(lot.id, lot);
    }
    lotsBySaudaId.set(saudaId, lotMap);
  });

  const result: Record<string, SaudaLotStock> = {};
  for (const saudaId of saudaIds) {
    const lots = [...(lotsBySaudaId.get(saudaId)?.values() ?? [])];
    result[saudaId] =
      lots.length > 0
        ? aggregateSaudaLotStock(lots, availableByLotId, allLots)
        : { ...EMPTY_SAUDA_LOT_STOCK };
  }
  return result;
}

interface StockBreakdownCellProps {
  loading: boolean;
  hasLots: boolean;
  received: number;
  usedSold: number;
  available: number;
  formatValue: (value: number) => string;
}

function StockBreakdownCell({
  loading,
  hasLots,
  received,
  usedSold,
  available,
  formatValue,
}: StockBreakdownCellProps) {
  if (loading) {
    return <span className="text-muted-foreground text-xs">…</span>;
  }

  if (!hasLots) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="min-w-[8.5rem] space-y-0.5 text-[11px] leading-snug tabular-nums">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground shrink-0">Received</span>
        <span>{formatValue(received)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground shrink-0">Used/Sold</span>
        <span>{formatValue(usedSold)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground shrink-0">Available</span>
        <span>{formatValue(available)}</span>
      </div>
    </div>
  );
}

async function fetchSaudasForHierarchy(
  riceCodeId: string,
  riceCategoryKey: string,
  riceTypeKey: string,
  riceLengthKey: string,
  lengthName?: string | null,
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
      lengthName,
    );
  } catch {
    const data = await saudasAPI.getAllSaudas();
    return filterSaudasByRiceLength(
      filterSaudasByRiceType(
        filterSaudasByCategory(filterSaudasByRiceCode(data, riceCodeId), riceCategoryKey),
        riceTypeKey,
      ),
      riceLengthKey,
      lengthName,
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

  const { vendors } = useVendors({ includeInactive: true });
  const [vendorNameById, setVendorNameById] = useState<Record<string, string>>({});
  const fetchedVendorIdsRef = useRef(new Set<string>());

  const [loading, setLoading] = useState(true);
  const [lengthSaudas, setLengthSaudas] = useState<Sauda[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saudaLotStockBySaudaId, setSaudaLotStockBySaudaId] = useState<
    Record<string, SaudaLotStock>
  >({});
  const [lotsLoading, setLotsLoading] = useState(false);

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
          lengthRecord?.name,
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
  }, [riceCodeId, riceCategoryKey, riceTypeKey, riceLengthKey, lengthRecord?.name]);

  useEffect(() => {
    let cancelled = false;

    const loadMissingVendorNames = async () => {
      const missingIds = [
        ...new Set(
          lengthSaudas
            .map((sauda) => sauda.purchaser_id)
            .filter((id): id is string => !!id)
            .filter(
              (id) =>
                !vendors.some((vendor) => vendor.id === id) &&
                !fetchedVendorIdsRef.current.has(id),
            ),
        ),
      ];

      for (const id of missingIds) fetchedVendorIdsRef.current.add(id);

      const rows = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const vendor = await vendorsAPI.getVendorById(id);
            return [id, vendor.business_name] as const;
          } catch {
            return [id, ''] as const;
          }
        }),
      );

      if (cancelled) return;

      setVendorNameById((prev) => {
        const next = { ...prev };
        for (const [id, name] of rows) {
          if (name && !next[id]) next[id] = name;
        }
        return next;
      });
    };

    if (lengthSaudas.length > 0) {
      void loadMissingVendorNames();
    }

    return () => {
      cancelled = true;
    };
  }, [lengthSaudas, vendors]);

  useEffect(() => {
    let cancelled = false;
    const saudaIds = lengthSaudas.map((sauda) => sauda.id);

    if (saudaIds.length === 0) {
      setSaudaLotStockBySaudaId({});
      setLotsLoading(false);
      return;
    }

    setLotsLoading(true);
    void fetchSaudaLotStockBySaudaId(saudaIds)
      .then((data) => {
        if (!cancelled) setSaudaLotStockBySaudaId(data);
      })
      .catch(() => {
        if (!cancelled) setSaudaLotStockBySaudaId({});
      })
      .finally(() => {
        if (!cancelled) setLotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lengthSaudas]);

  return (
    <div className="rounded-2xl border border-primary/30 bg-muted/15 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold truncate">
            {riceCategoryLabel} · {riceCodeName} · {riceTypeLabel} · {riceLengthLabel}
          </h3>
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
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground bg-muted/25">
                  <th className="py-2.5 px-4 font-medium w-28">Purchase Date</th>
                  <th className="py-2.5 px-4 font-medium min-w-[10rem]">Party Name</th>
                  <th className="py-2.5 px-4 font-medium w-20">Lot S.No.</th>
                  <th className="py-2.5 px-4 font-medium w-24">Rate</th>
                  <th className="py-2.5 px-4 font-medium min-w-[9rem]">Weight (kg)</th>
                  <th className="py-2.5 px-4 font-medium min-w-[9rem]">Bags</th>
                  <th className="py-2.5 px-4 sm:px-5 font-medium w-16 text-right" />
                </tr>
              </thead>
              <tbody>
                {lengthSaudas.map((sauda) => {
                  const serial = getSaudaSerialNumber(sauda.id, allSaudas);
                  const partyName = getSaudaPurchaserName(sauda, vendors, vendorNameById);
                  const lotStock = saudaLotStockBySaudaId[sauda.id] ?? EMPTY_SAUDA_LOT_STOCK;
                  const hasLots = lotStock.lotSerialNumbers.length > 0;
                  const lotLabel = lotStock.lotSerialNumbers.join(', ');
                  const formatWeight = (value: number) => formatKgQuantity(value);
                  const formatBags = (value: number) =>
                    value > 0 ? value.toLocaleString('en-IN') : '—';

                  return (
                    <tr
                      key={sauda.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm whitespace-nowrap tabular-nums">
                        {formatSaudaDate(sauda)}
                      </td>
                      <td
                        className="py-3 px-4 text-sm max-w-[12rem] truncate"
                        title={partyName || undefined}
                      >
                        {partyName || '—'}
                      </td>
                      <td
                        className="py-3 px-4 text-sm tabular-nums text-muted-foreground"
                        title={
                          hasLots
                            ? `Lot S. No. on Purchases → Lots: ${lotStock.lotSerialNumbers.join(', ')}`
                            : undefined
                        }
                      >
                        {lotsLoading ? (
                          <span className="text-muted-foreground">…</span>
                        ) : hasLots ? (
                          lotLabel
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm whitespace-nowrap tabular-nums">
                        ₹{(sauda.rate ?? 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <StockBreakdownCell
                          loading={lotsLoading}
                          hasLots={hasLots}
                          received={lotStock.receivedWeight}
                          usedSold={lotStock.usedSoldWeight}
                          available={lotStock.availableWeight}
                          formatValue={formatWeight}
                        />
                      </td>
                      <td className="py-3 px-4 align-top">
                        <StockBreakdownCell
                          loading={lotsLoading}
                          hasLots={hasLots && lotStock.receivedBags > 0}
                          received={lotStock.receivedBags}
                          usedSold={lotStock.usedSoldBags}
                          available={lotStock.availableBags}
                          formatValue={formatBags}
                        />
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
