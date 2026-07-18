import { apiService } from './api';
import { normalizeIsoDateInput } from '../utils/dateFormatting';
import type {
  AadhaarOcrResponse,
  AadhaarValidationResult,
  BankVerificationResult,
  DriverVerificationResponse,
  EmailVerificationResult,
  GSTLookupResponseData,
  GstinByPanResponse,
  GstOcrResponse,
  KycPersistContext,
  PanContactResponse,
  PanOcrResponse,
  PANLookupResponseData,
  RcChallanDetailsRequest,
  RcChallanDetailsResult,
  RcFullLookupResult,
  RcOcrResponse,
  DrivingLicenseOcrResponse,
  DrivingLicenseOcrUploadOptions,
  DocumentOcrUploadOptions,
} from '../types/entities';
import { postDrivingLicenseOcr } from './licenseOcr.api';
import { postDocumentOcr } from './documentOcr.api';

const BASE = '/kyc';

function cleanAadhaar(aadhaarNumber: string): string {
  return aadhaarNumber.replace(/\s/g, '');
}

function appendPersistQuery(params: URLSearchParams, persist?: KycPersistContext) {
  if (!persist) return;
  params.set('entity_type', persist.entity_type);
  params.set('entity_id', persist.entity_id);
}

function withPersistBody<T extends Record<string, unknown>>(
  body: T,
  persist?: KycPersistContext,
): T & Partial<KycPersistContext> {
  if (!persist) return body;
  return {
    ...body,
    entity_type: persist.entity_type,
    entity_id: persist.entity_id,
  };
}

export const kycAPI = {
  /** Surepass Aadhaar validation */
  validateAadhaar: (aadhaarNumber: string, persist?: KycPersistContext) => {
    const cleaned = cleanAadhaar(aadhaarNumber);
    const params = new URLSearchParams({ aadhaar_number: cleaned });
    appendPersistQuery(params, persist);
    return apiService.get<AadhaarValidationResult & { surepass_response?: unknown }>(
      `${BASE}/aadhaar/validate?${params.toString()}`,
    );
  },

  /** Surepass bank account verification (includes IFSC branch/bank details by default) */
  verifyBank: (accountNumber: string, ifscCode: string, persist?: KycPersistContext) => {
    const params = new URLSearchParams({
      account_number: accountNumber.trim(),
      ifsc_code: ifscCode.trim().toUpperCase(),
    });
    appendPersistQuery(params, persist);
    return apiService.get<BankVerificationResult & { surepass_response?: unknown }>(
      `${BASE}/bank/verify?${params.toString()}`,
    );
  },

  /** Surepass driving licence verification */
  verifyDrivingLicense: (licenseNumber: string, dob?: string, persist?: KycPersistContext) => {
    const normalizedDob = dob?.trim() ? normalizeIsoDateInput(dob) : '';
    const body = withPersistBody(
      {
        id_number: licenseNumber.trim(),
        ...(normalizedDob ? { dob: normalizedDob } : {}),
      },
      persist,
    );
    return apiService.post<DriverVerificationResponse>(`${BASE}/driving-license/verify`, body);
  },

  /** Surepass licence-v2 OCR (extract only — does not verify or set is_verified). */
  ocrDrivingLicense: (front: File, options?: Omit<DrivingLicenseOcrUploadOptions, 'driverId'>) =>
    postDrivingLicenseOcr(`${BASE}/driving-license/ocr`, front, options),

  /** Surepass GST OCR (extract only). */
  ocrGstin: (file: File, options?: DocumentOcrUploadOptions) =>
    postDocumentOcr<GstOcrResponse>(`${BASE}/gstin/ocr`, file, options),

  /** Surepass PAN OCR (extract only). */
  ocrPan: (file: File, options?: DocumentOcrUploadOptions) =>
    postDocumentOcr<PanOcrResponse>(`${BASE}/pan/ocr`, file, options),

  /** Surepass Aadhaar OCR (extract only). */
  ocrAadhaar: (file: File, options?: DocumentOcrUploadOptions) =>
    postDocumentOcr<AadhaarOcrResponse>(`${BASE}/aadhaar/ocr`, file, options),

  /** Surepass vehicle RC OCR (extract only). */
  ocrRc: (file: File, options?: DocumentOcrUploadOptions) =>
    postDocumentOcr<RcOcrResponse>(`${BASE}/rc/ocr`, file, options),

  /** Surepass email deliverability check */
  verifyEmail: (email: string, persist?: KycPersistContext) => {
    const params = new URLSearchParams({ email: email.trim() });
    appendPersistQuery(params, persist);
    return apiService.get<EmailVerificationResult & { surepass_response?: unknown }>(
      `${BASE}/email/verify?${params.toString()}`,
    );
  },

  /** Surepass GSTIN advanced lookup (full business details) */
  lookupGSTAdvanced: (gstNumber: string, persist?: KycPersistContext) => {
    const params = new URLSearchParams({
      gst_number: gstNumber.trim().toUpperCase(),
    });
    appendPersistQuery(params, persist);
    return apiService.get<GSTLookupResponseData>(`${BASE}/gstin/advanced?${params.toString()}`);
  },

  /** Surepass PAN comprehensive lookup */
  lookupPANComprehensive: (panNumber: string, persist?: KycPersistContext) => {
    const params = new URLSearchParams({
      pan_number: panNumber.trim().toUpperCase(),
    });
    appendPersistQuery(params, persist);
    return apiService.get<PANLookupResponseData>(`${BASE}/pan/comprehensive?${params.toString()}`);
  },

  /** Surepass GSTIN list by PAN */
  lookupGstinByPan: (panNumber: string, persist?: KycPersistContext) => {
    const params = new URLSearchParams({
      pan_number: panNumber.trim().toUpperCase(),
    });
    appendPersistQuery(params, persist);
    return apiService.get<GstinByPanResponse>(`${BASE}/gstin/by-pan?${params.toString()}`);
  },

  /** Surepass PAN email / mobile lookup */
  lookupPanContact: (panNumber: string, persist?: KycPersistContext) => {
    const params = new URLSearchParams({
      pan_number: panNumber.trim().toUpperCase(),
    });
    appendPersistQuery(params, persist);
    return apiService.get<PanContactResponse>(`${BASE}/pan/contact?${params.toString()}`);
  },

  /** Surepass RC challan details (requires RC + chassis + engine numbers) */
  lookupRcChallanDetails: async (
    payload: RcChallanDetailsRequest,
    persist?: KycPersistContext,
  ) => {
    const body = withPersistBody(
      {
        rc_number: payload.rc_number.trim().toUpperCase(),
        chassis_number: payload.chassis_number.trim().toUpperCase(),
        engine_number: payload.engine_number.trim().toUpperCase(),
        ...(payload.state_only !== undefined ? { state_only: payload.state_only } : {}),
        ...(payload.state_portal?.length
          ? {
              state_portal: payload.state_portal
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean),
            }
          : {}),
      },
      persist,
    );
    const response = await apiService.post<
      RcChallanDetailsResult & { surepass_response?: unknown }
    >(`${BASE}/rc/challan-details`, body);
    return response;
  },

  /** Surepass RC full lookup (registration certificate details) */
  lookupRcFull: (idNumber: string, persist?: KycPersistContext) => {
    const body = withPersistBody(
      { id_number: idNumber.trim().toUpperCase() },
      persist,
    );
    return apiService.post<RcFullLookupResult & { surepass_response?: unknown }>(
      `${BASE}/rc/full`,
      body,
    );
  },
};
