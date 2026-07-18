import { useState, useMemo, useEffect, useCallback } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { DocumentViewerModal, type DocumentInfo } from '../../shared/DocumentViewerModal';
import {
  FileText,
  Scale,
  Package,
  Eye,
  MoreVertical,
  Edit2,
  Trash2,
  Receipt,
  FileCheck,
  ClipboardList,
  Route,
  AlertTriangle,
} from 'lucide-react';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { useVehicleMap } from '../../../hooks/useVehicles';
import { kaantasAPI } from '../../../services/kaantas.api';
import { InwardSlipPassFormModal } from './InwardSlipPassFormModal';
import { InwardSlipPassPreviewDialog } from './InwardSlipPassPreviewDialog';
import { KaantaWeightDialog } from './KaantaWeightDialog';
import { LinkedLotsDialog } from './LinkedLotsDialog';
import { GodownFilterSelect } from '../../shared/GodownFilterSelect';
import { useGodowns } from '../../../hooks/useGodowns';
import {
  buildFinancialYearFilterOptionsFromDates,
  getCurrentFinancialYearKey,
  isIsoDateInFinancialYear,
} from '../../../utils/financialYear';
import type { InwardSlipPass, Kaanta } from '../../../types/entities';

type ISPRowActionsProps = {
  isp: InwardSlipPass;
  onViewDocuments: (docs: DocumentInfo[]) => void;
  onLinkedLots: () => void;
  onKaanta: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function ISPRowActions({
  isp,
  onViewDocuments,
  onLinkedLots,
  onKaanta,
  onPreview,
  onEdit,
  onDelete,
}: ISPRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-0.5 flex-nowrap">
      <button
        type="button"
        onClick={onLinkedLots}
        className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors shrink-0"
        title="View Linked Lots"
      >
        <Package className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onKaanta}
        className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-md transition-colors shrink-0"
        title="Create Kaanta"
      >
        <Scale className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onPreview}
        className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors shrink-0"
        title="View Preview"
      >
        <Eye className="h-4 w-4" />
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="rounded-lg p-2 hover:bg-muted transition-colors shrink-0">
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="glass min-w-[11rem] rounded-xl p-1 shadow-lg z-50" sideOffset={8} align="end">
            <DropdownMenu.Label className="px-3 py-1.5 text-xs text-muted-foreground font-medium">View Documents</DropdownMenu.Label>
            {isp.other_bills && isp.other_bills.length > 0 ? (
              <>
                {isp.other_bills.map((bill, index) => {
                  const isPdf = bill.url.toLowerCase().includes('.pdf');
                  return (
                    <DropdownMenu.Item
                      key={index}
                      className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-blue-600"
                      onSelect={() => onViewDocuments([{ url: bill.url, label: bill.name, type: isPdf ? 'pdf' : 'image' }])}
                    >
                      <Receipt className="h-4 w-4" /> {bill.name}
                    </DropdownMenu.Item>
                  );
                })}
                {(isp.bill_pdf_url || isp.bilti_image_url || isp.bilti_pdf_url || isp.eway_bill_url) && (
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                )}
              </>
            ) : null}
            <DropdownMenu.Item
              className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isp.bill_pdf_url
                  ? 'hover:bg-accent hover:text-accent-foreground text-blue-600'
                  : 'text-muted-foreground/50 cursor-not-allowed'
              }`}
              disabled={!isp.bill_pdf_url}
              onSelect={() =>
                isp.bill_pdf_url &&
                onViewDocuments([
                  {
                    url: isp.bill_pdf_url,
                    label: 'Purchase Bill',
                    type: isp.bill_pdf_url.toLowerCase().includes('.pdf') ? 'pdf' : 'image',
                  },
                ])
              }
            >
              <FileCheck className="h-4 w-4" /> Purchase Bill
              {!isp.bill_pdf_url && <span className="ml-auto text-[10px]">N/A</span>}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isp.bilti_image_url
                  ? 'hover:bg-accent hover:text-accent-foreground text-blue-600'
                  : 'text-muted-foreground/50 cursor-not-allowed'
              }`}
              disabled={!isp.bilti_image_url}
              onSelect={() =>
                isp.bilti_image_url && onViewDocuments([{ url: isp.bilti_image_url, label: 'Bilti/LR Image', type: 'image' }])
              }
            >
              <ClipboardList className="h-4 w-4" /> Bilti Image
              {!isp.bilti_image_url && <span className="ml-auto text-[10px]">N/A</span>}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isp.bilti_pdf_url
                  ? 'hover:bg-accent hover:text-accent-foreground text-blue-600'
                  : 'text-muted-foreground/50 cursor-not-allowed'
              }`}
              disabled={!isp.bilti_pdf_url}
              onSelect={() => isp.bilti_pdf_url && onViewDocuments([{ url: isp.bilti_pdf_url, label: 'Bilti/LR PDF', type: 'pdf' }])}
            >
              <FileText className="h-4 w-4" /> Bilti PDF
              {!isp.bilti_pdf_url && <span className="ml-auto text-[10px]">N/A</span>}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isp.eway_bill_url
                  ? 'hover:bg-accent hover:text-accent-foreground text-blue-600'
                  : 'text-muted-foreground/50 cursor-not-allowed'
              }`}
              disabled={!isp.eway_bill_url}
              onSelect={() => isp.eway_bill_url && onViewDocuments([{ url: isp.eway_bill_url, label: 'E-way Bill', type: 'pdf' }])}
            >
              <Route className="h-4 w-4" /> E-way Bill
              {!isp.eway_bill_url && <span className="ml-auto text-[10px]">N/A</span>}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onSelect={onEdit}
            >
              <Edit2 className="h-4 w-4" /> Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onSelect={onDelete}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

export function InwardSlipPassesTable() {
  const [godownFilter, setGodownFilter] = useState<string | undefined>();
  const [financialYearFilter, setFinancialYearFilter] = useState<string | undefined>(
    () => getCurrentFinancialYearKey(),
  );
  const { godowns } = useGodowns(true);
  const { inwardSlipPasses, loading, deleteInwardSlipPass, refetch } = useInwardSlipPasses({
    godown_id: godownFilter,
  });
  const { getVehicleNumber } = useVehicleMap();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedISP, setSelectedISP] = useState<InwardSlipPass | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedISPId, setSelectedISPId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewISP, setPreviewISP] = useState<InwardSlipPass | null>(null);
  const [kaantaWeightOpen, setKaantaWeightOpen] = useState(false);
  const [kaantaWeightISP, setKaantaWeightISP] = useState<InwardSlipPass | null>(null);
  const [linkedLotsOpen, setLinkedLotsOpen] = useState(false);
  const [linkedLotsISP, setLinkedLotsISP] = useState<InwardSlipPass | null>(null);

  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [viewerDocuments, setViewerDocuments] = useState<DocumentInfo[]>([]);
  const [kaantas, setKaantas] = useState<Kaanta[]>([]);

  const fetchKaantas = useCallback(async () => {
    try {
      const data = await kaantasAPI.getAllKaantas(undefined, undefined, godownFilter);
      setKaantas(data);
    } catch {
      setKaantas([]);
    }
  }, [godownFilter]);

  useEffect(() => {
    fetchKaantas();
  }, [fetchKaantas]);

  const ispVehicleMismatchById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const kaanta of kaantas) {
      if (kaanta.vehicle_number_mismatch && kaanta.inward_slip_pass_id && !map.has(kaanta.inward_slip_pass_id)) {
        map.set(kaanta.inward_slip_pass_id, kaanta.parchi_vehicle_number ?? null);
      }
    }
    return map;
  }, [kaantas]);

  const handleViewDocuments = (docs: DocumentInfo[]) => {
    setViewerDocuments(docs);
    setDocumentViewerOpen(true);
  };

  const godownName = (id: string | undefined) => (id ? godowns.find((g) => g.id === id)?.name ?? '—' : '—');

  const financialYearOptions = useMemo(
    () => buildFinancialYearFilterOptionsFromDates(inwardSlipPasses.map((isp) => isp.date)),
    [inwardSlipPasses],
  );

  const filtered = useMemo(() => {
    return inwardSlipPasses.filter((isp) => {
      if (financialYearFilter && !isIsoDateInFinancialYear(isp.date, financialYearFilter)) {
        return false;
      }
      const q = searchQuery.toLowerCase();
      const vehicleNumber = getVehicleNumber(isp.vehicle_id);
      const matchesSearch =
        isp.slip_number.toLowerCase().includes(q) ||
        vehicleNumber.toLowerCase().includes(q) ||
        isp.party_name.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [inwardSlipPasses, financialYearFilter, searchQuery, getVehicleNumber]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap items-end">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by slip number, vehicle, or party..." />
        </div>
        <GodownFilterSelect value={godownFilter} onChange={setGodownFilter} label="Filter by godown" />
        <FilterDropdown
          label="Financial year"
          options={financialYearOptions}
          value={financialYearFilter}
          onChange={setFinancialYearFilter}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add ISP
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No inward slip passes found"
          description={
            financialYearFilter
              ? `No ISPs found for ${financialYearOptions.find((o) => o.value === financialYearFilter)?.label ?? financialYearFilter}. Try another financial year or adjust filters.`
              : 'Create your first ISP or adjust filters.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/30">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Slip</th>
                <th className="text-left py-3 px-3 font-semibold min-w-[8rem]">Party</th>
                <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Godown</th>
                <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Vehicle</th>
                <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Date</th>
                <th className="text-right py-3 px-3 font-semibold whitespace-nowrap">Transport</th>
                <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Bill #</th>
                <th className="text-right py-3 px-3 font-semibold w-[1%]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((isp) => (
                <tr key={isp.id} className="border-b border-border/50 hover:bg-muted/25 transition-colors">
                  <td className="py-2.5 px-3 font-medium whitespace-nowrap">{isp.slip_number}</td>
                  <td className="py-2.5 px-3 max-w-[14rem] truncate" title={isp.party_name}>
                    {isp.party_name}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{godownName(isp.godown_id)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{getVehicleNumber(isp.vehicle_id)}</span>
                      {ispVehicleMismatchById.has(isp.id) && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0 rounded-md text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                          title={
                            ispVehicleMismatchById.get(isp.id)
                              ? `Slip vehicle ${ispVehicleMismatchById.get(isp.id)} does not match ISP vehicle ${getVehicleNumber(isp.vehicle_id)}`
                              : `Kaanta slip vehicle does not match ISP vehicle ${getVehicleNumber(isp.vehicle_id)}`
                          }
                        >
                          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                          Vehicle mismatch
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{new Date(isp.date).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    {isp.transportation_cost != null ? `₹${isp.transportation_cost.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{isp.bill_number ?? '—'}</td>
                  <td className="py-2.5 px-2">
                    <ISPRowActions
                      isp={isp}
                      onViewDocuments={handleViewDocuments}
                      onLinkedLots={() => {
                        setLinkedLotsISP(isp);
                        setLinkedLotsOpen(true);
                      }}
                      onKaanta={() => {
                        setKaantaWeightISP(isp);
                        setKaantaWeightOpen(true);
                      }}
                      onPreview={() => {
                        setPreviewISP(isp);
                        setPreviewOpen(true);
                      }}
                      onEdit={() => {
                        setSelectedISPId(isp.id);
                        setEditModalOpen(true);
                      }}
                      onDelete={() => {
                        setSelectedISP(isp);
                        setDeleteDialogOpen(true);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedISP) {
            await deleteInwardSlipPass(selectedISP.id);
            setDeleteDialogOpen(false);
            setSelectedISP(null);
          }
        }}
        title="Delete Inward Slip Pass"
        description={`Are you sure you want to delete ${selectedISP?.slip_number}? This action cannot be undone.`}
        confirmText="Delete"
      />

      <InwardSlipPassFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            refetch();
          }
        }}
      />

      <InwardSlipPassFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedISPId(null);
            refetch();
          }
        }}
        ispId={selectedISPId}
      />

      <InwardSlipPassPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} isp={previewISP} />

      <KaantaWeightDialog
        open={kaantaWeightOpen}
        onOpenChange={setKaantaWeightOpen}
        isp={kaantaWeightISP}
        onSuccess={() => {
          refetch();
          fetchKaantas();
        }}
      />

      <LinkedLotsDialog open={linkedLotsOpen} onOpenChange={setLinkedLotsOpen} isp={linkedLotsISP} godownId={godownFilter} />

      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        document={viewerDocuments[0] || null}
        documents={viewerDocuments}
      />
    </div>
  );
}
