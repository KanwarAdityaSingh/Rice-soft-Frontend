import { API_BASE_URL } from './api';
import { authenticatedFetchEnvelopeData } from './authenticatedFetch';
import type { DrivingLicenseOcrResponse, DrivingLicenseOcrUploadOptions } from '../types/entities';

export async function postDrivingLicenseOcr(
  endpoint: string,
  front: File,
  options?: DrivingLicenseOcrUploadOptions,
): Promise<DrivingLicenseOcrResponse> {
  const formData = new FormData();
  formData.append('front', front);
  if (options?.back) {
    formData.append('back', options.back);
  }
  if (options?.usePdf !== undefined) {
    formData.append('use_pdf', options.usePdf ? 'true' : 'false');
  }
  if (options?.driverId) {
    formData.append('driver_id', options.driverId);
  }

  return authenticatedFetchEnvelopeData<DrivingLicenseOcrResponse>(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
  });
}
