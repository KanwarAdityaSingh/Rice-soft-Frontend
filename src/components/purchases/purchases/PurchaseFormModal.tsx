/**
 * ============================================================================
 * DEPRECATED: PurchaseFormModal.tsx
 * ============================================================================
 * The Purchase entity has been REMOVED from the backend.
 * Purchase calculations are now done in real-time via the Purchase Summary API.
 * 
 * This component is no longer used. See:
 * - PurchaseSummaryTable.tsx for viewing purchase summaries
 * - PaymentAdviceFormModal.tsx for creating payments (now links to Sauda or ISP)
 * 
 * This file is kept for reference only.
 * ============================================================================
 */

/*
import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { usePurchases } from '../../../hooks/usePurchases';
import { purchasesAPI } from '../../../services/purchases.api';
import { useVendors } from '../../../hooks/useVendors';
import { useSaudas } from '../../../hooks/useSaudas';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { useLots } from '../../../hooks/useLots';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreatePurchaseRequest, UpdatePurchaseRequest, Purchase, RiceCode, RiceType, Sauda, CashDiscountType, BrokerCommissionType } from '../../../types/entities';

interface PurchaseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId?: string | null;
}

export function PurchaseFormModal({ open, onOpenChange, purchaseId }: PurchaseFormModalProps) {
  // ... Component implementation removed for brevity
  // See git history for original implementation
  return null;
}
*/

// Export stub to prevent import errors
export function PurchaseFormModal(_props: { open: boolean; onOpenChange: (open: boolean) => void; purchaseId?: string | null }) {
  console.warn('PurchaseFormModal is deprecated. Use PaymentAdviceFormModal instead.');
  return null;
}
