/**
 * ============================================================================
 * DEPRECATED: PurchasesTable.tsx
 * ============================================================================
 * The Purchase entity has been REMOVED from the backend.
 * Purchase calculations are now done in real-time via the Purchase Summary API.
 * 
 * This component has been replaced by:
 * - PurchaseSummaryTable.tsx - Shows real-time calculated purchase summaries
 * 
 * This file is kept for reference only.
 * ============================================================================
 */

/*
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { ShoppingCart, Edit, Trash2, Eye } from 'lucide-react';
import { usePurchases } from '../../../hooks/usePurchases';
import { PurchaseFormModal } from './PurchaseFormModal';
import type { Purchase } from '../../../types/entities';

export function PurchasesTable() {
  // ... Component implementation removed for brevity
  // See git history for original implementation
  return null;
}
*/

// Re-export PurchaseSummaryTable as PurchasesTable for backwards compatibility
export { PurchaseSummaryTable as PurchasesTable } from './PurchaseSummaryTable';
