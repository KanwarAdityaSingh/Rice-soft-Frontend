import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Calculator, ChevronDown, ChevronUp, Calendar, Info } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useSaudas } from '../../../hooks/useSaudas';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { purchaseSummaryAPI } from '../../../services/purchaseSummary.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { vendorsAPI } from '../../../services/vendors.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import type { SaudaPurchaseSummary, ISPPurchaseSummary, RiceCode, RiceType, Vendor, Sauda, InwardSlipPass } from '../../../types/entities';

type ViewMode = 'sauda' | 'isp';

export function PurchaseSummaryTable() {
  const { saudas, loading: saudasLoading } = useSaudas();
  const { inwardSlipPasses, loading: ispsLoading } = useInwardSlipPasses();
  
  const [viewMode, setViewMode] = useState<ViewMode>('sauda');
  const [igstPercentage, setIgstPercentage] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [saudaSummaries, setSaudaSummaries] = useState<SaudaPurchaseSummary[]>([]);
  const [ispSummaries, setISPSummaries] = useState<ISPPurchaseSummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Load reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [codes, types, vendorsList] = await Promise.all([
          riceCodesAPI.getAllRiceCodes(),
          riceCodesAPI.getRiceTypes(),
          vendorsAPI.getAllVendors()
        ]);
        setRiceCodes(codes);
        setRiceTypes(types);
        setVendors(vendorsList);
      } catch (error) {
        console.error('Failed to fetch reference data:', error);
      }
    };
    fetchReferenceData();
  }, []);

  // Filter saudas/ISPs by date
  const filteredSaudas = useMemo(() => {
    return saudas.filter(s => {
      if (s.status !== 'active' && s.status !== 'completed') return false;
      const createdAt = new Date(s.created_at);
      if (startDate && createdAt < new Date(startDate)) return false;
      if (endDate && createdAt > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [saudas, startDate, endDate]);

  const filteredISPs = useMemo(() => {
    return inwardSlipPasses.filter(isp => {
      const ispDate = new Date(isp.date);
      if (startDate && ispDate < new Date(startDate)) return false;
      if (endDate && ispDate > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [inwardSlipPasses, startDate, endDate]);

  // Fetch summaries when view mode or filters change
  useEffect(() => {
    const fetchSummaries = async () => {
      setLoadingSummaries(true);
      try {
        if (viewMode === 'sauda' && filteredSaudas.length > 0) {
          const summaries = await Promise.all(
            filteredSaudas.map(s => 
              purchaseSummaryAPI.getSaudaSummary(s.id, igstPercentage).catch(() => null)
            )
          );
          setSaudaSummaries(summaries.filter((s): s is SaudaPurchaseSummary => s !== null));
        } else if (viewMode === 'isp' && filteredISPs.length > 0) {
          const summaries = await Promise.all(
            filteredISPs.map(isp => 
              purchaseSummaryAPI.getISPSummary(isp.id, igstPercentage).catch(() => null)
            )
          );
          setISPSummaries(summaries.filter((s): s is ISPPurchaseSummary => s !== null));
        } else {
          setSaudaSummaries([]);
          setISPSummaries([]);
        }
      } catch (error) {
        console.error('Failed to fetch summaries:', error);
      } finally {
        setLoadingSummaries(false);
      }
    };
    fetchSummaries();
  }, [viewMode, filteredSaudas, filteredISPs, igstPercentage]);

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return 'N/A';
    const riceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : 'Unknown';
  };

  const getVendorName = (vendorId: string | null | undefined): string => {
    if (!vendorId) return 'N/A';
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.business_name : 'Unknown';
  };

  const getSaudaInfo = (saudaId: string): Sauda | undefined => {
    return saudas.find(s => s.id === saudaId);
  };

  const getISPInfo = (ispId: string): InwardSlipPass | undefined => {
    return inwardSlipPasses.find(isp => isp.id === ispId);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Calculate totals
  const totals = useMemo(() => {
    if (viewMode === 'sauda') {
      return saudaSummaries.reduce((acc, s) => ({
        totalLots: acc.totalLots + s.total_lots,
        totalWeight: acc.totalWeight + s.total_weight,
        baseAmount: acc.baseAmount + s.base_amount,
        finalAmount: acc.finalAmount + s.final_total_amount,
      }), { totalLots: 0, totalWeight: 0, baseAmount: 0, finalAmount: 0 });
    } else {
      return ispSummaries.reduce((acc, s) => ({
        totalLots: acc.totalLots + s.total_lots,
        totalWeight: acc.totalWeight + s.total_weight,
        baseAmount: acc.baseAmount + s.base_amount,
        finalAmount: acc.finalAmount + s.final_total_amount,
      }), { totalLots: 0, totalWeight: 0, baseAmount: 0, finalAmount: 0 });
    }
  }, [viewMode, saudaSummaries, ispSummaries]);

  const loading = saudasLoading || ispsLoading || loadingSummaries;

  return (
    <div>
      {/* Info Banner */}
      <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-600 dark:text-blue-400">
          <p className="font-medium">Real-time Purchase Summary</p>
          <p className="text-xs mt-1 text-muted-foreground">
            This page shows calculated summaries from saudas and lots. Amounts are computed in real-time based on current data.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* View Mode Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode('sauda')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'sauda' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-background hover:bg-muted'
            }`}
          >
            By Sauda
          </button>
          <button
            onClick={() => setViewMode('isp')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'isp' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-background hover:bg-muted'
            }`}
          >
            By ISP
          </button>
        </div>

        {/* Date Filters */}
        <div className="flex gap-2 items-center">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
            placeholder="Start Date"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
            placeholder="End Date"
          />
        </div>

        {/* IGST Input */}
        <div className="flex gap-2 items-center">
          <label className="text-sm text-muted-foreground whitespace-nowrap">IGST %:</label>
          <input
            type="number"
            value={igstPercentage}
            onChange={(e) => setIgstPercentage(parseFloat(e.target.value) || 0)}
            className="w-20 px-3 py-2 border border-border rounded-lg bg-background text-sm"
            placeholder="0"
            min="0"
            max="100"
            step="0.1"
          />
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && (saudaSummaries.length > 0 || ispSummaries.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{totals.totalLots}</div>
            <div className="text-xs text-muted-foreground">Total Lots</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{totals.totalWeight.toFixed(2)} kg</div>
            <div className="text-xs text-muted-foreground">Total Weight</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">₹{totals.baseAmount.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Base Amount</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">₹{totals.finalAmount.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Final Total</div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : viewMode === 'sauda' ? (
        saudaSummaries.length === 0 ? (
          <EmptyState 
            icon={ShoppingCart} 
            title="No purchase summaries found" 
            description="No saudas with lots found for the selected date range."
          />
        ) : (
          <div className="space-y-4">
            {saudaSummaries.map((summary) => {
              const saudaInfo = getSaudaInfo(summary.sauda_id);
              const isExpanded = expandedId === summary.sauda_id;
              
              return (
                <div
                  key={summary.sauda_id}
                  className="rounded-xl border border-border overflow-hidden"
                >
                  {/* Header */}
                  <div 
                    className="p-4 bg-gradient-to-r from-background to-muted/40 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(summary.sauda_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Calculator className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {getVendorName(saudaInfo?.purchaser_id)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getRiceCodeName(saudaInfo?.rice_code_id)} • {getRiceTypeLabel(saudaInfo?.rice_type, riceTypes) || 'N/A'} • ₹{saudaInfo?.rate}/kg
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-600">
                            ₹{summary.final_total_amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {summary.total_lots} lots • {summary.total_weight.toFixed(2)} kg
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 border-t border-border bg-muted/20">
                      <h4 className="text-sm font-semibold mb-3">Calculation Breakdown</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">Base Amount</div>
                          <div className="font-medium">₹{summary.base_amount.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">Cash Discount</div>
                          <div className="font-medium text-red-500">-₹{summary.cash_discount_amount.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">After Discount</div>
                          <div className="font-medium">₹{summary.amount_after_discount.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">Broker Commission</div>
                          <div className="font-medium text-blue-500">+₹{summary.broker_commission_amount.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">Transport Cost</div>
                          <div className="font-medium text-blue-500">+₹{summary.transportation_cost.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">IGST ({igstPercentage}%)</div>
                          <div className="font-medium text-blue-500">+₹{summary.igst_amount.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg flex justify-between items-center">
                        <span className="font-semibold">Net Payable</span>
                        <span className="text-xl font-bold text-emerald-600">₹{summary.net_payable.toFixed(2)}</span>
                      </div>

                      {/* Lots list */}
                      {summary.lot_details.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold mb-2">Lots ({summary.lot_details.length})</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-2">Lot #</th>
                                  <th className="text-right py-2 px-2">Bags</th>
                                  <th className="text-right py-2 px-2">Weight</th>
                                  <th className="text-right py-2 px-2">Rate</th>
                                  <th className="text-right py-2 px-2">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summary.lot_details.map(lot => (
                                  <tr key={lot.id} className="border-b border-border/40">
                                    <td className="py-2 px-2">{lot.lot_number}</td>
                                    <td className="py-2 px-2 text-right">{lot.no_of_bags}</td>
                                    <td className="py-2 px-2 text-right">{lot.received_weight.toFixed(2)} kg</td>
                                    <td className="py-2 px-2 text-right">₹{lot.rate.toFixed(2)}</td>
                                    <td className="py-2 px-2 text-right font-medium">₹{lot.amount.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        ispSummaries.length === 0 ? (
          <EmptyState 
            icon={ShoppingCart} 
            title="No purchase summaries found" 
            description="No ISPs with lots found for the selected date range."
          />
        ) : (
          <div className="space-y-4">
            {ispSummaries.map((summary) => {
              const ispInfo = getISPInfo(summary.inward_slip_pass_id);
              const isExpanded = expandedId === summary.inward_slip_pass_id;
              
              return (
                <div
                  key={summary.inward_slip_pass_id}
                  className="rounded-xl border border-border overflow-hidden"
                >
                  {/* Header */}
                  <div 
                    className="p-4 bg-gradient-to-r from-background to-muted/40 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(summary.inward_slip_pass_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Calculator className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {ispInfo?.slip_number || 'ISP'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {ispInfo?.party_name} • {ispInfo?.vehicle_number} • {ispInfo?.date ? new Date(ispInfo.date).toLocaleDateString() : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-600">
                            ₹{summary.final_total_amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {summary.total_lots} lots • {summary.total_weight.toFixed(2)} kg • {summary.saudas.length} saudas
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 border-t border-border bg-muted/20">
                      <h4 className="text-sm font-semibold mb-3">Calculation Breakdown</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">Base Amount</div>
                          <div className="font-medium">₹{summary.base_amount.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">Cash Discount</div>
                          <div className="font-medium text-red-500">-₹{summary.cash_discount_amount.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">After Discount</div>
                          <div className="font-medium">₹{summary.amount_after_discount.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">Broker Commission</div>
                          <div className="font-medium text-blue-500">+₹{summary.broker_commission_amount.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">Transport Cost</div>
                          <div className="font-medium text-blue-500">+₹{summary.transportation_cost.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <div className="text-muted-foreground text-xs">IGST ({igstPercentage}%)</div>
                          <div className="font-medium text-blue-500">+₹{summary.igst_amount.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg flex justify-between items-center">
                        <span className="font-semibold">Net Payable</span>
                        <span className="text-xl font-bold text-emerald-600">₹{summary.net_payable.toFixed(2)}</span>
                      </div>

                      {/* Saudas breakdown */}
                      {summary.saudas.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold mb-2">Saudas ({summary.saudas.length})</h5>
                          <div className="space-y-2">
                            {summary.saudas.map(sauda => (
                              <div key={sauda.sauda_id} className="p-3 bg-background rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="text-sm font-medium">
                                    {getRiceCodeName(sauda.sauda_details.rice_code_id)} • {getRiceTypeLabel(sauda.sauda_details.rice_type, riceTypes) || 'N/A'}
                                  </div>
                                  <div className="text-sm font-bold">₹{sauda.final_total_amount.toFixed(2)}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {sauda.total_lots} lots • {sauda.total_weight.toFixed(2)} kg • ₹{sauda.sauda_details.rate}/kg
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

