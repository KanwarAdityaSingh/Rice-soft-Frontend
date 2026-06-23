import { getRiceTypeLabel } from './riceType';
import type { InwardSlipPass, RiceCode, RiceType, Sauda } from '../types/entities';

export interface VehicleLinkedIsp {
  id: string;
  slipNumber: string;
  partyName: string;
  saudaLabels: string[];
}

export function formatIspSlipLabel(slipNumber: string | null | undefined): string {
  const trimmed = slipNumber?.trim();
  if (!trimmed) return 'ISP';
  if (/^ISP-/i.test(trimmed)) return trimmed.toUpperCase();
  return `ISP-${trimmed}`;
}

export function formatSaudaLinkLabel(
  saudaId: string,
  saudas: Sauda[],
  riceCodes: RiceCode[],
  riceTypes: RiceType[]
): string {
  const sauda = saudas.find((s) => s.id === saudaId);
  if (!sauda) return 'Unknown sauda';

  const parts: string[] = [];
  const riceCode = riceCodes.find((rc) => rc.rice_code_id === sauda.rice_code_id);
  if (riceCode?.rice_code_name) parts.push(riceCode.rice_code_name);

  const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, riceTypes);
  if (riceTypeLabel) parts.push(riceTypeLabel);

  parts.push(`₹${sauda.rate}/kg`);
  return parts.join(' · ');
}

export function getVehicleLinkedIsps(
  vehicleId: string,
  inwardSlipPasses: InwardSlipPass[],
  saudas: Sauda[],
  riceCodes: RiceCode[],
  riceTypes: RiceType[]
): VehicleLinkedIsp[] {
  return inwardSlipPasses
    .filter((isp) => isp.vehicle_id === vehicleId)
    .map((isp) => ({
      id: isp.id,
      slipNumber: isp.slip_number,
      partyName: isp.party_name,
      saudaLabels: (isp.sauda_ids ?? []).map((saudaId) =>
        formatSaudaLinkLabel(saudaId, saudas, riceCodes, riceTypes)
      ),
    }));
}

export function formatVehicleLinkedIspLine(isp: VehicleLinkedIsp): string {
  const slip = formatIspSlipLabel(isp.slipNumber);
  const party = isp.partyName?.trim();
  const saudas =
    isp.saudaLabels.length > 0 ? isp.saudaLabels.join('; ') : 'No saudas linked';
  return party ? `${slip} · ${party} · Saudas: ${saudas}` : `${slip} · Saudas: ${saudas}`;
}
