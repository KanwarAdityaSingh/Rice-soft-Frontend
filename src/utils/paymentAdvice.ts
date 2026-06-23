import type { Charge, PaymentAdvice, PaymentAdviceSubmitCharge } from '../types/entities';

export type PaymentAdviceFormCharge = PaymentAdviceSubmitCharge;

type ChargeInput = PaymentAdviceSubmitCharge;

export const DEFAULT_RTGS_CHARGE: PaymentAdviceFormCharge = {
  charge_name: 'RTGS Charge',
  charge_value: 0,
  charge_type: 'fixed',
};

/** Map stored PA charges to form rows; default RTGS @ ₹0 when none saved. */
export function mapStoredChargesToFormCharges(
  charges: Charge[] | null | undefined
): PaymentAdviceFormCharge[] {
  if (charges && charges.length > 0) {
    return charges.map(({ charge_name, charge_value, charge_type }) => ({
      charge_name,
      charge_value,
      charge_type,
    }));
  }
  return [{ ...DEFAULT_RTGS_CHARGE }];
}

/** Charges with value > 0 sent on create/update (₹0 RTGS is UI-only, not persisted). */
export function getPaymentAdviceSubmitCharges(
  charges: ChargeInput[]
): PaymentAdviceSubmitCharge[] {
  return (charges ?? []).filter((c) => c.charge_name && c.charge_value > 0);
}

/** Sum of charge deductions (fixed + percentage of base amount). */
export function computePaymentAdviceTotalCharges(
  charges: ChargeInput[],
  baseAmount: number
): number {
  return (charges ?? []).reduce((sum, charge) => {
    if (charge.charge_type === 'fixed') {
      return sum + charge.charge_value;
    }
    return sum + (baseAmount * charge.charge_value) / 100;
  }, 0);
}

/** Shared body fields for POST create and PUT update (charges always included on save). */
export function buildPaymentAdviceSavePayload(params: {
  sauda_id: string | null | undefined;
  inward_slip_pass_id: string | null | undefined;
  recipient_id: string;
  amount: number | undefined;
  date_of_payment: string;
  transaction_id: string | null;
  bill_number: string | null | undefined;
  charges: ChargeInput[];
}): {
  sauda_id: string | null;
  inward_slip_pass_id: string | null;
  payer_id: string;
  recipient_id: string;
  amount: number | undefined;
  date_of_payment: string;
  transaction_id: string | null;
  bill_number: string | null;
  charges: PaymentAdviceSubmitCharge[];
} {
  return {
    sauda_id: params.sauda_id ?? null,
    inward_slip_pass_id: params.inward_slip_pass_id ?? null,
    payer_id: '',
    recipient_id: params.recipient_id,
    amount: params.amount,
    date_of_payment: params.date_of_payment,
    transaction_id: params.transaction_id,
    bill_number: params.bill_number ?? null,
    charges: getPaymentAdviceSubmitCharges(params.charges),
  };
}

/** Sync form charge rows from a saved PA response. */
export function syncFormChargesFromPaymentAdvice(
  pa: PaymentAdvice
): PaymentAdviceFormCharge[] {
  return mapStoredChargesToFormCharges(pa.charges);
}

/** Vendor-side total for one ISP sauda line (backend-authoritative). */
export function paymentAdviceSaudaVendorAmount(
  saudaItem: { amount_after_commission?: number | null; final_total_amount: number }
): number {
  if (typeof saudaItem.amount_after_commission === 'number' && Number.isFinite(saudaItem.amount_after_commission)) {
    return saudaItem.amount_after_commission;
  }
  return saudaItem.final_total_amount;
}
