import { useState, useMemo, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { DocumentViewerModal, type DocumentInfo } from '../../shared/DocumentViewerModal';
import { CreditCard, FileText, Package, Eye, Pencil, Trash2, Image as ImageIcon, MoreVertical, Receipt, Mail, MessageCircle } from 'lucide-react';
import { usePaymentAdvices } from '../../../hooks/usePaymentAdvices';
import { useSaudas } from '../../../hooks/useSaudas';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { useVendors } from '../../../hooks/useVendors';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { PaymentAdviceFormModal } from './PaymentAdviceFormModal';
import { PaymentAdvicePreviewDialog } from './PaymentAdvicePreviewDialog';
import { PaymentAdviceEmailModal } from './PaymentAdviceEmailModal';
import { PaymentAdviceWhatsAppModal } from './PaymentAdviceWhatsAppModal';
import type { PaymentAdvice, RiceCode, RiceType, Sauda, InwardSlipPass } from '../../../types/entities';

export function PaymentAdvicesTable() {
  // Updated: removed purchaseFilter, now uses sauda_id and inward_slip_pass_id
  const { paymentAdvices, loading, deletePaymentAdvice, refetch } = usePaymentAdvices();
  const { saudas } = useSaudas();
  const { inwardSlipPasses } = useInwardSlipPasses();
  const { vendors } = useVendors();
  
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPA, setSelectedPA] = useState<PaymentAdvice | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPAId, setSelectedPAId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPA, setPreviewPA] = useState<PaymentAdvice | null>(null);
  
  // Document viewer state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<DocumentInfo | null>(null);
  
  // Notification state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedPAForNotification, setSelectedPAForNotification] = useState<PaymentAdvice | null>(null);

  const handleViewPaymentSlip = (pa: PaymentAdvice) => {
    // Handle both possible field names from backend
    const slipUrl = (pa as any).payment_slip_image_url || pa.payment_slip_url;
    if (slipUrl) {
      const isPdf = slipUrl.toLowerCase().includes('.pdf');
      setViewerDocument({ 
        url: slipUrl, 
        label: 'Payment Slip', 
        type: isPdf ? 'pdf' : 'image' 
      });
      setDocumentViewerOpen(true);
    }
  };

  const hasPaymentSlip = (pa: PaymentAdvice): boolean => {
    return !!((pa as any).payment_slip_image_url || pa.payment_slip_url);
  };

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [codes, types] = await Promise.all([
          riceCodesAPI.getAllRiceCodes(),
          riceCodesAPI.getRiceTypes()
        ]);
        setRiceCodes(codes);
        setRiceTypes(types);
      } catch (error) {
        console.error('Failed to fetch reference data:', error);
      }
    };
    fetchReferenceData();
  }, []);

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '';
  };

  const getSaudaInfo = (saudaId: string | null | undefined): Sauda | undefined => {
    if (!saudaId) return undefined;
    return saudas.find(s => s.id === saudaId);
  };

  const getISPInfo = (ispId: string | null | undefined): InwardSlipPass | undefined => {
    if (!ispId) return undefined;
    return inwardSlipPasses.find(isp => isp.id === ispId);
  };

  const getVendorName = (vendorId: string | null | undefined): string => {
    if (!vendorId) return '';
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.business_name : '';
  };

  const getLinkDisplay = (pa: PaymentAdvice): { type: string; label: string; icon: typeof Package } => {
    if (pa.sauda_id) {
      const sauda = getSaudaInfo(pa.sauda_id);
      if (sauda) {
        const riceCodeName = getRiceCodeName(sauda.rice_code_id);
        const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, riceTypes);
        return {
          type: 'Sauda',
          label: `${riceCodeName || 'Rice'} ${riceTypeLabel ? `- ${riceTypeLabel}` : ''} @ ₹${sauda.rate}`,
          icon: Package
        };
      }
      return { type: 'Sauda', label: 'Unknown Sauda', icon: Package };
    } else if (pa.inward_slip_pass_id) {
      const isp = getISPInfo(pa.inward_slip_pass_id);
      if (isp) {
        return {
          type: 'ISP',
          label: `${isp.slip_number} - ${isp.party_name}`,
          icon: FileText
        };
      }
      return { type: 'ISP', label: 'Unknown ISP', icon: FileText };
    }
    return { type: '-', label: 'Not linked', icon: CreditCard };
  };

  const filtered = useMemo(() => {
    return paymentAdvices.filter((pa) => {
      const q = searchQuery.toLowerCase();
      const linkInfo = getLinkDisplay(pa);
      const matchesSearch =
        pa.transaction_id?.toLowerCase().includes(q) ||
        pa.id.toLowerCase().includes(q) ||
        linkInfo.label.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [paymentAdvices, searchQuery, saudas, inwardSlipPasses, riceCodes, riceTypes]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by transaction ID, sauda, or ISP..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add Payment Advice
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payment advices found" description="Create your first payment advice or adjust filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold">Linked To</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Transaction ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Net Payable</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pa) => {
                const linkInfo = getLinkDisplay(pa);
                const LinkIcon = linkInfo.icon;
                
                return (
                  <tr key={pa.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <LinkIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{linkInfo.type}</div>
                          <div className="font-medium text-sm">{linkInfo.label}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">{pa.transaction_id || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{new Date(pa.date_of_payment).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm">₹{(pa.amount ?? 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm font-medium">₹{(pa.net_payable ?? 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-md text-xs ${
                        pa.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                        pa.status === 'failed' ? 'bg-red-500/10 text-red-600' :
                        'bg-yellow-500/10 text-yellow-600'
                      }`}>
                        {pa.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setPreviewPA(pa);
                            setPreviewOpen(true);
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="View Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {/* Notification buttons */}
                        <button
                          onClick={() => {
                            setSelectedPAForNotification(pa);
                            setEmailModalOpen(true);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Send Email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPAForNotification(pa);
                            setWhatsappModalOpen(true);
                          }}
                          className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
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
                              {/* View Payment Slip - Always visible */}
                              <DropdownMenu.Label className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
                                View Documents
                              </DropdownMenu.Label>
                              <DropdownMenu.Item
                                className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                                  hasPaymentSlip(pa) 
                                    ? 'hover:bg-accent hover:text-accent-foreground text-violet-600' 
                                    : 'text-muted-foreground/50 cursor-not-allowed'
                                }`}
                                disabled={!hasPaymentSlip(pa)}
                                onSelect={() => hasPaymentSlip(pa) && handleViewPaymentSlip(pa)}
                              >
                                <Receipt className="h-4 w-4" /> Payment Slip
                                {!hasPaymentSlip(pa) && <span className="ml-auto text-[10px]">N/A</span>}
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="my-1 h-px bg-border" />
                              
                              {/* Edit/Delete Actions */}
                              <DropdownMenu.Item
                                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                onSelect={() => {
                                  setSelectedPAId(pa.id);
                                  setEditModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" /> Edit
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onSelect={() => {
                                  setSelectedPA(pa);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedPA) {
            await deletePaymentAdvice(selectedPA.id);
            setDeleteDialogOpen(false);
            setSelectedPA(null);
          }
        }}
        title="Delete Payment Advice"
        description={`Are you sure you want to delete this payment advice? This action cannot be undone.`}
        confirmText="Delete"
      />

      <PaymentAdviceFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            refetch();
          }
        }}
      />

      <PaymentAdviceFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedPAId(null);
            refetch();
          }
        }}
        paymentAdviceId={selectedPAId}
      />

      <PaymentAdvicePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        paymentAdvice={previewPA}
      />

      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        document={viewerDocument}
      />

      {selectedPAForNotification && (
        <>
          <PaymentAdviceEmailModal
            open={emailModalOpen}
            onOpenChange={(open) => {
              setEmailModalOpen(open);
              if (!open) {
                setSelectedPAForNotification(null);
              }
            }}
            paymentAdviceData={{
              adviceNumber: selectedPAForNotification.transaction_id || selectedPAForNotification.id,
              vendorName: getVendorName(selectedPAForNotification.payer_id) || getISPInfo(selectedPAForNotification.inward_slip_pass_id)?.party_name || 'Vendor',
              amount: selectedPAForNotification.net_payable ?? selectedPAForNotification.amount ?? 0,
              date: selectedPAForNotification.date_of_payment,
            }}
            onSuccess={() => {
              refetch();
            }}
          />

          <PaymentAdviceWhatsAppModal
            open={whatsappModalOpen}
            onOpenChange={(open) => {
              setWhatsappModalOpen(open);
              if (!open) {
                setSelectedPAForNotification(null);
              }
            }}
            paymentAdviceData={{
              adviceNumber: selectedPAForNotification.transaction_id || selectedPAForNotification.id,
              vendorName: getVendorName(selectedPAForNotification.payer_id) || getISPInfo(selectedPAForNotification.inward_slip_pass_id)?.party_name || 'Vendor',
              amount: selectedPAForNotification.net_payable ?? selectedPAForNotification.amount ?? 0,
              date: selectedPAForNotification.date_of_payment,
            }}
            onSuccess={() => {
              refetch();
            }}
          />
        </>
      )}
    </div>
  );
}
