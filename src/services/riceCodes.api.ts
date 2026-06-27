import { apiService } from './api';
import type { RiceCategory, RiceCode, RiceType } from '../types/entities';

/** Non-basmati catalog includes basmati-only variants from legacy API — hide in UI. */
const NON_BASMATI_EXCLUDED_VARIANTS = new Set(['golden_sella']);

function filterVariantsForCategory(category: RiceCategory, variants: RiceType[]): RiceType[] {
  if (category !== 'non_basmati') return variants;
  return variants.filter((variant) => !NON_BASMATI_EXCLUDED_VARIANTS.has(variant.value));
}

export interface CreateRiceCodeRequest {
  rice_code_name: string;
  category: RiceCategory;
  variants: string[];
}

export interface UpdateRiceCodeRequest {
  rice_code_name?: string;
  category?: RiceCategory;
  variants?: string[];
}

export const riceCodesAPI = {
  getRiceCategories: async (): Promise<RiceType[]> => {
    return apiService.get<RiceType[]>('/riceCodes/getRiceCategories');
  },

  getAllRiceCodes: async (category?: RiceCategory): Promise<RiceCode[]> => {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiService.get<RiceCode[]>(`/riceCodes/getAllRiceCodes${params}`);
  },

  getRiceCodeByName: async (name: string): Promise<RiceCode> => {
    return apiService.get<RiceCode>(`/riceCodes/getRiceCodeByName?name=${encodeURIComponent(name)}`);
  },

  /** Processing variants for a category (raw_basmati, steam_basmati, …). */
  getRiceVariants: async (category: RiceCategory): Promise<RiceType[]> => {
    const rows = await apiService.get<RiceType[]>(
      `/riceCodes/getRiceVariants?category=${encodeURIComponent(category)}`,
    );
    return filterVariantsForCategory(category, rows);
  },

  /** @deprecated use getRiceVariants — kept for modules not yet migrated */
  getRiceTypes: async (): Promise<RiceType[]> => {
    return apiService.get<RiceType[]>('/riceCodes/getRiceTypes');
  },

  createRiceCode: (data: CreateRiceCodeRequest) => {
    return apiService.post<RiceCode>('/riceCodes/createRiceCode', data);
  },

  updateRiceCode: (id: string, data: UpdateRiceCodeRequest) => {
    return apiService.post<RiceCode>(`/riceCodes/updateRiceCode/${id}`, data);
  },

  deleteRiceCode: (id: string) => {
    return apiService.post<{ success: boolean; message: string }>(`/riceCodes/deleteRiceCode/${id}`);
  },
};
