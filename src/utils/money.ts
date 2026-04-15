/**
 * Rounds a rupee amount down to the nearest whole rupee (mathematical floor).
 * Use for net payable and other payment-advice amounts sent to the API so
 * fractional paise do not round up.
 */
export function floorNetPayable(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.floor(amount);
}
