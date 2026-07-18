import type { Sauda, UpdateSaudaRequest } from '../types/entities';
import { normalizeSaudaParametersForApi } from './saudaParameters';

/** Map a loaded `Sauda` to a full `UpdateSaudaRequest` (e.g. for PATCH …/status). */
export function saudaToUpdatePayload(
  s: Sauda,
  overrides?: Partial<UpdateSaudaRequest>
): UpdateSaudaRequest {
  const parameters = normalizeSaudaParametersForApi(
    overrides?.parameters !== undefined ? overrides.parameters : s.parameters
  );

  const payload: UpdateSaudaRequest = {
    sauda_type: s.sauda_type,
    rice_category: s.rice_category ?? null,
    rice_code_id: s.rice_code_id ?? null,
    rice_type: s.rice_type ?? null,
    rice_length_id: s.rice_length_id ?? null,
    rate: s.rate,
    purchaser_id: s.purchaser_id,
    broker_id: s.broker_id ?? null,
    broker_commission: s.broker_commission ?? null,
    broker_commission_type: s.broker_commission_type ?? 'percentage',
    cash_discount: s.cash_discount ?? null,
    cash_discount_type: s.cash_discount_type ?? 'rupees',
    quantity: s.quantity ?? null,
    no_of_bags: s.no_of_bags ?? null,
    bag_weight: s.bag_weight ?? null,
    estimated_delivery_time: s.estimated_delivery_time ?? null,
    cooked_rice_image_url: s.cooked_rice_image_url ?? null,
    uncooked_rice_image_url: s.uncooked_rice_image_url ?? null,
    notes: s.notes ?? null,
    status: s.status,
    is_dana_required: s.is_dana_required ?? true,
    sauda_date: s.sauda_date ?? null,
    ...overrides,
  };

  delete (payload as { parameters?: unknown }).parameters;
  if (parameters) {
    payload.parameters = parameters;
  }

  return payload;
}
