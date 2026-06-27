import { API_BASE_URL } from './api';
import { authenticatedFetchEnvelopeData } from './authenticatedFetch';
import type { DocumentOcrUploadOptions } from '../types/entities';

export async function postDocumentOcr<T>(
  endpoint: string,
  file: File,
  options?: DocumentOcrUploadOptions,
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.usePdf !== undefined) {
    formData.append('use_pdf', options.usePdf ? 'true' : 'false');
  }

  return authenticatedFetchEnvelopeData<T>(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
  });
}
