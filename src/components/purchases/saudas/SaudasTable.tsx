import { useState, useMemo, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { DocumentViewerModal, type DocumentInfo } from '../../shared/DocumentViewerModal';
import { Package, Eye, MoreVertical, Edit2, Trash2, UtensilsCrossed, Wheat, Mail, MessageCircle } from 'lucide-react';
import { useSaudas } from '../../../hooks/useSaudas';
import { useVendors } from '../../../hooks/useVendors';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { paymentAdvicesAPI } from '../../../services/paymentAdvices.api';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { kaantasAPI } from '../../../services/kaantas.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { getCompletionStatus, formatCompletionPercentage, formatWeightDisplay } from '../../../utils/saudaCompletion';
import { SaudaFormModal } from './SaudaFormModal';
import { SaudaPreviewDialog } from './SaudaPreviewDialog';
import { SaudaEmailModal } from './SaudaEmailModal';
import { SaudaWhatsAppModal } from './SaudaWhatsAppModal';
import type { Sauda, RiceCode, RiceType, PaymentAdvice, InwardSlipPass, Kaanta } from '../../../types/entities';

interface SaudasTableProps {
  onRefreshRef?: React.MutableRefObject<(() => void) | null>;
}

export function SaudasTable({ onRefreshRef }: SaudasTableProps = {}) {
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const { saudas, loading, deleteSauda, refetch } = useSaudas({
    sauda_type: typeFilter as any,
  });
  const { vendors } = useVendors();

  // Expose refetch function to parent via ref
  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = refetch;
    }
  }, [refetch, onRefreshRef]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSauda, setSelectedSauda] = useState<Sauda | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSaudaId, setSelectedSaudaId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSauda, setPreviewSauda] = useState<Sauda | null>(null);
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  
  // Document viewer state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [viewerDocuments, setViewerDocuments] = useState<DocumentInfo[]>([]);
  
  // Notification state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedSaudaForNotification, setSelectedSaudaForNotification] = useState<string | null>(null);
  
  // Usage tracking state
  const [paymentAdvices, setPaymentAdvices] = useState<PaymentAdvice[]>([]);
  const [inwardSlipPasses, setInwardSlipPasses] = useState<InwardSlipPass[]>([]);
  const [kaantas, setKaantas] = useState<Kaanta[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('warning');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const fetchRiceCodes = async () => {
      try {
        const data = await riceCodesAPI.getAllRiceCodes();
        setRiceCodes(data);
      } catch (error) {
        console.error('Failed to fetch rice codes:', error);
      }
    };
    fetchRiceCodes();
  }, []);

  useEffect(() => {
    const fetchRiceTypes = async () => {
      try {
        const data = await riceCodesAPI.getRiceTypes();
        setRiceTypes(data);
      } catch (error) {
        console.error('Failed to fetch rice types:', error);
      }
    };
    fetchRiceTypes();
  }, []);

  // Fetch usage data to check sauda dependencies
  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const [pas, isps, kaantasData] = await Promise.all([
          paymentAdvicesAPI.getAllPaymentAdvices(),
          inwardSlipPassesAPI.getAllInwardSlipPasses(),
          kaantasAPI.getAllKaantas()
        ]);
        setPaymentAdvices(pas);
        setInwardSlipPasses(isps);
        setKaantas(kaantasData);
      } catch (error) {
        console.error('Failed to fetch usage data:', error);
      }
    };
    fetchUsageData();
  }, []);

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '';
  };

  const getPurchaserName = (purchaserId: string | null | undefined): string => {
    if (!purchaserId) return '';
    const purchaser = vendors.find((v) => v.id === purchaserId);
    return purchaser ? purchaser.business_name : '';
  };

  const getSaudaDisplayName = (sauda: Sauda): string => {
    const parts: string[] = [];
    
    const purchaserName = getPurchaserName(sauda.purchaser_id);
    if (purchaserName) parts.push(purchaserName);
    
    const riceCodeName = getRiceCodeName(sauda.rice_code_id);
    if (riceCodeName) parts.push(riceCodeName);
    
    const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, riceTypes);
    if (riceTypeLabel) parts.push(riceTypeLabel);
    
    return parts.join(' - ') || 'Sauda';
  };

  // Check if sauda is used in any payment advice, ISP, or kaanta
  const isSaudaInUse = (saudaId: string): boolean => {
    const inPaymentAdvice = paymentAdvices.some(pa => pa.sauda_id === saudaId);
    const inISP = inwardSlipPasses.some(isp => isp.sauda_ids?.includes(saudaId));
    const inKaanta = kaantas.some(k => k.sauda_id === saudaId);
    return inPaymentAdvice || inISP || inKaanta;
  };

  // Get usage counts for a sauda
  const getSaudaUsageCounts = (saudaId: string): {
    paymentAdvices: number;
    isps: number;
    kaantas: number;
  } => {
    const paCount = paymentAdvices.filter(pa => pa.sauda_id === saudaId).length;
    const ispCount = inwardSlipPasses.filter(isp => isp.sauda_ids?.includes(saudaId)).length;
    const kaantaCount = kaantas.filter(k => k.sauda_id === saudaId).length;
    
    return {
      paymentAdvices: paCount,
      isps: ispCount,
      kaantas: kaantaCount
    };
  };

  // Get usage details for a sauda (for delete warning)
  const getSaudaUsageDetails = async (saudaId: string): Promise<{
    paymentAdvices: string[];
    isps: string[];
    kaantas: string[];
  }> => {
    const paList = paymentAdvices
      .filter(pa => pa.sauda_id === saudaId)
      .map(pa => pa.transaction_id || pa.id);
    
    const ispList = inwardSlipPasses
      .filter(isp => isp.sauda_ids?.includes(saudaId))
      .map(isp => isp.slip_number || isp.id);
    
    const kaantaList = kaantas
      .filter(k => k.sauda_id === saudaId)
      .map(k => k.kaanta_id || k.id);
    
    return {
      paymentAdvices: paList,
      isps: ispList,
      kaantas: kaantaList
    };
  };

  const handleViewDocuments = (docs: DocumentInfo[]) => {
    setViewerDocuments(docs);
    setDocumentViewerOpen(true);
  };

  const filtered = useMemo(() => {
    return saudas.filter((s) => {
      const q = searchQuery.toLowerCase();
      const displayName = getSaudaDisplayName(s).toLowerCase();
      const purchaserName = getPurchaserName(s.purchaser_id).toLowerCase();
      const riceCodeName = getRiceCodeName(s.rice_code_id).toLowerCase();
      const riceTypeLabel = getRiceTypeLabel(s.rice_type, riceTypes).toLowerCase();
      const matchesSearch =
        displayName.includes(q) ||
        purchaserName.includes(q) ||
        riceCodeName.includes(q) ||
        riceTypeLabel.includes(q) ||
        s.id.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [saudas, searchQuery, riceCodes, riceTypes, vendors]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by purchaser, rice code, type or ID..." />
        </div>
        <div className="flex gap-2">
          <FilterDropdown
            label="Type"
            options={[
              { label: 'Ex Godown', value: 'exgodown' },
              { label: 'FOR', value: 'for' },
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No saudas found" description="Create your first sauda or adjust filters." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <article
              key={s.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.sauda_type}</div>
                    <h3 className="text-sm font-semibold leading-tight">
                      {getSaudaDisplayName(s)}
                    </h3>
                    <div className="text-xs text-muted-foreground">Rate: ₹{(s.rate ?? 0).toFixed(2)}</div>
                    {s.completion_percentage !== null && (
                      <div className="mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getCompletionStatus(s.completion_percentage).bgColor} ${getCompletionStatus(s.completion_percentage).color} border ${getCompletionStatus(s.completion_percentage).borderColor}`}>
                          {getCompletionStatus(s.completion_percentage).label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                {s.quantity && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Quantity:</span>
                    <span className="font-medium">{formatWeightDisplay(s.received_until_now, s.quantity)}</span>
                    {s.completion_percentage !== null && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${getCompletionStatus(s.completion_percentage).bgColor} ${getCompletionStatus(s.completion_percentage).color}`}>
                        {formatCompletionPercentage(s.completion_percentage)}
                      </span>
                    )}
                  </div>
                )}
                {!s.quantity && s.received_until_now > 0 && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Received:</span>
                    <span className="font-medium">{s.received_until_now.toFixed(2)} kg</span>
                  </div>
                )}
                {s.broker_commission != null && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Broker Comm:</span>
                    <span className="font-medium">
                      {s.broker_commission_type === 'rupees' 
                        ? `₹${s.broker_commission.toFixed(2)}` 
                        : s.broker_commission_type === 'weight'
                        ? `₹${s.broker_commission.toFixed(2)}/Kg`
                        : `${s.broker_commission}%`}
                    </span>
                  </div>
                )}
                {s.cash_discount != null && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Cash Discount:</span>
                    <span className="font-medium">
                      {s.cash_discount_type === 'percentage' 
                        ? `${s.cash_discount}%` 
                        : `₹${s.cash_discount.toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                {isSaudaInUse(s.id) && (() => {
                  const counts = getSaudaUsageCounts(s.id);
                  const parts: string[] = [];
                  if (counts.paymentAdvices > 0) {
                    parts.push(`${counts.paymentAdvices} payment advice${counts.paymentAdvices !== 1 ? 's' : ''}`);
                  }
                  if (counts.isps > 0) {
                    parts.push(`${counts.isps} ISP${counts.isps !== 1 ? 's' : ''}`);
                  }
                  if (counts.kaantas > 0) {
                    parts.push(`${counts.kaantas} kaanta${counts.kaantas !== 1 ? 's' : ''}`);
                  }
                  return (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Used in {parts.join(', ')}
                    </span>
                  );
                })()}
                <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => {
                    setPreviewSauda(s);
                    setPreviewOpen(true);
                  }}
                  className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                  title="View Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
                
                {/* Notification buttons */}
                <button
                  onClick={() => {
                    setSelectedSaudaForNotification(s.id);
                    setEmailModalOpen(true);
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Send Email"
                >
                  <Mail className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedSaudaForNotification(s.id);
                    setWhatsappModalOpen(true);
                  }}
                  className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                  title="Send WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
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
                      className="glass min-w-[10rem] rounded-xl p-1 shadow-lg z-50"
                      sideOffset={8}
                      align="end"
                    >
                      {/* View Images Section - Always visible */}
                      <DropdownMenu.Label className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
                        View Images
                      </DropdownMenu.Label>
                      <DropdownMenu.Item
                        className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                          s.cooked_rice_image_url 
                            ? 'hover:bg-accent hover:text-accent-foreground text-amber-600' 
                            : 'text-muted-foreground/50 cursor-not-allowed'
                        }`}
                        disabled={!s.cooked_rice_image_url}
                        onSelect={() => s.cooked_rice_image_url && handleViewDocuments([{ url: s.cooked_rice_image_url, label: 'Cooked Rice Sample', type: 'image' }])}
                      >
                        <UtensilsCrossed className="h-4 w-4" /> Cooked Rice
                        {!s.cooked_rice_image_url && <span className="ml-auto text-[10px]">N/A</span>}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                          s.uncooked_rice_image_url 
                            ? 'hover:bg-accent hover:text-accent-foreground text-amber-600' 
                            : 'text-muted-foreground/50 cursor-not-allowed'
                        }`}
                        disabled={!s.uncooked_rice_image_url}
                        onSelect={() => s.uncooked_rice_image_url && handleViewDocuments([{ url: s.uncooked_rice_image_url, label: 'Uncooked Rice Sample', type: 'image' }])}
                      >
                        <Wheat className="h-4 w-4" /> Uncooked Rice
                        {!s.uncooked_rice_image_url && <span className="ml-auto text-[10px]">N/A</span>}
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      
                      {/* Edit/Delete Actions */}
                      <DropdownMenu.Item
                        className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        onSelect={() => {
                          setSelectedSaudaId(s.id);
                          setEditModalOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" /> Edit
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onSelect={async () => {
                          if (isSaudaInUse(s.id)) {
                            const usage = await getSaudaUsageDetails(s.id);
                            const parts: string[] = [];
                            
                            if (usage.paymentAdvices.length > 0) {
                              parts.push(`Payment Advices (${usage.paymentAdvices.length}):\n${usage.paymentAdvices.map((pa, i) => `${i + 1}. ${pa}`).join('\n')}`);
                            }
                            if (usage.isps.length > 0) {
                              parts.push(`Inward Slip Passes (${usage.isps.length}):\n${usage.isps.map((isp, i) => `${i + 1}. ${isp}`).join('\n')}`);
                            }
                            if (usage.kaantas.length > 0) {
                              parts.push(`Kaantas (${usage.kaantas.length}):\n${usage.kaantas.map((k, i) => `${i + 1}. ${k}`).join('\n')}`);
                            }
                            
                            setAlertType('warning');
                            setAlertTitle('Cannot Delete Sauda');
                            setAlertMessage(`This sauda is currently used in:\n\n${parts.join('\n\n')}\n\nPlease remove it from all related records before deleting.`);
                            setAlertOpen(true);
                            return;
                          }
                          setSelectedSauda(s);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedSauda) {
            await deleteSauda(selectedSauda.id);
            setDeleteDialogOpen(false);
            setSelectedSauda(null);
            // Refresh usage data after deletion
            const [pas, isps, kaantasData] = await Promise.all([
              paymentAdvicesAPI.getAllPaymentAdvices(),
              inwardSlipPassesAPI.getAllInwardSlipPasses(),
              kaantasAPI.getAllKaantas()
            ]);
            setPaymentAdvices(pas);
            setInwardSlipPasses(isps);
            setKaantas(kaantasData);
          }
        }}
        title="Delete Sauda"
        description={`Are you sure you want to delete ${selectedSauda ? getSaudaDisplayName(selectedSauda) : 'this sauda'}? This action cannot be undone.`}
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <SaudaFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            refetch();
          }
        }}
        onSuccess={refetch}
      />

      <SaudaFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedSaudaId(null);
            refetch();
          }
        }}
        saudaId={selectedSaudaId}
        onSuccess={refetch}
      />

      <SaudaPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        sauda={previewSauda}
      />

      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        document={viewerDocuments[0] || null}
        documents={viewerDocuments}
      />

      {selectedSaudaForNotification && (
        <>
          <SaudaEmailModal
            open={emailModalOpen}
            onOpenChange={(open) => {
              setEmailModalOpen(open);
              if (!open) {
                setSelectedSaudaForNotification(null);
              }
            }}
            saudaId={selectedSaudaForNotification}
            onSuccess={() => {
              refetch();
            }}
          />

          <SaudaWhatsAppModal
            open={whatsappModalOpen}
            onOpenChange={(open) => {
              setWhatsappModalOpen(open);
              if (!open) {
                setSelectedSaudaForNotification(null);
              }
            }}
            saudaId={selectedSaudaForNotification}
            onSuccess={() => {
              refetch();
            }}
          />
        </>
      )}
    </div>
  );
}

