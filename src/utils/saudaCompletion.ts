/**
 * Utility functions for handling sauda completion status and received weight
 */

export interface CompletionStatus {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Get completion status information based on completion percentage
 */
export function getCompletionStatus(completion_percentage: number | null): CompletionStatus {
  if (completion_percentage === null) {
    return {
      label: 'N/A',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-muted',
    };
  }
  if (completion_percentage < 100) {
    return {
      label: 'Partial Delivery',
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    };
  }
  if (completion_percentage === 100) {
    return {
      label: 'Complete',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    };
  }
  return {
    label: 'Over-delivered',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  };
}

/**
 * Format completion percentage for display
 */
export function formatCompletionPercentage(completion_percentage: number | null): string {
  if (completion_percentage === null) {
    return 'N/A';
  }
  return `${completion_percentage.toFixed(2)}%`;
}

/**
 * Format weight display with received and expected
 */
export function formatWeightDisplay(
  received: number,
  expected: number | null | undefined
): string {
  if (expected === null || expected === undefined) {
    return `${received.toFixed(2)} kg`;
  }
  return `${received.toFixed(2)} / ${expected.toFixed(2)} kg`;
}

/**
 * Calculate remaining weight that can be delivered
 * Returns null if quantity is null/undefined (no limit)
 */
export function calculateRemainingWeight(
  quantity: number | null | undefined,
  received_until_now: number
): number | null {
  if (quantity === null || quantity === undefined) {
    return null; // No limit if quantity not set
  }
  return Math.max(0, quantity - received_until_now);
}

/**
 * Check if kaanta weight exceeds remaining weight
 */
export function exceedsRemainingWeight(
  kaantaWeight: number,
  quantity: number | null | undefined,
  received_until_now: number
): boolean {
  const remaining = calculateRemainingWeight(quantity, received_until_now);
  if (remaining === null) {
    return false; // No limit if quantity not set
  }
  return kaantaWeight > remaining;
}

/**
 * Dana deduction (kg): 300g per quintal of said-sent weight.
 * Any fractional kg rounds up (e.g. 0.3 kg → 1 kg) for display and weight math in payment advice.
 */
export function danaDeductionKgFromSaidSent(saidSentWeightKg: number): number {
  if (!Number.isFinite(saidSentWeightKg) || saidSentWeightKg <= 0) return 0;
  const rawKg = (saidSentWeightKg * 300) / 1000 / 100;
  return Math.ceil(rawKg - 1e-9);
}

