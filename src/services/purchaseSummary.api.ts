import { apiService } from './api';
import type {
  SaudaPurchaseSummary,
  ISPPurchaseSummary,
  KaantaPurchaseOverview,
  KaantaPurchaseIspDetail,
} from '../types/entities';

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

  /** Kaanta-linked rollup + ISP rows (≥1 kaanta) for a sauda. */
  getKaantaPurchaseOverview: (saudaId: string, godown_id?: string) => {
    const params = new URLSearchParams();
    if (godown_id) params.set('godown_id', godown_id);
    const q = params.toString();
    const path = `/purchase-summary/sauda/${saudaId}/kaanta-overview`;
    return apiService.get<KaantaPurchaseOverview>(q ? `${path}?${q}` : path);
  },

  /** Kaantas + lots linked via kaanta for one sauda + ISP (404 if none). */
  getKaantaPurchaseIspDetail: (saudaId: string, ispId: string, godown_id?: string) => {
    const params = new URLSearchParams();
    if (godown_id) params.set('godown_id', godown_id);
    const q = params.toString();
    const base = `/purchase-summary/sauda/${saudaId}/inward-slip-passes/${ispId}/kaanta-lots`;
    return apiService.get<KaantaPurchaseIspDetail>(q ? `${base}?${q}` : base);
  },
};

