import type { PaymentAdvice, PaymentAdvicePreviewResponse } from '../types/entities';
import { computePaymentAdviceTotalCharges } from './paymentAdvice';

export interface PaymentAdviceFieldMismatch {
  field: string;
  label: string;
  stored: number | null;
  calculated: number | null;
  delta: number | null;
  format: 'money' | 'weight' | 'count';
}

function numbersDiffer(
  a: number | null | undefined,
  b: number | null | undefined,
  tolerance = 0.005
): boolean {
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  return Math.abs(a - b) > tolerance;
}

function pushIfDifferent(
  rows: PaymentAdviceFieldMismatch[],
  field: string,
  label: string,
  stored: number | null | undefined,
  calculated: number | null | undefined,
  format: PaymentAdviceFieldMismatch['format']
) {
  if (!numbersDiffer(stored, calculated)) return;
  const s = stored ?? null;
  const c = calculated ?? null;
  rows.push({
    field,
    label,
    stored: s,
    calculated: c,
    delta: s != null && c != null ? c - s : null,
    format,
  });
}

/** Compare stored PA record vs recalculated preview. Returns only differing fields. */
export function getPaymentAdviceStoredPreviewMismatches(
  stored: PaymentAdvice | null | undefined,
  preview: PaymentAdvicePreviewResponse | null | undefined
): PaymentAdviceFieldMismatch[] {
  if (!stored || !preview) return [];

  const rows: PaymentAdviceFieldMismatch[] = [];

  pushIfDifferent(rows, 'amount', 'Amount (pre-charges)', stored.amount, preview.amount, 'money');
  pushIfDifferent(rows, 'net_payable', 'Net Payable', stored.net_payable, preview.net_payable, 'money');
  pushIfDifferent(rows, 'bill_weight', 'Bill Weight', stored.bill_weight, preview.bill_weight, 'weight');
  pushIfDifferent(rows, 'kanta_weight', 'Kaanta Weight', stored.kanta_weight, preview.kanta_weight, 'weight');
  pushIfDifferent(
    rows,
    'dana_deduction',
    'Dana Deduction',
    stored.dana_deduction,
    preview.dana_deduction,
    'weight'
  );
  pushIfDifferent(rows, 'final_weight', 'Final Weight', stored.final_weight, preview.final_weight, 'weight');

  const storedBags = (stored as PaymentAdvice & { total_bags?: number | null }).total_bags;
  if (storedBags != null) {
    pushIfDifferent(rows, 'total_bags', 'Total Bags', storedBags, preview.total_bags, 'count');
  }

  const storedChargesTotal = computePaymentAdviceTotalCharges(
    stored.charges ?? [],
    stored.amount ?? 0
  );
  const previewChargesTotal = preview.total_charges ?? 0;
  pushIfDifferent(rows, 'total_charges', 'Total Charges', storedChargesTotal, previewChargesTotal, 'money');

  return rows;
}

export function formatMismatchValue(
  value: number | null,
  format: PaymentAdviceFieldMismatch['format']
): string {
  if (value == null) return '—';
  if (format === 'money') {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (format === 'weight') {
    return `${value.toFixed(2)} kg`;
  }
  return String(value);
}

export function formatMismatchDelta(
  delta: number | null,
  format: PaymentAdviceFieldMismatch['format']
): string {
  if (delta == null || delta === 0) return '—';
  const sign = delta > 0 ? '+' : '−';
  const abs = Math.abs(delta);
  if (format === 'money') {
    return `${sign}₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (format === 'weight') {
    return `${sign}${abs.toFixed(2)} kg`;
  }
  return `${sign}${abs}`;
}
