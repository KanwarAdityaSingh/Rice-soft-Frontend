import { useState, useMemo } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { DocumentViewerModal, type DocumentInfo } from '../../shared/DocumentViewerModal';
import { FileText, Scale, Package, Eye, Image as ImageIcon, MoreVertical, Edit2, Trash2, Receipt, Truck, FileCheck, ClipboardList, Route } from 'lucide-react';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { useVehicleMap } from '../../../hooks/useVehicles';
import { InwardSlipPassFormModal } from './InwardSlipPassFormModal';
import { InwardSlipPassPreviewDialog } from './InwardSlipPassPreviewDialog';
import { KaantaWeightDialog } from './KaantaWeightDialog';
import { LinkedLotsDialog } from './LinkedLotsDialog';
import type { InwardSlipPass } from '../../../types/entities';

export function InwardSlipPassesTable() {
  const [saudaFilter, setSaudaFilter] = useState<string | undefined>();
  const { inwardSlipPasses, loading, deleteInwardSlipPass, refetch } = useInwardSlipPasses(saudaFilter);
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
  
  // Document viewer state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [viewerDocuments, setViewerDocuments] = useState<DocumentInfo[]>([]);

  // Get all documents for an ISP
  const getISPDocuments = (isp: InwardSlipPass): DocumentInfo[] => {
    const docs: DocumentInfo[] = [];
    
    // Add other_bills
    if (isp.other_bills && isp.other_bills.length > 0) {
      isp.other_bills.forEach(bill => {
        const isPdf = bill.url.toLowerCase().includes('.pdf');
        docs.push({ url: bill.url, label: bill.name, type: isPdf ? 'pdf' : 'image' });
      });
    }
    
    if (isp.bill_pdf_url) {
      const isPdf = isp.bill_pdf_url.toLowerCase().includes('.pdf');
      docs.push({ url: isp.bill_pdf_url, label: 'Purchase Bill', type: isPdf ? 'pdf' : 'image' });
    }
    if (isp.bilti_image_url) {
      docs.push({ url: isp.bilti_image_url, label: 'Bilti/LR Image', type: 'image' });
    }
    if (isp.bilti_pdf_url) {
      docs.push({ url: isp.bilti_pdf_url, label: 'Bilti/LR PDF', type: 'pdf' });
    }
    if (isp.eway_bill_url) {
      docs.push({ url: isp.eway_bill_url, label: 'E-way Bill', type: 'pdf' });
    }
    
    return docs;
  };

  const handleViewDocuments = (docs: DocumentInfo[]) => {
    setViewerDocuments(docs);
    setDocumentViewerOpen(true);
  };

  const filtered = useMemo(() => {
    return inwardSlipPasses.filter((isp) => {
      const q = searchQuery.toLowerCase();
      const vehicleNumber = getVehicleNumber(isp.vehicle_id);
      const matchesSearch =
        isp.slip_number.toLowerCase().includes(q) ||
        vehicleNumber.toLowerCase().includes(q) ||
        isp.party_name.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [inwardSlipPasses, searchQuery, getVehicleNumber]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by slip number, vehicle, or party..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add ISP
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No inward slip passes found" description="Create your first ISP or adjust filters." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((isp) => (
            <article
              key={isp.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">ISP</div>
                    <h3 className="text-sm font-semibold leading-tight">{isp.slip_number}</h3>
                    <div className="text-xs text-muted-foreground">{isp.party_name}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                <div className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Vehicle:</span>
                  <span className="font-medium">{getVehicleNumber(isp.vehicle_id)}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Date:</span>
                  <span className="font-medium">{new Date(isp.date).toLocaleDateString()}</span>
                </div>
                {isp.transportation_cost != null && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Transport:</span>
                    <span className="font-medium">₹{isp.transportation_cost.toFixed(2)}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Saudas:</span>
                  <span className="font-medium">{isp.sauda_ids?.length || 0}</span>
                </div>
                {isp.bill_number && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Bill #:</span>
                    <span className="font-medium">{isp.bill_number}</span>
                  </div>
                )}
                {isp.bill_date && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Bill Date:</span>
                    <span className="font-medium">{new Date(isp.bill_date).toLocaleDateString('en-IN')}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-end gap-1">
                <button
                  onClick={() => {
                    setLinkedLotsISP(isp);
                    setLinkedLotsOpen(true);
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                  title="View Linked Lots"
                >
                  <Package className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setKaantaWeightISP(isp);
                    setKaantaWeightOpen(true);
                  }}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-md transition-colors"
                  title="Create Kaanta"
                >
                  <Scale className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setPreviewISP(isp);
                    setPreviewOpen(true);
                  }}
                  className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                  title="View Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
                
                {/* Custom dropdown with view options */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="rounded-lg p-2 hover:bg-muted transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="glass min-w-[11rem] rounded-xl p-1 shadow-lg z-50"
                      sideOffset={8}
                      align="end"
                    >
                      {/* View Documents Section - Always visible */}
                      <DropdownMenu.Label className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
                        View Documents
                      </DropdownMenu.Label>
                      {/* Other Bills */}
                      {isp.other_bills && isp.other_bills.length > 0 ? (
                        <>
                          {isp.other_bills.map((bill, index) => {
                            const isPdf = bill.url.toLowerCase().includes('.pdf');
                            return (
                              <DropdownMenu.Item
                                key={index}
                                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-blue-600"
                                onSelect={() => handleViewDocuments([{ url: bill.url, label: bill.name, type: isPdf ? 'pdf' : 'image' }])}
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
                        onSelect={() => isp.bill_pdf_url && handleViewDocuments([{ url: isp.bill_pdf_url, label: 'Purchase Bill', type: isp.bill_pdf_url.toLowerCase().includes('.pdf') ? 'pdf' : 'image' }])}
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
                        onSelect={() => isp.bilti_image_url && handleViewDocuments([{ url: isp.bilti_image_url, label: 'Bilti/LR Image', type: 'image' }])}
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
                        onSelect={() => isp.bilti_pdf_url && handleViewDocuments([{ url: isp.bilti_pdf_url, label: 'Bilti/LR PDF', type: 'pdf' }])}
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
                        onSelect={() => isp.eway_bill_url && handleViewDocuments([{ url: isp.eway_bill_url, label: 'E-way Bill', type: 'pdf' }])}
                      >
                        <Route className="h-4 w-4" /> E-way Bill
                        {!isp.eway_bill_url && <span className="ml-auto text-[10px]">N/A</span>}
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      
                      {/* Edit/Delete Actions */}
                      <DropdownMenu.Item
                        className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        onSelect={() => {
                          setSelectedISPId(isp.id);
                          setEditModalOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" /> Edit
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onSelect={() => {
                          setSelectedISP(isp);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </article>
          ))}
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

      <InwardSlipPassPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        isp={previewISP}
      />

      <KaantaWeightDialog
        open={kaantaWeightOpen}
        onOpenChange={setKaantaWeightOpen}
        isp={kaantaWeightISP}
        onSuccess={refetch}
      />

      <LinkedLotsDialog
        open={linkedLotsOpen}
        onOpenChange={setLinkedLotsOpen}
        isp={linkedLotsISP}
      />

      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        document={viewerDocuments[0] || null}
        documents={viewerDocuments}
      />
    </div>
  );
}

