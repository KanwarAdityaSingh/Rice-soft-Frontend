import type { ISPPurchaseSummary } from '../types/entities';

export type IspSaudaSummaryLine = ISPPurchaseSummary['saudas'][number];

/**
 * Vendor-side amount after cash discount and broker commission for one ISP sauda line.
 * Prefer backend `amount_after_commission` when present (authoritative, may differ by ₹1 from naive subtraction due to rounding).
 */
export function ispSaudaVendorAmountAfterCommission(saudaItem: IspSaudaSummaryLine): number {
  const fromApi = saudaItem.amount_after_commission;
  if (typeof fromApi === 'number' && Number.isFinite(fromApi)) {
    return fromApi;
  }
  return (
    saudaItem.base_amount -
    saudaItem.cash_discount_amount -
    (saudaItem.broker_commission_amount || 0)
  );
}
