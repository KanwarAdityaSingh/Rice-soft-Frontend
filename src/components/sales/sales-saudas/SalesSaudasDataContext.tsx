import { createContext, useContext } from 'react';
import type { SalesParty } from '../../../types/entities';
import type { Product } from '../../../types/entities';

/** Shared data for Sales Saudas page: fetched once at page level, consumed by table and modals to avoid duplicate API calls. */
export interface SalesSaudasDataContextValue {
  salesParties: SalesParty[];
  products: Product[];
  salesPartiesLoading: boolean;
  productsLoading: boolean;
}

const SalesSaudasDataContext = createContext<SalesSaudasDataContextValue | null>(null);

export function useSalesSaudasData(): SalesSaudasDataContextValue {
  const ctx = useContext(SalesSaudasDataContext);
  if (!ctx) {
    throw new Error('useSalesSaudasData must be used within SalesSaudasPage');
  }
  return ctx;
}

export { SalesSaudasDataContext };
