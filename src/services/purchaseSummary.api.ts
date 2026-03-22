import { apiService } from './api';
import type { SaudaPurchaseSummary, ISPPurchaseSummary } from '../types/entities';

export const purchaseSummaryAPI = {
  // Get purchase summary for a single sauda
  getSaudaSummary: (saudaId: string, igst_percentage?: number, godown_id?: string) => {
    const params = new URLSearchParams();
    if (igst_percentage !== undefined) params.set('igst_percentage', String(igst_percentage));
    if (godown_id) params.set('godown_id', godown_id);
    const q = params.toString();
    return apiService.get<SaudaPurchaseSummary>(
      q ? `/purchase-summary/sauda/${saudaId}?${q}` : `/purchase-summary/sauda/${saudaId}`
    );
  },

  // Get purchase summary for an ISP (aggregates all saudas in that ISP)
  getISPSummary: (ispId: string, igst_percentage?: number) => {
    let url = `/purchase-summary/isp/${ispId}`;
    if (igst_percentage !== undefined) {
      url += `?igst_percentage=${igst_percentage}`;
    }
    return apiService.get<ISPPurchaseSummary>(url);
  },
};

