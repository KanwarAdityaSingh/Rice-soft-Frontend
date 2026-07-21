import { useState, useMemo, useEffect, useCallback } from 'react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import {
  ClipboardCheck,
  Download,
  Eye,
  FileDigit,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  MoreVertical,
  Truck,
  Undo2,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { useVehicleMap } from '../../../hooks/useVehicles';
import { InvoiceDispatchDetailModal } from './InvoiceDispatchDetailModal';
import { InvoiceDispatchFormModal } from './InvoiceDispatchFormModal';
import { EWayBillPreviewDialog } from './EWayBillPreviewDialog';
import { ReceivingDocUploadModal } from './ReceivingDocUploadModal';
import { useProducts } from '../../../hooks/useProducts';
import { useGodowns } from '../../../hooks/useGodowns';
import {
  buildFinancialYearApiFilterOptions,
  getCurrentFinancialYearApiValue,
} from '../../../utils/financialYear';
import {
  buildEWayBodyFromDispatch,
  downloadBillOfSupplyForDispatch,
} from '../../../utils/billOfSupplyDownload';
import { toast } from '../../../utils/toast';
import { extractApiErrorMessage } from '../../../utils/mastersIndiaSales';
import {
  deleteInvoiceDispatchConfirmDescription,
  extractInvoiceDispatchDeleteError,
  invoiceDispatchDeleteToastTitle,
} from '../../../utils/invoiceDispatchDelete';
import type {
  CreateEWayBillRequest,
  EWayBill,
  EWayBillPreviewResponse,
  InvoiceDispatch,
  InvoiceDispatchStatus,
} from '../../../types/sales';

function ActionTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className="z-50 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md"
        >
          {label}
          <Tooltip.Arrow className="fill-foreground" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function downloadEWayBillPdf(ewb: EWayBill): boolean {
  const url = ewb.print_url?.trim();
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
}

interface InvoiceDispatchesTableProps {
  onRefreshRef?: React.MutableRefObject<(() => void) | null>;
}

const statusOptions: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function InvoiceDispatchesTable({ onRefreshRef }: InvoiceDispatchesTableProps = {}) {
  const [statusFilter, setStatusFilter] = useState<InvoiceDispatchStatus | ''>('');
  const [godownFilter, setGodownFilter] = useState<string | undefined>();
  const [financialYearFilter, setFinancialYearFilter] = useState<string | undefined>(
    () => getCurrentFinancialYearApiValue(),
  );
  const { godowns } = useGodowns(true);
  const {
    invoiceDispatches,
    loading,
    refetch,
    remove,
    cancel,
    getEWayBills,
    previewEWayBill,
    generateEWayBill,
    generateEInvoice,
  } = useInvoiceDispatches({
    status: statusFilter || undefined,
    godown_id: godownFilter,
    financial_year: financialYearFilter,
  });
  const { products } = useProducts();
  const { getVehicleNumber } = useVehicleMap();

  const godownName = (id: string | undefined) =>
    id ? godowns.find((g) => g.id === id)?.name ?? '—' : '—';

  const [searchQuery, setSearchQuery] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceDispatch | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [downloadingBosId, setDownloadingBosId] = useState<string | null>(null);
  /** `undefined` = still loading; `null` = none; object = generated */
  const [eWayById, setEWayById] = useState<Record<string, EWayBill | null | undefined>>({});
  const [busyEWayId, setBusyEWayId] = useState<string | null>(null);
  const [busyEInvoiceId, setBusyEInvoiceId] = useState<string | null>(null);
  const [eWayPreviewOpen, setEWayPreviewOpen] = useState(false);
  const [eWayPreview, setEWayPreview] = useState<EWayBillPreviewResponse | null>(null);
  const [eWayPreviewDispatch, setEWayPreviewDispatch] = useState<InvoiceDispatch | null>(null);
  const [eWayGenerateLoading, setEWayGenerateLoading] = useState(false);
  const [receivingDocDispatch, setReceivingDocDispatch] = useState<InvoiceDispatch | null>(null);

  useEffect(() => {
    if (onRefreshRef) onRefreshRef.current = refetch;
  }, [refetch, onRefreshRef]);

  const financialYearOptions = useMemo(
    () => buildFinancialYearApiFilterOptions(invoiceDispatches.map((d) => d.financial_year)),
    [invoiceDispatches],
  );

  const godownOptions = useMemo(
    () =>
      godowns.map((g) => ({
        value: g.id,
        label: g.is_active ? g.name : `${g.name} (inactive)`,
      })),
    [godowns],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return invoiceDispatches.filter((d) => {
      return (
        d.internal_invoice_number.toLowerCase().includes(q) ||
        (d.party_name ?? '').toLowerCase().includes(q) ||
        d.dispatch_date.includes(q)
      );
    });
  }, [invoiceDispatches, searchQuery]);

  const filteredIdsKey = useMemo(
    () => filtered.map((d) => d.id).join(','),
    [filtered],
  );

  // Prefetch e-way presence so the action toggles Generate ↔ Download.
  useEffect(() => {
    if (!filteredIdsKey) {
      setEWayById({});
      return;
    }
    let cancelled = false;
    const ids = filteredIdsKey.split(',').filter(Boolean);

    void (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const list = await getEWayBills(id);
            return [id, list[0] ?? null] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setEWayById((prev) => {
        const next: Record<string, EWayBill | null | undefined> = { ...prev };
        for (const [id, ewb] of entries) next[id] = ewb;
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [filteredIdsKey, getEWayBills]);

  // Mark rows as loading until prefetch returns.
  useEffect(() => {
    if (!filteredIdsKey) return;
    const ids = filteredIdsKey.split(',').filter(Boolean);
    setEWayById((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (!(id in next)) next[id] = undefined;
      }
      return next;
    });
  }, [filteredIdsKey]);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  const buildBodyForDispatch = useCallback(
    (dispatch: InvoiceDispatch, distanceKm?: number): CreateEWayBillRequest => {
      const rawVehicle = dispatch.vehicle_id
        ? getVehicleNumber(dispatch.vehicle_id)
        : '';
      const vehicleNumber =
        rawVehicle && rawVehicle !== '-' ? rawVehicle : null;
      const body = buildEWayBodyFromDispatch(dispatch, vehicleNumber);
      if (distanceKm != null) body.distance_km = distanceKm;
      return body;
    },
    [getVehicleNumber],
  );

  const handleDownloadBillOfSupply = async (dispatch: InvoiceDispatch) => {
    if (downloadingBosId) return;
    setDownloadingBosId(dispatch.id);
    try {
      await downloadBillOfSupplyForDispatch(
        dispatch.id,
        buildBodyForDispatch(dispatch),
      );
      toast.success('Downloaded', 'Bill of Supply PDF saved.');
    } catch (e) {
      toast.error(
        'Download failed',
        extractApiErrorMessage(e, 'Could not download Bill of Supply'),
      );
    } finally {
      setDownloadingBosId(null);
    }
  };

  const handleDownloadEWay = (dispatch: InvoiceDispatch) => {
    const ewb = eWayById[dispatch.id];
    if (!ewb) {
      toast.error('E-Way not found', 'Generate an e-way bill first.');
      return;
    }
    if (downloadEWayBillPdf(ewb)) {
      toast.success(
        'E-Way bill',
        ewb.eway_bill_number ? `Opening EWB ${ewb.eway_bill_number}` : 'Opening e-way PDF.',
      );
      return;
    }
    toast.error(
      'No PDF link',
      ewb.eway_bill_number
        ? `EWB ${ewb.eway_bill_number} has no print URL from Masters India.`
        : 'E-way bill has no downloadable PDF link.',
    );
  };

  const openGenerateEWayPreview = async (dispatch: InvoiceDispatch) => {
    if (busyEWayId) return;
    const vehicle = dispatch.vehicle_id ? getVehicleNumber(dispatch.vehicle_id) : '';
    if (!vehicle || vehicle === '-') {
      toast.error(
        'Vehicle required',
        'Set a verified vehicle on the dispatch before generating an e-way bill.',
      );
      return;
    }
    setBusyEWayId(dispatch.id);
    try {
      const preview = await previewEWayBill(dispatch.id, buildBodyForDispatch(dispatch));
      if (preview.already_generated && preview.existing_eway_bill_number) {
        const list = await getEWayBills(dispatch.id);
        const ewb = list[0] ?? null;
        setEWayById((prev) => ({ ...prev, [dispatch.id]: ewb }));
        if (ewb && downloadEWayBillPdf(ewb)) {
          toast.success('E-Way already generated', `EWB ${preview.existing_eway_bill_number}`);
          return;
        }
      }
      setEWayPreviewDispatch(dispatch);
      setEWayPreview(preview);
      setEWayPreviewOpen(true);
    } catch (e) {
      toast.error(
        'E-Way preview failed',
        extractApiErrorMessage(e, 'Could not build e-way preview'),
      );
    } finally {
      setBusyEWayId(null);
    }
  };

  const handleConfirmGenerateEWay = async (
    overrides: Pick<CreateEWayBillRequest, 'distance_km'>,
  ) => {
    if (!eWayPreviewDispatch) return;
    const dispatch = eWayPreviewDispatch;
    setEWayGenerateLoading(true);
    try {
      const ewb = await generateEWayBill(dispatch.id, {
        body: buildBodyForDispatch(dispatch, overrides.distance_km),
      });
      setEWayById((prev) => ({ ...prev, [dispatch.id]: ewb }));
      setEWayPreviewOpen(false);
      setEWayPreview(null);
      setEWayPreviewDispatch(null);
      toast.success(
        'E-Way bill generated',
        ewb.eway_bill_number ? `EWB ${ewb.eway_bill_number}` : 'Masters India accepted the request.',
      );
    } catch (e) {
      toast.error('E-Way generate failed', extractApiErrorMessage(e, 'Action failed'));
    } finally {
      setEWayGenerateLoading(false);
    }
  };

  const handleGenerateEInvoice = async (dispatch: InvoiceDispatch) => {
    if (busyEInvoiceId) return;
    if (
      !window.confirm(
        `Generate e-invoice for ${dispatch.internal_invoice_number} with Masters India?`,
      )
    ) {
      return;
    }
    setBusyEInvoiceId(dispatch.id);
    try {
      const einv = await generateEInvoice(dispatch.id);
      toast.success(
        'E-Invoice generated',
        einv.irn ? `IRN ${einv.irn.slice(0, 24)}…` : 'Masters India accepted the request.',
      );
    } catch (e) {
      toast.error(
        'E-Invoice failed',
        extractApiErrorMessage(e, 'Could not generate e-invoice'),
      );
    } finally {
      setBusyEInvoiceId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      const successDetail =
        deleteTarget.status === 'confirmed'
          ? 'Inventory was reversed and the dispatch was removed. Sauda remaining quantity is available again.'
          : deleteTarget.status === 'cancelled'
            ? 'The cancelled dispatch was removed.'
            : 'The draft invoice dispatch was removed.';
      toast.success('Dispatch deleted', successDetail);
      if (detailId === deleteTarget.id) setDetailId(null);
      setDeleteTarget(null);
    } catch (e) {
      toast.error(
        invoiceDispatchDeleteToastTitle(e),
        extractInvoiceDispatchDeleteError(e),
      );
    }
  };

  const handleCancelTransfer = async () => {
    if (!cancelId) return;
    try {
      await cancel(cancelId);
      toast.success(
        'Transfer cancelled',
        'Stock was reversed. Sauda remaining quantity is available again.',
      );
      if (detailId === cancelId) setDetailId(null);
      setCancelId(null);
    } catch (e) {
      toast.error(
        'Cancel failed',
        extractApiErrorMessage(
          e,
          'Could not reverse this transfer. Destination stock may already have been used.',
        ),
      );
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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-[200px] flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by invoice #, party, date..."
          />
        </div>
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
          onChange={(v) => setStatusFilter((v ?? '') as InvoiceDispatchStatus | '')}
        />
        <FilterDropdown
          label="Godown"
          options={godownOptions}
          value={godownFilter}
          onChange={setGodownFilter}
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoice dispatches"
            description={
              financialYearFilter
                ? `No invoice dispatches found for ${financialYearOptions.find((o) => o.value === financialYearFilter)?.label ?? financialYearFilter}. Try another financial year or adjust filters.`
                : 'Create an invoice dispatch from a finalized sales order.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Tooltip.Provider delayDuration={250} skipDelayDuration={0}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Invoice No.</th>
                  <th className="text-left p-3 font-medium">FY</th>
                  <th className="text-left p-3 font-medium">Godown</th>
                  <th className="text-left p-3 font-medium">Party</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="w-px whitespace-nowrap p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const ewb = eWayById[d.id];
                  const eWayStatusLoading = ewb === undefined;
                  const hasEWay = Boolean(ewb && (ewb.eway_bill_number || ewb.id));
                  const eWayBusy =
                    eWayStatusLoading ||
                    busyEWayId === d.id ||
                    (eWayGenerateLoading && eWayPreviewDispatch?.id === d.id);
                  const eInvoiceBusy = busyEInvoiceId === d.id;
                  const hasReceivingDoc = Boolean(
                    d.receiving_doc_image_url || d.receiving_doc_pdf_url,
                  );
                  const actionBtn =
                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-50';
                  return (
                    <tr key={d.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{d.internal_invoice_number}</td>
                      <td className="p-3 text-muted-foreground">{d.financial_year ?? '–'}</td>
                      <td className="p-3 text-muted-foreground">{godownName(d.godown_id)}</td>
                      <td className="p-3">{d.party_name}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            d.status === 'draft'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                              : d.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3">{d.dispatch_date}</td>
                      <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* 1. Bill of Supply download */}
                            <ActionTooltip label="Download Bill of Supply">
                              <button
                                type="button"
                                disabled={Boolean(downloadingBosId)}
                                onClick={() => void handleDownloadBillOfSupply(d)}
                                className={actionBtn}
                                aria-label="Download Bill of Supply"
                              >
                                {downloadingBosId === d.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </button>
                            </ActionTooltip>

                            {/* 2. Generate E-Way ↔ Download E-Way */}
                            {hasEWay ? (
                              <ActionTooltip
                                label={
                                  ewb?.eway_bill_number
                                    ? `Download E-Way Bill ${ewb.eway_bill_number}`
                                    : 'Download E-Way Bill'
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => handleDownloadEWay(d)}
                                  className={actionBtn}
                                  aria-label="Download E-Way Bill"
                                >
                                  <Truck className="h-4 w-4" />
                                </button>
                              </ActionTooltip>
                            ) : (
                              <ActionTooltip label="Generate E-Way Bill">
                                <button
                                  type="button"
                                  disabled={eWayBusy || d.status === 'cancelled'}
                                  onClick={() => void openGenerateEWayPreview(d)}
                                  className={actionBtn}
                                  aria-label="Generate E-Way Bill"
                                >
                                  {eWayBusy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Truck className="h-4 w-4" />
                                  )}
                                </button>
                              </ActionTooltip>
                            )}

                            {/* 3. E-Invoice */}
                            <ActionTooltip label="Generate E-Invoice">
                              <button
                                type="button"
                                disabled={eInvoiceBusy || d.status === 'cancelled'}
                                onClick={() => void handleGenerateEInvoice(d)}
                                className={actionBtn}
                                aria-label="Generate E-Invoice"
                              >
                                {eInvoiceBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileDigit className="h-4 w-4" />
                                )}
                              </button>
                            </ActionTooltip>

                            {/* 4. Receiving document */}
                            <ActionTooltip
                              label={
                                hasReceivingDoc
                                  ? 'Replace receiving document'
                                  : 'Upload receiving document'
                              }
                            >
                              <button
                                type="button"
                                onClick={() => setReceivingDocDispatch(d)}
                                className={`${actionBtn} ${
                                  hasReceivingDoc
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : ''
                                }`}
                                aria-label={
                                  hasReceivingDoc
                                    ? 'Replace receiving document'
                                    : 'Upload receiving document'
                                }
                              >
                                <ClipboardCheck className="h-4 w-4" />
                              </button>
                            </ActionTooltip>

                            {/* 5. View */}
                            <ActionTooltip label="View">
                              <button
                                type="button"
                                onClick={() => setDetailId(d.id)}
                                className={actionBtn}
                                aria-label="View"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </ActionTooltip>

                            {(d.status === 'draft' ||
                              d.status === 'confirmed' ||
                              d.status === 'cancelled') && (
                              <ActionTooltip label="More actions">
                                <span className="inline-flex">
                                  <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild>
                                      <button
                                        type="button"
                                        className={actionBtn}
                                        aria-label="More actions"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Portal>
                                      <DropdownMenu.Content
                                        className="z-50 min-w-[10rem] rounded-lg border bg-popover p-1 shadow-md"
                                        align="end"
                                      >
                                        <DropdownMenu.Item
                                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted"
                                          onSelect={() => setEditId(d.id)}
                                        >
                                          <Pencil className="h-4 w-4" /> Edit
                                        </DropdownMenu.Item>
                                        {d.status === 'confirmed' && d.to_godown_id && (
                                          <DropdownMenu.Item
                                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-700 outline-none hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                            onSelect={() => setCancelId(d.id)}
                                          >
                                            <Undo2 className="h-4 w-4" /> Cancel transfer
                                          </DropdownMenu.Item>
                                        )}
                                        <DropdownMenu.Item
                                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-700 outline-none hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                          onSelect={() => setDeleteTarget(d)}
                                        >
                                          <Trash2 className="h-4 w-4" /> Delete
                                        </DropdownMenu.Item>
                                      </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                  </DropdownMenu.Root>
                                </span>
                              </ActionTooltip>
                            )}
                          </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </Tooltip.Provider>
          </div>
        )}
      </div>

      <InvoiceDispatchDetailModal
        dispatchId={detailId}
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        onSuccess={refetch}
        onEdit={(id) => {
          setDetailId(null);
          setEditId(id);
        }}
        getProductName={getProductName}
      />

      <InvoiceDispatchFormModal
        open={!!editId}
        onOpenChange={(open) => !open && setEditId(null)}
        dispatchId={editId}
        onSuccess={refetch}
      />

      <EWayBillPreviewDialog
        open={eWayPreviewOpen}
        onOpenChange={(next) => {
          setEWayPreviewOpen(next);
          if (!next) {
            setEWayPreview(null);
            setEWayPreviewDispatch(null);
          }
        }}
        preview={eWayPreview}
        mode="bill-of-supply"
        confirming={eWayGenerateLoading}
        onConfirmGenerate={(overrides) => void handleConfirmGenerateEWay(overrides)}
      />

      <ReceivingDocUploadModal
        open={!!receivingDocDispatch}
        onOpenChange={(next) => {
          if (!next) setReceivingDocDispatch(null);
        }}
        dispatch={receivingDocDispatch}
        onSuccess={refetch}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Delete invoice dispatch"
        description={
          deleteTarget
            ? deleteInvoiceDispatchConfirmDescription(deleteTarget.status)
            : 'This dispatch will be permanently deleted.'
        }
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(open) => !open && setCancelId(null)}
        onConfirm={() => void handleCancelTransfer()}
        title="Cancel godown transfer"
        description="This reverses the confirmed transfer: destination stock is debited and source stock is restored. It will fail if destination stock was already used."
        confirmText="Cancel transfer"
        variant="danger"
      />
    </div>
  );
}
