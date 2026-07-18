import type { BrokerCommissionType, CashDiscountType } from '../types/entities';

export const SAUDA_MAX_BAGS = 5000;
export const SAUDA_MAX_QUANTITY_TONNE = 100;
export const SAUDA_MAX_RATE = 500;
export const SAUDA_MAX_CASH_DISCOUNT_PERCENT = 10;
export const SAUDA_MAX_CASH_DISCOUNT_RUPEES = 500_000;
export const SAUDA_MAX_BROKER_COMMISSION_PERCENT = 10;
export const SAUDA_MAX_BROKER_COMMISSION_RUPEES = 500_000;
export const SAUDA_MAX_BROKER_COMMISSION_PER_WEIGHT = 10000;

export type SaudaWeightUnit = 'kg' | 'quintal' | 'ton';

export function maxQuantityForUnit(unit: SaudaWeightUnit): number {
  if (unit === 'ton') return SAUDA_MAX_QUANTITY_TONNE;
  if (unit === 'quintal') return SAUDA_MAX_QUANTITY_TONNE * 10;
  return SAUDA_MAX_QUANTITY_TONNE * 1000;
}

export function quantityUnitLabel(unit: SaudaWeightUnit): string {
  if (unit === 'ton') return 'ton';
  if (unit === 'quintal') return 'qtl';
  return 'kg';
}

export function validateSaudaNoOfBags(value: number | null | undefined): string | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 0) {
    return 'No. of bags must be a whole number ≥ 0';
  }
  if (value > SAUDA_MAX_BAGS) {
    return `No. of bags cannot exceed ${SAUDA_MAX_BAGS.toLocaleString('en-IN')}`;
  }
  return null;
}

export function validateSaudaQuantity(
  value: number | null | undefined,
  unit: SaudaWeightUnit,
): string | null {
  if (value == null) return null;
  if (Number.isNaN(value) || value < 0) {
    return 'Quantity cannot be negative';
  }
  const max = maxQuantityForUnit(unit);
  if (value > max) {
    return `Quantity cannot exceed ${SAUDA_MAX_QUANTITY_TONNE} tonne (${max} ${quantityUnitLabel(unit)})`;
  }
  return null;
}

export function validateSaudaRate(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value < 0) return 'Rate must be 0 or greater';
  if (value > SAUDA_MAX_RATE) {
    return `Rate cannot exceed ₹${SAUDA_MAX_RATE}`;
  }
  return null;
}

export function validateSaudaCashDiscount(
  value: number | null | undefined,
  type: CashDiscountType | undefined,
): string | null {
  if (value == null) return null;
  if (value < 0) return 'Cash discount cannot be negative';
  if (type === 'percentage') {
    if (value > SAUDA_MAX_CASH_DISCOUNT_PERCENT) {
      return `Cash discount cannot exceed ${SAUDA_MAX_CASH_DISCOUNT_PERCENT}%`;
    }
    return null;
  }
  if (value > SAUDA_MAX_CASH_DISCOUNT_RUPEES) {
    return `Cash discount cannot exceed ₹${(SAUDA_MAX_CASH_DISCOUNT_RUPEES / 100_000).toFixed(0)} lakh`;
  }
  return null;
}

export function validateSaudaBrokerCommission(
  value: number | null | undefined,
  type: BrokerCommissionType | undefined,
): string | null {
  if (value == null) return null;
  if (value < 0) return 'Broker commission cannot be negative';
  if (type === 'percentage') {
    if (value > SAUDA_MAX_BROKER_COMMISSION_PERCENT) {
      return `Broker commission cannot exceed ${SAUDA_MAX_BROKER_COMMISSION_PERCENT}%`;
    }
    return null;
  }
  if (type === 'weight') {
    if (value > SAUDA_MAX_BROKER_COMMISSION_PER_WEIGHT) {
      return `Broker commission cannot exceed ₹${SAUDA_MAX_BROKER_COMMISSION_PER_WEIGHT} per weight unit`;
    }
    return null;
  }
  if (value > SAUDA_MAX_BROKER_COMMISSION_RUPEES) {
    return `Broker commission cannot exceed ₹${(SAUDA_MAX_BROKER_COMMISSION_RUPEES / 100_000).toFixed(0)} lakh`;
  }
  return null;
}

export function cashDiscountMaxForType(type: CashDiscountType | undefined): number | undefined {
  if (type === 'percentage') return SAUDA_MAX_CASH_DISCOUNT_PERCENT;
  if (type === 'rupees') return SAUDA_MAX_CASH_DISCOUNT_RUPEES;
  return undefined;
}

export function brokerCommissionMaxForType(
  type: BrokerCommissionType | undefined,
): number | undefined {
  if (type === 'percentage') return SAUDA_MAX_BROKER_COMMISSION_PERCENT;
  if (type === 'weight') return SAUDA_MAX_BROKER_COMMISSION_PER_WEIGHT;
  if (type === 'rupees') return SAUDA_MAX_BROKER_COMMISSION_RUPEES;
  return undefined;
}
