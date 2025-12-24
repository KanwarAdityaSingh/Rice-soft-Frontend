import { apiService } from './api';
import type { SaudaPurchaseSummary, ISPPurchaseSummary } from '../types/entities';

export const purchaseSummaryAPI = {
  // Get purchase summary for a single sauda
  getSaudaSummary: (saudaId: string, igst_percentage?: number) => {
    let url = `/purchase-summary/sauda/${saudaId}`;
    if (igst_percentage !== undefined) {
      url += `?igst_percentage=${igst_percentage}`;
    }
    return apiService.get<SaudaPurchaseSummary>(url);
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

