/**
 * Mirrors backend empty-bag receipt snapshot math for UI preview.
 * Server remains source of truth on create.
 */

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function roundWeightKg(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

export interface EmptyBagReceiptSnapshot {
  empty_bags_total_weight_kg: number;
  empty_bags_taxable_amount: number;
  empty_bags_gst_amount: number;
  empty_bags_total_amount: number;
}

export function computeEmptyBagReceiptSnapshot(
  initialPackets: number,
  emptyBagWeightKg: number,
  emptyBagRatePerKg: number,
  emptyBagGstPercent: number
): EmptyBagReceiptSnapshot {
  const totalWeightKg = roundWeightKg(initialPackets * emptyBagWeightKg);
  const taxable = roundMoney(totalWeightKg * emptyBagRatePerKg);
  const gstAmount = roundMoney((taxable * emptyBagGstPercent) / 100);
  const totalAmount = roundMoney(taxable + gstAmount);
  return {
    empty_bags_total_weight_kg: totalWeightKg,
    empty_bags_taxable_amount: taxable,
    empty_bags_gst_amount: gstAmount,
    empty_bags_total_amount: totalAmount,
  };
}

/** UI labels match API column names and backend comments */
export const EMPTY_BAG_SNAPSHOT_FIELDS: ReadonlyArray<{
  apiKey: keyof EmptyBagReceiptSnapshot;
  hint: string;
}> = [
  {
    apiKey: 'empty_bags_total_weight_kg',
    hint: 'Snapshot (server-computed when you create with initial_packets > 0)',
  },
  {
    apiKey: 'empty_bags_taxable_amount',
    hint: 'Snapshot (server-computed)',
  },
  {
    apiKey: 'empty_bags_gst_amount',
    hint: 'Snapshot (server-computed)',
  },
  {
    apiKey: 'empty_bags_total_amount',
    hint: 'Snapshot (server-computed)',
  },
];

export function parseSnapshotNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Display string for one snapshot cell; `—` when missing */
export function formatEmptyBagSnapshotValue(
  apiKey: keyof EmptyBagReceiptSnapshot,
  raw: number | string | null | undefined
): string {
  const n = parseSnapshotNumber(raw);
  if (n === null) return '—';
  if (apiKey === 'empty_bags_total_weight_kg') {
    return `${n.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg`;
  }
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function packagingHasAnyEmptyBagSnapshot(pkg: {
  empty_bags_total_weight_kg?: number | string | null;
  empty_bags_taxable_amount?: number | string | null;
  empty_bags_gst_amount?: number | string | null;
  empty_bags_total_amount?: number | string | null;
}): boolean {
  return EMPTY_BAG_SNAPSHOT_FIELDS.some((f) => parseSnapshotNumber(pkg[f.apiKey]) != null);
}
