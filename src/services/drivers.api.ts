import { apiService } from './api';
import { normalizeIsoDateInput } from '../utils/dateFormatting';
import type {
  Driver,
  CreateDriverRequest,
  UpdateDriverRequest,
  DriverVerificationResponse,
  DrivingLicenseOcrResponse,
  DrivingLicenseOcrUploadOptions,
} from '../types/entities';
import { postDrivingLicenseOcr } from './licenseOcr.api';

/** Matches backend success message when driver is created with transport DOE missing. */
export const DRIVER_CREATE_LENIENT_TRANSPORT_DOE_MESSAGE = 'Driver created successfully';

export type DriverSaveResult = {
  driver: Driver;
  message: string;
  verification_error?: string;
  transport_doe_not_found?: boolean;
};

function mapDriverEnvelope(res: {
  data: Driver;
  message?: string;
  verification_error?: string;
  transport_doe_not_found?: boolean;
}): DriverSaveResult {
  return {
    driver: {
      ...res.data,
      transport_doe_not_found: res.transport_doe_not_found ?? res.data.transport_doe_not_found,
      verification_error: res.verification_error ?? res.data.verification_error ?? null,
    },
    message: res.message ?? '',
    verification_error: res.verification_error,
    transport_doe_not_found: res.transport_doe_not_found,
  };
}

export interface GetAllDriversOptions {
  /** When true, returns active + inactive. Default list is active only. */
  includeInactive?: boolean;
  /** Filter by Surepass DL verification status. */
  isVerified?: boolean;
}

function normalizeGetAllOptions(options?: boolean | GetAllDriversOptions): GetAllDriversOptions {
  if (typeof options === 'boolean') {
    return { includeInactive: options };
  }
  return options ?? {};
}

function buildVerifyBody(idNumber: string | undefined, dob?: string, driverId?: string) {
  const normalizedDob = dob?.trim() ? normalizeIsoDateInput(dob) : '';
  return {
    ...(idNumber?.trim() ? { id_number: idNumber.trim() } : {}),
    ...(normalizedDob ? { dob: normalizedDob } : {}),
    ...(driverId ? { driver_id: driverId } : {}),
  };
}

export const driversAPI = {
  getAllDrivers: (options?: boolean | GetAllDriversOptions) => {
    const { includeInactive, isVerified } = normalizeGetAllOptions(options);
    const params = new URLSearchParams();
    if (includeInactive) params.set('include_inactive', 'true');
    if (isVerified === true) params.set('is_verified', 'true');
    if (isVerified === false) params.set('is_verified', 'false');
    const query = params.toString();
    const url = query ? `/drivers?${query}` : '/drivers';
    return apiService.get<Driver[]>(url);
  },

  getDriverById: (id: string) => apiService.get<Driver>(`/drivers/${id}`),

  getDriverByLicense: (licenseNumber: string) =>
    apiService.get<Driver>(`/drivers/by-license/${encodeURIComponent(licenseNumber)}`),

  createDriver: async (data: CreateDriverRequest): Promise<DriverSaveResult> => {
    const res = await apiService.postEnvelope<Driver>('/drivers', data);
    return mapDriverEnvelope(res);
  },

  /** Lookup-only or auto-update when driver_id / matching licence exists */
  verifyDriver: (idNumber: string, dob?: string, driverId?: string) =>
    apiService.post<DriverVerificationResponse>(
      '/drivers/verify',
      buildVerifyBody(idNumber, dob, driverId),
    ),

  /** Verify saved driver — uses stored licence when id_number is omitted */
  verifyDriverById: (driverId: string, options?: { dob?: string; idNumber?: string }) => {
    const normalizedDob = options?.dob?.trim() ? normalizeIsoDateInput(options.dob) : '';
    return apiService.post<DriverVerificationResponse>(`/drivers/${driverId}/verify`, {
      ...(options?.idNumber?.trim() ? { id_number: options.idNumber.trim() } : {}),
      ...(normalizedDob ? { dob: normalizedDob } : {}),
    });
  },

  /** Licence OCR prefill — optional driver_id persists fields without setting is_verified. */
  ocrDriver: (front: File, options?: DrivingLicenseOcrUploadOptions): Promise<DrivingLicenseOcrResponse> =>
    postDrivingLicenseOcr('/drivers/ocr', front, options),

  updateDriver: async (id: string, data: UpdateDriverRequest): Promise<DriverSaveResult> => {
    const res = await apiService.putEnvelope<Driver>(`/drivers/${id}`, data);
    return mapDriverEnvelope(res);
  },

  deleteDriver: (id: string) =>
    apiService.delete<{ success: boolean; message: string }>(`/drivers/${id}`),
};
