import { apiService } from './api';
import type { RiceCategory, RiceCode, RiceType } from '../types/entities';

const RICE_CATEGORIES: RiceCategory[] = ['basmati', 'non_basmati'];

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
    const categories = category ? [category] : RICE_CATEGORIES;
    const results = await Promise.allSettled(
      categories.map((cat) =>
        apiService.get<RiceCode[]>(
          `/riceCodes/getAllRiceCodes?category=${encodeURIComponent(cat)}`,
        ),
      ),
    );
    const merged: RiceCode[] = [];
    const seen = new Set<string>();
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const row of result.value) {
        if (seen.has(row.rice_code_id)) continue;
        seen.add(row.rice_code_id);
        merged.push(row);
      }
    }
    if (!category && merged.length === 0) {
      const firstError = results.find((r) => r.status === 'rejected') as
        | PromiseRejectedResult
        | undefined;
      if (firstError) throw firstError.reason;
    }
    return merged;
  },

  /** Resolve a rice code by id when it is missing from a bulk catalog fetch. */
  getRiceCodeById: async (id: string): Promise<RiceCode | null> => {
    for (const cat of RICE_CATEGORIES) {
      try {
        const rows = await apiService.get<RiceCode[]>(
          `/riceCodes/getAllRiceCodes?category=${encodeURIComponent(cat)}`,
        );
        const found = rows.find((row) => row.rice_code_id === id);
        if (found) return found;
      } catch {
        // try next category
      }
    }
    return null;
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
    const rows = await Promise.all(
      RICE_CATEGORIES.map((cat) => riceCodesAPI.getRiceVariants(cat)),
    );
    const byValue = new Map<string, RiceType>();
    for (const variant of rows.flat()) {
      byValue.set(variant.value, variant);
    }
    return [...byValue.values()];
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
