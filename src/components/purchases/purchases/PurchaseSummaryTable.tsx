import { useState, useEffect, useMemo } from 'react';
import { Calculator, Calendar, Info, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { SearchBar } from '../../admin/shared/SearchBar';
import { useSaudas } from '../../../hooks/useSaudas';
import { purchaseSummaryAPI } from '../../../services/purchaseSummary.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { vendorsAPI } from '../../../services/vendors.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { getCompletionStatus, formatCompletionPercentage, formatWeightDisplay } from '../../../utils/saudaCompletion';
import { GodownFilterSelect } from '../../shared/GodownFilterSelect';
import type { SaudaPurchaseSummary, RiceCode, RiceType, Vendor, Sauda } from '../../../types/entities';

export function PurchaseSummaryTable() {
  const { saudas, loading: saudasLoading } = useSaudas();

  const [godownFilter, setGodownFilter] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [saudaSummaries, setSaudaSummaries] = useState<SaudaPurchaseSummary[]>([]);
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

  // Filter saudas by date (include all statuses: draft, active, completed)
  const filteredSaudas = useMemo(() => {
    return saudas.filter(s => {
      const createdAt = new Date(s.created_at);
      if (startDate && createdAt < new Date(startDate)) return false;
      if (endDate && createdAt > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [saudas, startDate, endDate]);

  // Fetch summaries when saudas change
  useEffect(() => {
    const fetchSummaries = async () => {
      if (filteredSaudas.length === 0) {
        setSaudaSummaries([]);
        return;
      }
      
      setLoadingSummaries(true);
      try {
        const summaries = await Promise.all(
          filteredSaudas.map(s =>
            purchaseSummaryAPI.getSaudaSummary(s.id, 0, godownFilter).catch(() => null)
          )
        );
        setSaudaSummaries(summaries.filter((s): s is SaudaPurchaseSummary => s !== null));
      } catch (error) {
        console.error('Failed to fetch summaries:', error);
      } finally {
        setLoadingSummaries(false);
      }
    };
    fetchSummaries();
  }, [filteredSaudas, godownFilter]);

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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Filter summaries by search query
  const filteredSummaries = useMemo(() => {
    if (!searchQuery) return saudaSummaries;
    const q = searchQuery.toLowerCase();
    return saudaSummaries.filter(summary => {
      const saudaInfo = getSaudaInfo(summary.sauda_id);
      const vendorName = getVendorName(saudaInfo?.purchaser_id).toLowerCase();
      const riceCodeName = getRiceCodeName(saudaInfo?.rice_code_id).toLowerCase();
      const riceTypeLabel = getRiceTypeLabel(saudaInfo?.rice_type, riceTypes).toLowerCase();
      return vendorName.includes(q) || riceCodeName.includes(q) || riceTypeLabel.includes(q);
    });
  }, [saudaSummaries, searchQuery, saudas, vendors, riceCodes, riceTypes]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredSummaries.reduce((acc, s) => ({
      totalLots: acc.totalLots + s.total_lots,
      totalWeight: acc.totalWeight + s.total_weight,
      baseAmount: acc.baseAmount + s.base_amount,
      finalAmount: acc.finalAmount + s.final_total_amount,
    }), { totalLots: 0, totalWeight: 0, baseAmount: 0, finalAmount: 0 });
  }, [filteredSummaries]);

  const loading = saudasLoading || loadingSummaries;

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
        {/* Search */}
        <div className="flex-1 min-w-0">
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Search by vendor, rice code or type..." 
          />
        </div>

        <GodownFilterSelect
          value={godownFilter}
          onChange={setGodownFilter}
          label="Scope lots & ISPs (optional)"
        />

        {/* Date Filters */}
        <div className="flex gap-2 items-center flex-wrap">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate || undefined}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
            placeholder="Start Date"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && filteredSummaries.length > 0 && (
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
      ) : filteredSummaries.length === 0 ? (
        <EmptyState 
          icon={Calculator} 
          title="No purchase summaries found" 
          description="No saudas with lots found for the selected date range."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Rice Code / Type</th>
                <th className="text-center py-3 px-4 text-sm font-semibold">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Lots</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Weight</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Rate</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Base Amount</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Final Amount</th>
                <th className="text-center py-3 px-4 text-sm font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummaries.map((summary) => {
                const saudaInfo = getSaudaInfo(summary.sauda_id);
                const isExpanded = expandedId === summary.sauda_id;
                const completionStatus = summary.sauda_details?.completion_percentage !== null && summary.sauda_details?.completion_percentage !== undefined
                  ? getCompletionStatus(summary.sauda_details.completion_percentage)
                  : null;
                
                return (
                  <>
                    <tr 
                      key={summary.sauda_id} 
                      className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{getVendorName(saudaInfo?.purchaser_id)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div className="font-medium">{getRiceCodeName(saudaInfo?.rice_code_id)}</div>
                          <div className="text-xs text-muted-foreground">
                            {getRiceTypeLabel(saudaInfo?.rice_type, riceTypes) || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {completionStatus ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${completionStatus.bgColor} ${completionStatus.color} border ${completionStatus.borderColor}`}>
                              {formatCompletionPercentage(summary.sauda_details!.completion_percentage)}
                            </span>
                            {summary.sauda_details?.quantity && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatWeightDisplay(summary.sauda_details.received_until_now, summary.sauda_details.quantity)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">{summary.total_lots}</td>
                      <td className="py-3 px-4 text-right text-sm">{summary.total_weight.toFixed(2)} kg</td>
                      <td className="py-3 px-4 text-right text-sm">₹{saudaInfo?.rate?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 px-4 text-right text-sm">₹{summary.base_amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-sm font-bold text-emerald-600">
                        ₹{summary.final_total_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleExpand(summary.sauda_id)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr key={`${summary.sauda_id}-expanded`}>
                        <td colSpan={9} className="p-4 bg-muted/20 border-b border-border">
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold">Calculation Breakdown</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
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
                              <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <div className="text-muted-foreground text-xs">Net Payable</div>
                                <div className="font-bold text-emerald-600">₹{summary.net_payable.toFixed(2)}</div>
                              </div>
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
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
