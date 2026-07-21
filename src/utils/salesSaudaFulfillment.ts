import type { SalesSauda, SalesSaudaLine } from '../types/sales';

const EPS = 1e-9;

export type SaudaFulfillmentLabel =
  | 'draft'
  | 'not_started'
  | 'partial'
  | 'fully_dispatched'
  | 'unknown';

export interface SaudaFulfillmentSummary {
  ordered: number;
  allocated: number;
  returned: number;
  remaining: number;
  /** Sum of packet_count (ordered bags) when lines have bags; null if none. */
  orderedBags: number | null;
  remainingBags: number | null;
  allocatedBags: number | null;
  label: SaudaFulfillmentLabel;
  /** True when GET-by-id returned at least one line (list responses have lines: []). */
  hasLines: boolean;
  /** True when at least one line has packet_count for bag math. */
  hasBags: boolean;
}

export function getSaudaLineOrdered(line: SalesSaudaLine): number {
  if (line.ordered != null && !Number.isNaN(Number(line.ordered))) {
    return Number(line.ordered);
  }
  return Number(line.quantity) || 0;
}

export function getSaudaLineAllocated(line: SalesSaudaLine): number {
  if (line.allocated != null && !Number.isNaN(Number(line.allocated))) {
    return Number(line.allocated);
  }
  return 0;
}

export function getSaudaLineReturned(line: SalesSaudaLine): number {
  if (line.returned != null && !Number.isNaN(Number(line.returned))) {
    return Number(line.returned);
  }
  return 0;
}

/** What can still be put on a new dispatch (falls back to quantity when API omits remaining). */
export function getSaudaLineRemaining(line: SalesSaudaLine): number {
  if (line.remaining != null && !Number.isNaN(Number(line.remaining))) {
    return Number(line.remaining);
  }
  return Number(line.quantity) || 0;
}

export function isSaudaLineFullyDispatched(line: SalesSaudaLine): boolean {
  return getSaudaLineRemaining(line) <= EPS;
}

export function hasSaudaRemaining(sauda: Pick<SalesSauda, 'lines'> | null | undefined): boolean {
  const lines = sauda?.lines ?? [];
  return lines.some((l) => getSaudaLineRemaining(l) > EPS);
}

export function isSaudaFullyDispatched(sauda: Pick<SalesSauda, 'lines'> | null | undefined): boolean {
  const lines = sauda?.lines ?? [];
  if (lines.length === 0) return false;
  return lines.every(isSaudaLineFullyDispatched);
}

export function formatQty(n: number, unit?: string | null): string {
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
  return unit?.trim() ? `${formatted} ${unit.trim()}` : formatted;
}

/** Pretty bags/qty input value (integer when close enough). */
export function formatBagsInput(n: number): string {
  if (!Number.isFinite(n) || n <= EPS) return '';
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return String(parseFloat(n.toFixed(4)));
}

/** Max bags that fit in remaining kg given packaging holding_capacity. */
export function remainingBagsFromQty(remainingQty: number, holdingCapacity: number): number {
  const capacity = Number(holdingCapacity) || 0;
  if (capacity <= EPS || remainingQty <= EPS) return 0;
  return remainingQty / capacity;
}

/** Ordered bags on a sauda line (packet_count). */
export function getSaudaLineOrderedBags(line: SalesSaudaLine): number | null {
  if (line.packet_count != null && !Number.isNaN(Number(line.packet_count))) {
    const n = Number(line.packet_count);
    if (n > EPS) return n;
  }
  return null;
}

/**
 * Remaining bags for a line: scale packet_count by remaining/ordered qty.
 * Falls back to remaining÷capacity when holdingCapacity is provided.
 */
export function getSaudaLineRemainingBags(
  line: SalesSaudaLine,
  holdingCapacity?: number,
): number | null {
  const orderedBags = getSaudaLineOrderedBags(line);
  const ordered = getSaudaLineOrdered(line);
  const remaining = getSaudaLineRemaining(line);
  if (orderedBags != null && ordered > EPS) {
    return orderedBags * (remaining / ordered);
  }
  const capacity = Number(holdingCapacity) || 0;
  if (capacity > EPS) return remainingBagsFromQty(remaining, capacity);
  return null;
}

export function getSaudaLineAllocatedBags(line: SalesSaudaLine): number | null {
  const orderedBags = getSaudaLineOrderedBags(line);
  const ordered = getSaudaLineOrdered(line);
  const allocated = getSaudaLineAllocated(line);
  if (orderedBags != null && ordered > EPS) {
    return orderedBags * (allocated / ordered);
  }
  return null;
}

function emptyFulfillment(
  label: SaudaFulfillmentLabel,
  hasLines: boolean,
): SaudaFulfillmentSummary {
  return {
    ordered: 0,
    allocated: 0,
    returned: 0,
    remaining: 0,
    orderedBags: null,
    remainingBags: null,
    allocatedBags: null,
    label,
    hasLines,
    hasBags: false,
  };
}

/** Aggregate fulfillment from GET /sales-saudas/:id lines (not available on list). */
export function summarizeSaudaFulfillment(
  sauda: Pick<SalesSauda, 'status' | 'lines'> | null | undefined,
): SaudaFulfillmentSummary {
  if (!sauda) return emptyFulfillment('unknown', false);
  if (sauda.status === 'draft') {
    return emptyFulfillment('draft', (sauda.lines?.length ?? 0) > 0);
  }
  const lines = sauda.lines ?? [];
  if (lines.length === 0) return emptyFulfillment('unknown', false);

  let ordered = 0;
  let allocated = 0;
  let returned = 0;
  let remaining = 0;
  let orderedBags = 0;
  let remainingBags = 0;
  let allocatedBags = 0;
  let bagLines = 0;

  for (const line of lines) {
    ordered += getSaudaLineOrdered(line);
    allocated += getSaudaLineAllocated(line);
    returned += getSaudaLineReturned(line);
    remaining += getSaudaLineRemaining(line);

    const oBags = getSaudaLineOrderedBags(line);
    const rBags = getSaudaLineRemainingBags(line);
    const aBags = getSaudaLineAllocatedBags(line);
    if (oBags != null && rBags != null) {
      bagLines += 1;
      orderedBags += oBags;
      remainingBags += rBags;
      allocatedBags += aBags ?? 0;
    }
  }

  let label: SaudaFulfillmentLabel = 'not_started';
  if (remaining <= EPS) label = 'fully_dispatched';
  else if (allocated > EPS) label = 'partial';

  const hasBags = bagLines > 0;
  return {
    ordered,
    allocated,
    returned,
    remaining,
    orderedBags: hasBags ? orderedBags : null,
    remainingBags: hasBags ? remainingBags : null,
    allocatedBags: hasBags ? allocatedBags : null,
    label,
    hasLines: true,
    hasBags,
  };
}

export function fulfillmentLabelText(label: SaudaFulfillmentLabel): string {
  switch (label) {
    case 'draft':
      return 'Draft';
    case 'not_started':
      return 'Not dispatched';
    case 'partial':
      return 'Partial';
    case 'fully_dispatched':
      return 'Fully dispatched';
    default:
      return '–';
  }
}
