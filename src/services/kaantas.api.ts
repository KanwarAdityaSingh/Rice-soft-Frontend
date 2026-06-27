import { API_BASE_URL, apiService } from './api';
import { authenticatedFetchEnvelopeData } from './authenticatedFetch';
import type {
  Kaanta,
  CreateKaantaRequest,
  UpdateKaantaRequest,
  KaantaWeightExtraction,
} from '../types/entities';

async function uploadKaantaFile(id: string, endpoint: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return authenticatedFetchEnvelopeData<{ url: string }>(
    `${API_BASE_URL}/kaantas/${id}/${endpoint}`,
    {
      method: 'POST',
      body: formData,
    }
  );
}

export const kaantasAPI = {
  getAllKaantas: (sauda_id?: string, inward_slip_pass_id?: string, godown_id?: string) => {
    let url = '/kaantas';
    const params = new URLSearchParams();
    if (sauda_id) params.append('sauda_id', sauda_id);
    if (inward_slip_pass_id) params.append('inward_slip_pass_id', inward_slip_pass_id);
    if (godown_id) params.append('godown_id', godown_id);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Kaanta[]>(url);
  },

  getKaantaById: (id: string) => {
    return apiService.get<Kaanta>(`/kaantas/${id}`);
  },

  extractWeights: async (file: File, inwardSlipPassId?: string): Promise<KaantaWeightExtraction> => {
    const formData = new FormData();
    formData.append('file', file);
    if (inwardSlipPassId) {
      formData.append('inward_slip_pass_id', inwardSlipPassId);
    }
    return authenticatedFetchEnvelopeData<KaantaWeightExtraction>(
      `${API_BASE_URL}/kaantas/extract-weights`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  createKaanta: (data: CreateKaantaRequest) => {
    return apiService.post<Kaanta>('/kaantas', data);
  },

  updateKaanta: (id: string, data: UpdateKaantaRequest) => {
    return apiService.put<Kaanta>(`/kaantas/${id}`, data);
  },

  deleteKaanta: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/kaantas/${id}`);
  },

  uploadKhaaliKaantaParchi: (id: string, file: File) =>
    uploadKaantaFile(id, 'upload-khaali-kaanta-parchi', file),

  uploadBharaKaantaParchi: (id: string, file: File) =>
    uploadKaantaFile(id, 'upload-bhara-kaanta-parchi', file),

  uploadCombinedKaantaParchi: (id: string, file: File) =>
    uploadKaantaFile(id, 'upload-combined-parchi', file),
};
