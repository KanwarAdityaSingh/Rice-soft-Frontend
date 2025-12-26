import * as Dialog from '@radix-ui/react-dialog';
import { useState, useMemo } from 'react';
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  FileText,
  Package,
  Box,
  ShoppingBag,
  Database,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type {
  LotInventoryAuditResponse,
  PacketsInventoryAuditResponse,
  BagsInventoryAuditResponse,
  FinishedGoodsInventoryAuditResponse,
} from '../../../services/inventoryAudit.api';

// Union type for all audit types
type AuditEntry = 
  | (LotInventoryAuditResponse & { _type: 'lot' })
  | (PacketsInventoryAuditResponse & { _type: 'packets' })
  | (BagsInventoryAuditResponse & { _type: 'bags' })
  | (FinishedGoodsInventoryAuditResponse & { _type: 'finished_goods' });

interface InventoryAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  auditType: 'lot' | 'packets' | 'bags' | 'finished_goods';
  data: LotInventoryAuditResponse[] | PacketsInventoryAuditResponse[] | BagsInventoryAuditResponse[] | FinishedGoodsInventoryAuditResponse[];
  loading?: boolean;
}

export function InventoryAuditModal({
  open,
  onOpenChange,
  title,
  subtitle,
  auditType,
  data,
  loading = false,
}: InventoryAuditModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [operationFilter, setOperationFilter] = useState<'all' | 'addition' | 'reduction' | 'adjustment'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Transform and filter data
  const filteredData = useMemo(() => {
    let entries = (data as any[]).map((item) => ({ ...item, _type: auditType })) as AuditEntry[];

    // Filter by operation type
    if (operationFilter !== 'all') {
      entries = entries.filter((e) => e.operation_type === operationFilter);
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      entries = entries.filter((e) => new Date(e.created_at) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      entries = entries.filter((e) => new Date(e.created_at) <= toDate);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter((e) => {
        const searchFields = [
          e.reason,
          e.notes,
          e.batch_number,
          e.user?.name,
        ];
        
        if (e._type === 'lot' && e.lot) {
          searchFields.push(e.lot.lot_number, e.lot.rice_type);
        }
        if (e._type === 'finished_goods' && e.product) {
          searchFields.push(e.product.name);
        }
        if (e._type === 'packets' && e.packaging) {
          searchFields.push(e.packaging.packet_type);
        }
        if (e._type === 'bags') {
          searchFields.push(e.bag_type, e.field_changed);
        }

        return searchFields.some((f) => f?.toLowerCase().includes(q));
      });
    }

    // Sort by date descending (newest first)
    return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [data, auditType, operationFilter, dateFrom, dateTo, searchQuery]);

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRows(next);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'addition':
        return <ArrowUpCircle className="h-4 w-4 text-emerald-500" />;
      case 'reduction':
        return <ArrowDownCircle className="h-4 w-4 text-rose-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-amber-500" />;
    }
  };

  const getOperationBadge = (type: string) => {
    const styles = {
      addition: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      reduction: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      adjustment: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    };
    return styles[type as keyof typeof styles] || styles.adjustment;
  };

  const getTypeIcon = () => {
    switch (auditType) {
      case 'lot':
        return <Database className="h-5 w-5" />;
      case 'packets':
        return <Box className="h-5 w-5" />;
      case 'bags':
        return <ShoppingBag className="h-5 w-5" />;
      case 'finished_goods':
        return <Package className="h-5 w-5" />;
    }
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    const additions = filteredData.filter((e) => e.operation_type === 'addition').length;
    const reductions = filteredData.filter((e) => e.operation_type === 'reduction').length;
    const adjustments = filteredData.filter((e) => e.operation_type === 'adjustment').length;
    return { additions, reductions, adjustments, total: filteredData.length };
  }, [filteredData]);

  const renderEntryDetails = (entry: AuditEntry) => {
    if (entry._type === 'lot') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Lot:</span>
            <span className="ml-2 font-medium">{entry.lot?.lot_number || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Rice Type:</span>
            <span className="ml-2 font-medium">{entry.lot?.rice_type || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Before:</span>
            <span className="ml-2 font-mono">{formatNumber(entry.quantity_before)} kg</span>
          </div>
          <div>
            <span className="text-muted-foreground">After:</span>
            <span className="ml-2 font-mono">{formatNumber(entry.quantity_after)} kg</span>
          </div>
        </div>
      );
    }

    if (entry._type === 'packets') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Type:</span>
            <span className="ml-2 font-medium">{entry.packaging?.packet_type || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Capacity:</span>
            <span className="ml-2 font-medium">{entry.packaging?.holding_capacity || 'N/A'} kg</span>
          </div>
          <div>
            <span className="text-muted-foreground">Before:</span>
            <span className="ml-2 font-mono">{formatNumber(entry.quantity_before, 0)} pcs</span>
          </div>
          <div>
            <span className="text-muted-foreground">After:</span>
            <span className="ml-2 font-mono">{formatNumber(entry.quantity_after, 0)} pcs</span>
          </div>
        </div>
      );
    }

    if (entry._type === 'bags') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Bag Type:</span>
            <span className="ml-2 font-medium uppercase">{entry.bag_type}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Capacity:</span>
            <span className="ml-2 font-medium">{entry.bag_capacity} kg</span>
          </div>
          <div>
            <span className="text-muted-foreground">Field:</span>
            <span className="ml-2 font-medium capitalize">{entry.field_changed.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Change:</span>
            <span className="ml-2 font-mono">
              {formatNumber(entry.quantity_before, 0)} → {formatNumber(entry.quantity_after, 0)}
            </span>
          </div>
        </div>
      );
    }

    if (entry._type === 'finished_goods') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Product:</span>
            <span className="ml-2 font-medium">{entry.product?.name || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Packaging:</span>
            <span className="ml-2 font-medium">
              {entry.packaging ? `${entry.packaging.packet_type} (${entry.packaging.holding_capacity}kg)` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Packets:</span>
            <span className="ml-2 font-mono">
              {formatNumber(entry.packets_before, 0)} → {formatNumber(entry.packets_after, 0)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Weight:</span>
            <span className="ml-2 font-mono">
              {formatNumber(entry.weight_before)} → {formatNumber(entry.weight_after)} kg
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  const getChangeValue = (entry: AuditEntry): { value: number; unit: string } => {
    if (entry._type === 'finished_goods') {
      return { value: entry.packets_change, unit: 'pcs' };
    }
    const qty = 'quantity_change' in entry ? entry.quantity_change : 0;
    const unit = entry._type === 'lot' ? 'kg' : entry._type === 'packets' || entry._type === 'bags' ? 'pcs' : '';
    return { value: qty, unit };
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200" />
        <Dialog.Content className="fixed inset-4 z-50 md:inset-x-[10%] md:inset-y-8 lg:inset-x-[15%] flex flex-col bg-background border border-border rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-border bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    {getTypeIcon()}
                  </div>
                  <div>
                    <Dialog.Title className="text-xl font-bold text-foreground">
                      {title}
                    </Dialog.Title>
                    {subtitle && (
                      <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
                    )}
                  </div>
                </div>
                <Dialog.Close className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-background border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    Total Entries
                  </div>
                  <div className="text-lg font-bold mt-1">{stats.total}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-600 text-xs">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Additions
                  </div>
                  <div className="text-lg font-bold text-emerald-600 mt-1">{stats.additions}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                  <div className="flex items-center gap-2 text-rose-600 text-xs">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Reductions
                  </div>
                  <div className="text-lg font-bold text-rose-600 mt-1">{stats.reductions}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-600 text-xs">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Adjustments
                  </div>
                  <div className="text-lg font-bold text-amber-600 mt-1">{stats.adjustments}</div>
                </div>
              </div>
            </div>

            {/* Search & Filters Bar */}
            <div className="px-4 sm:px-6 pb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                  showFilters || operationFilter !== 'all' || dateFrom || dateTo
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
                {(operationFilter !== 'all' || dateFrom || dateTo) && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded-full">
                    {[operationFilter !== 'all', dateFrom, dateTo].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="px-4 sm:px-6 pb-4 border-t border-border pt-4 bg-muted/30">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Operation Type</label>
                    <select
                      value={operationFilter}
                      onChange={(e) => setOperationFilter(e.target.value as any)}
                      className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="all">All Operations</option>
                      <option value="addition">Additions Only</option>
                      <option value="reduction">Reductions Only</option>
                      <option value="adjustment">Adjustments Only</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setOperationFilter('all');
                      setDateFrom('');
                      setDateTo('');
                      setSearchQuery('');
                    }}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ledger Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Loading audit logs...</span>
                </div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No audit logs found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || operationFilter !== 'all' || dateFrom || dateTo
                    ? 'Try adjusting your filters'
                    : 'Audit logs will appear here when inventory changes occur'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredData.map((entry) => {
                  const isExpanded = expandedRows.has(entry.id);
                  const change = getChangeValue(entry);
                  const isPositive = entry.operation_type === 'addition';
                  const isNegative = entry.operation_type === 'reduction';

                  return (
                    <div
                      key={entry.id}
                      className="border border-border rounded-xl bg-card overflow-hidden transition-all hover:shadow-md"
                    >
                      {/* Main Row */}
                      <button
                        onClick={() => toggleRow(entry.id)}
                        className="w-full p-4 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors"
                      >
                        {/* Date & Time */}
                        <div className="flex-shrink-0 w-20 sm:w-24">
                          <div className="text-sm font-semibold">{formatDate(entry.created_at)}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(entry.created_at)}
                          </div>
                        </div>

                        {/* Operation Badge */}
                        <div className="flex-shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${getOperationBadge(
                              entry.operation_type
                            )}`}
                          >
                            {getOperationIcon(entry.operation_type)}
                            <span className="capitalize hidden sm:inline">{entry.operation_type}</span>
                          </span>
                        </div>

                        {/* Change Value */}
                        <div className="flex-shrink-0 text-right min-w-[80px]">
                          <div
                            className={`text-lg font-bold font-mono ${
                              isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-amber-600'
                            }`}
                          >
                            {isPositive ? '+' : isNegative ? '-' : ''}
                            {formatNumber(Math.abs(change.value), change.unit === 'kg' ? 2 : 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">{change.unit}</div>
                        </div>

                        {/* Reason */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{entry.reason}</div>
                          {entry.batch_number && (
                            <div className="text-xs text-muted-foreground truncate">
                              Batch: {entry.batch_number}
                            </div>
                          )}
                        </div>

    
                        {/* Expand Icon - visually separated */}
                        <div className="flex-shrink-0 p-1.5 rounded-md hover:bg-muted/50 transition-colors">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-border bg-muted/20">
                          <div className="pt-4 space-y-4">
                            {renderEntryDetails(entry)}

                            {/* Notes */}
                            {entry.notes && (
                              <div className="p-3 rounded-lg bg-background border border-border">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
                                <div className="text-sm whitespace-pre-wrap">{entry.notes}</div>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                              {entry.reference_type && (
                                <div>
                                  <span className="font-medium">Reference:</span>{' '}
                                  <span className="capitalize">{entry.reference_type.replace(/_/g, ' ')}</span>
                                </div>
                              )}
                              {entry.user && (
                                <div className="lg:hidden flex items-center gap-1.5">
                                  <User className="h-3 w-3" />
                                  <span className="font-medium">By:</span> {entry.user.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-border px-4 sm:px-6 py-3 bg-muted/30 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {data.length} entries
            </div>
            <Dialog.Close className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

