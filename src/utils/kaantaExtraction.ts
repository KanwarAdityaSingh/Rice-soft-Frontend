import type { KaantaWeightExtraction } from '../types/entities';

export function formatKaantaVehicleMismatchWarning(extraction: KaantaWeightExtraction): string | null {
  const check = extraction.vehicle_check;
  if (!check.mismatch_flagged) return null;
  const parchi = check.parchi_vehicle_number ?? extraction.vehicle_number ?? '—';
  const isp = check.isp_vehicle_number ?? '—';
  return `Slip vehicle ${parchi} does not match ISP vehicle ${isp}. Please verify.`;
}

export function formatKaantaNeedsReviewWarning(extraction: KaantaWeightExtraction): string | null {
  if (!extraction.needs_review) return null;
  if (extraction.vehicle_check.mismatch_flagged) return null;
  return 'Could not fully verify weights from slip. Please confirm before saving.';
}

export function weightToInput(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return String(value);
}
