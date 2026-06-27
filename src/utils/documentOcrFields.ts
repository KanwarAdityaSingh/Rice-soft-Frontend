import type {
  AadhaarOcrResponse,
  CreateVehicleRequest,
  GstOcrResponse,
  PanOcrResponse,
  RcOcrResponse,
  VendorAddress,
} from '../types/entities';
import { normalizeIsoDateInput } from './dateFormatting';
import { parseGstPrincipalAddress } from './gstLookupAutofill';
import { toTitleCase } from './panLookupEnrichment';
import { normalizeRcDateForInput, isRcNaValue } from './rcFullMapping';
import { extractPanFromGst } from './panGstValidation';
import { sanitizeVehicleNumberInput } from './validation';

/** Surepass recommends manual review below this GSTIN OCR confidence score. */
export const GST_OCR_CONFIDENCE_REVIEW_THRESHOLD = 85;

type SurepassGstOcrField = {
  document_type?: string;
  gstin?: { value?: string; confidence?: number };
  standard_document?: boolean;
};

function readSurepassGstOcrField(result: GstOcrResponse): SurepassGstOcrField | null {
  const raw = result.surepass_response;
  if (!raw || typeof raw !== 'object') return null;

  const nested = raw as {
    data?: { ocr_fields?: SurepassGstOcrField[] };
    ocr_fields?: SurepassGstOcrField[];
  };
  const fields = nested.data?.ocr_fields ?? nested.ocr_fields;
  if (!Array.isArray(fields) || fields.length === 0) return null;

  return fields.find((field) => field.document_type === 'gst_reg') ?? fields[0] ?? null;
}

export function resolveGstNumberFromOcr(result: GstOcrResponse): string | null {
  const normalized = (result.gst_number ?? result.gstin)?.trim().toUpperCase();
  if (normalized) return normalized;

  const field = readSurepassGstOcrField(result);
  const raw = field?.gstin?.value?.trim().toUpperCase();
  return raw || null;
}

export function resolveGstOcrConfidence(result: GstOcrResponse): number | null {
  if (typeof result.confidence === 'number') return result.confidence;

  const field = readSurepassGstOcrField(result);
  const confidence = field?.gstin?.confidence;
  return typeof confidence === 'number' ? confidence : null;
}

export function resolveGstOcrStandardDocument(result: GstOcrResponse): boolean | null {
  if (typeof result.standard_document === 'boolean') return result.standard_document;

  const field = readSurepassGstOcrField(result);
  return typeof field?.standard_document === 'boolean' ? field.standard_document : null;
}

export function buildGstOcrQualityWarnings(result: GstOcrResponse): string[] {
  const warnings: string[] = [];
  const confidence = resolveGstOcrConfidence(result);

  if (confidence !== null && confidence < GST_OCR_CONFIDENCE_REVIEW_THRESHOLD) {
    warnings.push(
      `GSTIN confidence is ${confidence}% — upload a clearer, flat scan if the number looks wrong.`,
    );
  }

  if (resolveGstOcrStandardDocument(result) === false) {
    warnings.push(
      'Document may not be a standard GST certificate — re-upload the full registration certificate.',
    );
  }

  return warnings;
}

export function resolvePanNumberFromOcr(result: PanOcrResponse | GstOcrResponse): string | null {
  const raw = result.pan_number?.trim().toUpperCase();
  return raw || null;
}

export function resolvePanNameFromOcr(result: PanOcrResponse): string | null {
  const raw = (result.full_name ?? result.name)?.trim();
  return raw ? toTitleCase(raw) : null;
}

export function resolveAadhaarNumberFromOcr(result: AadhaarOcrResponse): string | null {
  const raw = (result.aadhaar_number ?? result.aadhar_number ?? result.uid)?.replace(/\s/g, '').trim();
  return raw || null;
}

export function resolveAadhaarNameFromOcr(result: AadhaarOcrResponse): string | null {
  const raw = (result.full_name ?? result.name)?.trim();
  return raw ? toTitleCase(raw) : null;
}

export function resolveOcrAddressParts(address?: string | null): Partial<VendorAddress> {
  if (!address?.trim()) return {};
  return parseGstPrincipalAddress(address.trim());
}

export function resolveBusinessNameFromGstOcr(result: GstOcrResponse): string | null {
  const raw = (result.legal_name ?? result.business_name ?? result.trade_name)?.trim();
  return raw ? toTitleCase(raw) : null;
}

export function resolveRcNumberFromOcr(result: RcOcrResponse): string | null {
  const raw = (result.rc_number ?? result.registration_number ?? result.vehicle_number)?.trim();
  if (!raw) return null;
  return sanitizeVehicleNumberInput(raw);
}

function normalizeRcText(value: string | null | undefined): string | null {
  if (isRcNaValue(value)) return null;
  return value!.trim();
}

function normalizeRcFuel(value: string | null | undefined): string | null {
  const text = normalizeRcText(value);
  if (!text) return null;
  const v = text.toLowerCase();
  if (v.includes('diesel')) return 'Diesel';
  if (v.includes('petrol') || v.includes('gasoline')) return 'Petrol';
  if (v.includes('cng')) return 'CNG';
  if (v.includes('electric')) return 'Electric';
  return toTitleCase(text);
}

function buildRcMakerModel(result: RcOcrResponse): string | null {
  if (result.maker_model?.trim() && !isRcNaValue(result.maker_model)) {
    return toTitleCase(result.maker_model.trim());
  }
  const parts = [result.maker, result.model]
    .map((s) => (s != null ? String(s).trim() : ''))
    .filter((s) => s && !isRcNaValue(s));
  if (parts.length === 0) return null;
  return toTitleCase(parts.join(' ').replace(/\s+/g, ' '));
}

/** Map RC OCR into vehicle form fields — extract-only (does not set is_verified). */
export function mapRcOcrToVehicleForm(result: RcOcrResponse): Partial<CreateVehicleRequest> | null {
  const rcNumber = resolveRcNumberFromOcr(result);
  if (!rcNumber) return null;

  return {
    vehicle_number: rcNumber,
    rc_number: rcNumber,
    owner_name: (() => {
      const name = normalizeRcText(result.owner_name);
      return name ? toTitleCase(name) : null;
    })(),
    vehicle_class:
      normalizeRcText(result.vehicle_class) ||
      normalizeRcText(result.vehicle_category) ||
      null,
    fuel_type: normalizeRcFuel(result.fuel_type ?? result.fuel_used),
    maker_model: buildRcMakerModel(result),
    registration_date: normalizeRcDateForInput(
      result.registration_date ?? result.date_of_registration,
    ),
    insurance_validity: normalizeRcDateForInput(
      result.insurance_validity ?? result.insurance_upto,
    ),
    fitness_validity: normalizeRcDateForInput(result.fitness_validity ?? result.fit_up_to),
    permit_validity: normalizeRcDateForInput(result.permit_validity ?? result.permit_valid_upto),
    is_verified: false,
    verified_at: null,
  };
}

export function resolveGstPanFromOcr(result: GstOcrResponse): string | null {
  return resolvePanNumberFromOcr(result) ?? (() => {
    const gst = resolveGstNumberFromOcr(result);
    return gst ? extractPanFromGst(gst) : null;
  })();
}

export function resolveOcrDobIso(result: { dob?: string | null; date_of_birth?: string | null }): string | null {
  const raw = (result.date_of_birth ?? result.dob)?.trim();
  if (!raw) return null;
  return normalizeIsoDateInput(raw) || null;
}
