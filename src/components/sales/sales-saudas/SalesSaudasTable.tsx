import { useState, useMemo, useEffect, useCallback } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { FileText, Eye, MoreVertical, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { useSalesSaudas } from '../../../hooks/useSalesSaudas';
import { useSalesSaudasData } from './SalesSaudasDataContext';
import { SalesSaudaFormModal } from './SalesSaudaFormModal';
import { SalesSaudaDetailModal } from './SalesSaudaDetailModal';
import { InvoiceDispatchFormModal } from '../invoice-dispatches/InvoiceDispatchFormModal';
import { salesSaudasAPI } from '../../../services/salesSaudas.api';
import { toast } from '../../../utils/toast';
import {
  buildFinancialYearApiFilterOptions,
  getCurrentFinancialYearApiValue,
} from '../../../utils/financialYear';
import {
  formatBagsInput,
  formatQty,
  fulfillmentLabelText,
  summarizeSaudaFulfillment,
  type SaudaFulfillmentSummary,
} from '../../../utils/salesSaudaFulfillment';
import {
  isGodownTransfer,
  SALES_MOVEMENT_TYPE_FILTER_OPTIONS,
  type SalesMovementTypeFilter,
} from '../../../constants/sales-movement-types';
import { useGodowns } from '../../../hooks/useGodowns';
import type { SalesSauda, SalesSaudaStatus } from '../../../types/sales';

type FulfillmentCell = SaudaFulfillmentSummary | 'loading' | 'error';

interface SalesSaudasTableProps {
  onRefreshRef?: React.MutableRefObject<(() => void) | null>;
}

const statusOptions: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'order', label: 'Order' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function SalesSaudasTable({ onRefreshRef }: SalesSaudasTableProps = {}) {
  const [statusFilter, setStatusFilter] = useState<SalesSaudaStatus | ''>('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<SalesMovementTypeFilter>('all');
  const [financialYearFilter, setFinancialYearFilter] = useState<string | undefined>(
    () => getCurrentFinancialYearApiValue(),
  );
  const { salesSaudas, loading, deleteSauda, finalize, refetch } = useSalesSaudas({
    status: statusFilter || undefined,
    financial_year: financialYearFilter,
    movement_type: movementTypeFilter,
  });
  const { salesParties, products, salesPartiesLoading } = useSalesSaudasData();
  const { godowns } = useGodowns(true);
  const godownName = (id: string | null | undefined) =>
    id ? godowns.find((g) => g.id === id)?.name ?? id.slice(0, 8) : '–';

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSauda, setSelectedSauda] = useState<SalesSauda | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dispatchFromSaudaId, setDispatchFromSaudaId] = useState<string | null>(null);
  /** List API omits lines — fulfillment comes from GET /sales-saudas/:id */
  const [fulfillmentById, setFulfillmentById] = useState<Record<string, FulfillmentCell>>({});

  useEffect(() => {
    if (onRefreshRef) onRefreshRef.current = refetch;
  }, [refetch, onRefreshRef]);

  const financialYearOptions = useMemo(
    () => buildFinancialYearApiFilterOptions(salesSaudas.map((s) => s.financial_year)),
    [salesSaudas],
  );

  const salesPartyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of salesParties) {
      const name = p.business_name?.trim();
      if (name) map.set(p.id, name);
    }
    return map;
  }, [salesParties]);

  const getSalesPartyName = (sauda: Pick<SalesSauda, 'sales_party_id' | 'sales_party_name'>) => {
    const joined = sauda.sales_party_name?.trim();
    if (joined) return joined;
    return salesPartyNameById.get(sauda.sales_party_id) ?? '';
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return salesSaudas.filter((s) => {
      const partyName = getSalesPartyName(s).toLowerCase();
      const orderNum = (s.order_number ?? '').toLowerCase();
      const salesmanName = (s.salesman_name ?? '').toLowerCase();
      return (
        partyName.includes(q) ||
        orderNum.includes(q) ||
        salesmanName.includes(q) ||
        s.sauda_date.includes(q)
      );
    });
  }, [salesSaudas, searchQuery, salesPartyNameById]);

  const orderSaudaIdsKey = useMemo(
    () =>
      filtered
        .filter((s) => s.status === 'order')
        .map((s) => s.id)
        .sort()
        .join(','),
    [filtered],
  );

  const loadFulfillment = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setFulfillmentById((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = 'loading';
      return next;
    });
    await Promise.all(
      ids.map(async (id) => {
        try {
          const detail = await salesSaudasAPI.getById(id);
          setFulfillmentById((prev) => ({
            ...prev,
            [id]: summarizeSaudaFulfillment(detail),
          }));
        } catch {
          setFulfillmentById((prev) => ({ ...prev, [id]: 'error' }));
        }
      }),
    );
  }, []);

  useEffect(() => {
    const ids = orderSaudaIdsKey ? orderSaudaIdsKey.split(',') : [];
    void loadFulfillment(ids);
  }, [orderSaudaIdsKey, loadFulfillment]);

  const refreshListAndFulfillment = useCallback(() => {
    void refetch();
    const ids = orderSaudaIdsKey ? orderSaudaIdsKey.split(',') : [];
    void loadFulfillment(ids);
  }, [refetch, orderSaudaIdsKey, loadFulfillment]);

  const handleDelete = async () => {
    if (!selectedSauda) return;
    try {
      await deleteSauda(selectedSauda.id);
      setDeleteDialogOpen(false);
      setSelectedSauda(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinalize = async (sauda: SalesSauda) => {
    try {
      await finalize(sauda.id);
      toast.success(
        isGodownTransfer(sauda) ? 'Godown transfer finalized' : 'Sales Sauda finalized',
        isGodownTransfer(sauda)
          ? 'Create a dispatch from the source godown to move stock.'
          : 'You can now create an invoice dispatch against it.',
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by sales party, salesman, order number..."
        />
        <FilterDropdown
          label="Financial year"
          options={financialYearOptions}
          value={financialYearFilter}
          onChange={setFinancialYearFilter}
        />
        <FilterDropdown
          label="Status"
          value={statusFilter || undefined}
          options={statusOptions}
          onChange={(v) => setStatusFilter((v ?? '') as SalesSaudaStatus | '')}
        />
        <FilterDropdown
          label="Movement"
          value={movementTypeFilter}
          options={SALES_MOVEMENT_TYPE_FILTER_OPTIONS}
          onChange={(v) => setMovementTypeFilter((v as SalesMovementTypeFilter) || 'all')}
          hideAllOption
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No sales saudas"
            description={
              financialYearFilter
                ? `No sales saudas found for ${financialYearOptions.find((o) => o.value === financialYearFilter)?.label ?? financialYearFilter}. Try another financial year or adjust filters.`
                : 'Create a sales sauda or adjust filters.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Sales Party</th>
                  <th className="text-left p-3 font-medium">Movement</th>
                  <th className="text-left p-3 font-medium">Salesman</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Fulfillment</th>
                  <th className="text-left p-3 font-medium">Order #</th>
                  <th className="text-left p-3 font-medium">FY</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Payment Terms</th>
                  <th className="w-10 p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const partyName = getSalesPartyName(s);
                  const showLoading = salesPartiesLoading && !partyName && !s.sales_party_name;
                  const fulfillment = s.status === 'order' ? fulfillmentById[s.id] : undefined;
                  const transfer = isGodownTransfer(s);
                  return (
                  <tr key={s.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      {transfer ? (
                        <div>
                          <p className="font-medium">
                            {godownName(s.from_godown_id)} → {godownName(s.to_godown_id)}
                          </p>
                          {partyName ? (
                            <p className="text-[11px] text-muted-foreground">{partyName}</p>
                          ) : null}
                        </div>
                      ) : showLoading ? (
                        'Loading...'
                      ) : (
                        partyName || '–'
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          transfer
                            ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {transfer ? 'Transfer' : 'Sale'}
                      </span>
                    </td>
                    <td className="p-3">{s.salesman_name?.trim() || '–'}</td>
                    <td className="p-3 uppercase">{s.sauda_type ?? '–'}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.status === 'draft'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : s.status === 'order'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {s.status !== 'order' ? (
                        <span className="text-xs text-muted-foreground">–</span>
                      ) : fulfillment === 'loading' || fulfillment === undefined ? (
                        <span className="text-xs text-muted-foreground">Loading…</span>
                      ) : fulfillment === 'error' ? (
                        <span className="text-xs text-muted-foreground">–</span>
                      ) : (
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              fulfillment.label === 'fully_dispatched'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : fulfillment.label === 'partial'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {fulfillmentLabelText(fulfillment.label)}
                          </span>
                          {fulfillment.hasLines && (
                            <p className="text-[11px] tabular-nums text-muted-foreground">
                              {fulfillment.hasBags &&
                              fulfillment.remainingBags != null &&
                              fulfillment.orderedBags != null ? (
                                <>
                                  {formatBagsInput(fulfillment.remainingBags) || '0'} bags left of{' '}
                                  {formatBagsInput(fulfillment.orderedBags) || '0'}
                                </>
                              ) : (
                                <>
                                  {formatQty(fulfillment.remaining)} left of{' '}
                                  {formatQty(fulfillment.ordered)}
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{s.order_number ?? '–'}</td>
                    <td className="p-3 text-muted-foreground">{s.financial_year ?? '–'}</td>
                    <td className="p-3">{s.sauda_date}</td>
                    <td className="p-3">
                      {s.payment_terms === null || s.payment_terms === undefined
                        ? '–'
                        : `${s.payment_terms} days`}
                    </td>
                    <td className="p-3">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="rounded-lg p-2 hover:bg-muted">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="glass min-w-[10rem] rounded-xl p-1 shadow-lg z-50"
                            sideOffset={8}
                            align="end"
                          >
                            <DropdownMenu.Item
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                              onSelect={() => setDetailId(s.id)}
                            >
                              <Eye className="h-4 w-4" /> View
                            </DropdownMenu.Item>
                            {s.status === 'draft' && (
                              <>
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                                  onSelect={() => setEditId(s.id)}
                                >
                                  <Edit2 className="h-4 w-4" /> Edit
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                                  onSelect={() => handleFinalize(s)}
                                >
                                  <CheckCircle className="h-4 w-4" /> Finalize
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onSelect={() => {
                                    setSelectedSauda(s);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenu.Item>
                              </>
                            )}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SalesSaudaFormModal
        open={!!editId}
        onOpenChange={(open) => !open && setEditId(null)}
        saudaId={editId}
        onSuccess={refreshListAndFulfillment}
      />
      <SalesSaudaDetailModal
        saudaId={detailId}
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        getCustomerName={(id) =>
          salesPartyNameById.get(id) ||
          salesSaudas.find((s) => s.sales_party_id === id)?.sales_party_name?.trim() ||
          '–'
        }
        getProductName={(id) => products.find((p) => p.id === id)?.name ?? id}
        onCreateDispatch={(id) => {
          setDetailId(null);
          setDispatchFromSaudaId(id);
        }}
      />
      <InvoiceDispatchFormModal
        open={!!dispatchFromSaudaId}
        onOpenChange={(open) => !open && setDispatchFromSaudaId(null)}
        initialSalesSaudaId={dispatchFromSaudaId}
        onSuccess={refreshListAndFulfillment}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Sales Sauda"
        description="This draft sales sauda will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
