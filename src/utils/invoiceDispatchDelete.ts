import { ApiError } from '../services/api';
import type { InvoiceDispatchStatus } from '../types/sales';
import { extractApiErrorMessage } from './mastersIndiaSales';

/**
 * DELETE /invoice-dispatches/:id — 409 Conflict cases from the API:
 * - Not the latest in series
 * - Has credit notes
 * - Has e-invoice
 * - Has e-way bill
 * - Concurrent tip change
 * - Bad invoice number format
 *
 * Body: `{ success: false, error: string, ... }`
 */
export function extractInvoiceDispatchDeleteError(
  error: unknown,
  fallback = 'Could not delete invoice dispatch',
): string {
  return extractApiErrorMessage(error, fallback);
}

/** Short toast title for known 409 delete conflicts. */
export function invoiceDispatchDeleteToastTitle(error: unknown): string {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return 'Delete failed';
  }
  const msg = extractInvoiceDispatchDeleteError(error).toLowerCase();
  if (msg.includes('latest invoice') || msg.includes('series tip') || msg.includes('sequence')) {
    return 'Not the latest invoice';
  }
  if (msg.includes('credit note')) {
    return 'Has credit notes';
  }
  if (msg.includes('e-invoice') || msg.includes('einvoice')) {
    return 'Has e-invoice';
  }
  if (msg.includes('e-way') || msg.includes('eway')) {
    return 'Has e-way bill';
  }
  if (msg.includes('concurrent')) {
    return 'Retry delete';
  }
  if (msg.includes('unrecognized') || msg.includes('format')) {
    return 'Invalid invoice number';
  }
  return 'Cannot delete';
}

export function deleteInvoiceDispatchConfirmDescription(
  status: InvoiceDispatchStatus,
): string {
  if (status === 'confirmed') {
    return 'This reverses inventory, then permanently deletes the dispatch. Only the latest invoice in the series can be deleted. Blocked if credit notes, an e-invoice, or an e-way bill exist.';
  }
  if (status === 'cancelled') {
    return 'This permanently deletes the cancelled dispatch. Only the latest invoice in the series can be deleted. Blocked if credit notes, an e-invoice, or an e-way bill exist.';
  }
  return 'This draft dispatch will be permanently deleted. Only the latest invoice in the series can be deleted. Blocked if credit notes, an e-invoice, or an e-way bill exist.';
}
