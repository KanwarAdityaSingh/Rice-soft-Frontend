import type { CreateEWayBillRequest, InvoiceDispatch } from '../types/sales';
import { invoiceDispatchesAPI } from '../services/invoiceDispatches.api';
import { buildBillOfSupplyViewModel } from './ewayBillPreviewData';
import { downloadBillOfSupplyPdf } from './ewayBillPdfPrint';

/** Build preview body from a list/detail dispatch row. */
export function buildEWayBodyFromDispatch(
  dispatch: Pick<
    InvoiceDispatch,
    'distance_km' | 'route_description' | 'transporter_id' | 'lr_number'
  >,
  vehicleNumber?: string | null,
): CreateEWayBillRequest {
  const body: CreateEWayBillRequest = {};
  const v = vehicleNumber?.trim();
  if (v) body.vehicle_number = v.toUpperCase();
  if (dispatch.distance_km != null) body.distance_km = dispatch.distance_km;
  const route = dispatch.route_description?.trim();
  if (route) body.route = route;
  if (dispatch.transporter_id) body.transporter_id = dispatch.transporter_id;
  const lr = dispatch.lr_number?.trim();
  if (lr) body.lr_number = lr;
  return body;
}

/**
 * Preview + download Bill of Supply PDF for an invoice dispatch.
 * Uses only the preview API payload — no branding / default-recipient fillers.
 */
export async function downloadBillOfSupplyForDispatch(
  dispatchId: string,
  body?: CreateEWayBillRequest,
): Promise<void> {
  const preview = await invoiceDispatchesAPI.previewEWayBill(dispatchId, body);
  const viewModel = buildBillOfSupplyViewModel(preview);
  const name = viewModel.invoiceNo
    ? `Bill-of-Supply-${viewModel.invoiceNo.replace(/[^\w.-]+/g, '_')}`
    : 'Bill-of-Supply';
  await downloadBillOfSupplyPdf(viewModel, name);
}
