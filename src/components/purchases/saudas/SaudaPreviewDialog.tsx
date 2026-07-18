import * as Dialog from '@radix-ui/react-dialog';
import { X, Package, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { riceLengthsAPI } from '../../../services/riceLengths.api';
import { toRiceLengthLabelOptions } from '../../../utils/riceLengthModule';
import { vendorsAPI } from '../../../services/vendors.api';
import { useVendors } from '../../../hooks/useVendors';
import { useBrokers } from '../../../hooks/useBrokers';
import { getRiceTypeLabel, getRiceLengthLabel } from '../../../utils/riceType';
import { getSaudaRiceCategoryLabel } from '../../../utils/saudaDisplay';
import { buildSaudaPdfViewModel, prepareSaudaPdfDownload } from '../../../utils/saudaPdfData';
import { downloadSaudaPurchaseOrderPdf } from '../../../utils/saudaPdfPrint';
import { formatSaudaAvgGrainLengthDisplay, formatSaudaWhitenessDisplay } from '../../../utils/saudaParameters';
import { getCompletionStatus, formatCompletionPercentage, formatWeightDisplay } from '../../../utils/saudaCompletion';
import { SaudaWorkflowStatusBadge } from './SaudaWorkflowStatusBadge';
import { DocumentViewerModal, type DocumentInfo } from '../../shared/DocumentViewerModal';
import type { Sauda, RiceCode, RiceType } from '../../../types/entities';

interface DefaultRecipient {
  name: string;
  address: string;
  llpin: string;
}

interface SaudaPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sauda: Sauda | null;
  /** 1-based row number in the current filtered Saudas list */
  serialNumber?: number;
}

export function SaudaPreviewDialog({ open, onOpenChange, sauda, serialNumber }: SaudaPreviewDialogProps) {
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [riceLengths, setRiceLengths] = useState<RiceType[]>([]);
  const [defaultRecipient, setDefaultRecipient] = useState<DefaultRecipient | null>(null);
  const { vendors } = useVendors();
  const { brokers } = useBrokers();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Document viewer state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [viewerDocuments, setViewerDocuments] = useState<DocumentInfo[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [codes, types, lengths, recipient] = await Promise.all([
          riceCodesAPI.getAllRiceCodes(),
          riceCodesAPI.getRiceTypes(),
          riceLengthsAPI.getAllRiceLengths(),
          vendorsAPI.getDefaultRecipient()
        ]);
        setRiceCodes(codes);
        setRiceTypes(types);
        setRiceLengths(toRiceLengthLabelOptions(lengths));
        setDefaultRecipient(recipient);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    if (open && sauda) {
      fetchData();
    }
  }, [open, sauda]);

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '-';
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '-';
  };

  const getVendorName = (vendorId: string): string => {
    if (!vendorId) return '-';
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.business_name : '-';
  };

  const getBrokerName = (brokerId: string | null): string => {
    if (!brokerId) return '-';
    const broker = brokers.find(b => b.id === brokerId);
    return broker ? broker.business_name : '-';
  };

  const getSaudaDocuments = (): DocumentInfo[] => {
    if (!sauda) return [];
    const docs: DocumentInfo[] = [];
    if (sauda.cooked_rice_image_url) {
      docs.push({ url: sauda.cooked_rice_image_url, label: 'Cooked Rice Sample', type: 'image' });
    }
    if (sauda.uncooked_rice_image_url) {
      docs.push({ url: sauda.uncooked_rice_image_url, label: 'Uncooked Rice Sample', type: 'image' });
    }
    return docs;
  };

  const handleViewImage = (docs: DocumentInfo[], startIndex: number = 0) => {
    // Reorder so the clicked image is first
    const reordered = [...docs.slice(startIndex), ...docs.slice(0, startIndex)];
    setViewerDocuments(reordered);
    setDocumentViewerOpen(true);
  };

  const handleDownloadPDF = async () => {
    if (!sauda || !defaultRecipient) return;

    try {
      const { pdfData, filename } = await prepareSaudaPdfDownload(
        {
          sauda,
          serialNumber,
          vendors,
          brokers,
          riceCodes,
          riceTypes,
          company: {
            name: defaultRecipient.name,
            address: defaultRecipient.address,
            llpin: defaultRecipient.llpin,
          },
        },
        { sauda, serialNumber, vendors },
      );
      await downloadSaudaPurchaseOrderPdf(pdfData, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (!sauda) return null;

  const estimatedAmount = sauda.rate && sauda.quantity ? sauda.rate * sauda.quantity : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-xl translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <Dialog.Title className="text-lg font-semibold">Sauda Preview</Dialog.Title>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div ref={previewRef} className="border border-border rounded-lg p-4 bg-background font-mono text-sm">
              {/* Header */}
              <div className="text-center border-b-2 border-dashed border-border pb-4 mb-4">
                <h2 className="font-bold text-lg">{defaultRecipient?.name || 'Loading...'}</h2>
                <p className="text-xs text-muted-foreground">LLPIN: {defaultRecipient?.llpin || '-'}</p>
                <p className="text-xs text-muted-foreground mt-1">{defaultRecipient?.address || '-'}</p>
              </div>

              {/* Sauda Title */}
              <div className="text-center mb-4">
                <h3 className="font-bold text-base uppercase border-b border-border pb-2">Sauda Details</h3>
              </div>

              {/* Basic Info */}
              <div className="mb-4">
                <div className="font-bold border-b border-border pb-1 mb-2">Basic Information</div>
                {serialNumber != null && (
                  <div className="mb-2 text-left">
                    <span className="text-muted-foreground">S. No.: </span>
                    <span className="font-semibold tabular-nums">{serialNumber}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sauda Type:</span>
                    <span className="font-semibold">{sauda.sauda_type === 'exgodown' ? 'Ex Godown' : 'FOR'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-semibold">
                      {getSaudaRiceCategoryLabel(sauda, riceCodes) || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rice Code:</span>
                    <span className="font-semibold">{getRiceCodeName(sauda.rice_code_id)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rice Type:</span>
                    <span className="font-semibold">{getRiceTypeLabel(sauda.rice_type, riceTypes) || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rice Length:</span>
                    <span className="font-semibold">
                      {getRiceLengthLabel(sauda.rice_length, riceLengths) || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Whiteness (W):</span>
                    <span className="font-semibold">
                      {formatSaudaWhitenessDisplay(sauda.parameters?.whiteness)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Grain Length (mm):</span>
                    <span className="font-semibold">
                      {formatSaudaAvgGrainLengthDisplay(sauda.parameters?.average_grain_length)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-semibold">
                      {sauda.sauda_date 
                        ? new Date(sauda.sauda_date + 'T00:00:00').toLocaleDateString('en-IN')
                        : new Date(sauda.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-4">
                <div className="font-bold border-b border-border pb-1 mb-2">Pricing & Quantity</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="font-semibold">₹{sauda.rate?.toFixed(2) || '0.00'}/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Quantity:</span>
                    <span className="font-semibold">{sauda.quantity?.toFixed(2) || '-'} kg</span>
                  </div>
                  {sauda.no_of_bags != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">No. of Bags:</span>
                      <span className="font-semibold">{sauda.no_of_bags}</span>
                    </div>
                  )}
                  {sauda.bag_weight != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bag Weight:</span>
                      <span className="font-semibold">{sauda.bag_weight.toFixed(2)} kg</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Received Weight:</span>
                    <span className="font-semibold">{sauda.received_until_now.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completion:</span>
                    <span className="font-semibold">
                      {sauda.completion_percentage !== null ? (
                        <span className={`px-2 py-0.5 rounded ${getCompletionStatus(sauda.completion_percentage).bgColor} ${getCompletionStatus(sauda.completion_percentage).color}`}>
                          {formatCompletionPercentage(sauda.completion_percentage)}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </span>
                  </div>
                  {(sauda.status === 'completed' || sauda.completion_percentage !== null) && (
                    <div className="col-span-2 flex justify-between items-center mt-1 pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">Status:</span>
                      {sauda.status === 'completed' ? (
                        <SaudaWorkflowStatusBadge status="completed" />
                      ) : sauda.completion_percentage !== null ? (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getCompletionStatus(sauda.completion_percentage).bgColor} ${getCompletionStatus(sauda.completion_percentage).color} border ${getCompletionStatus(sauda.completion_percentage).borderColor}`}
                        >
                          {getCompletionStatus(sauda.completion_percentage).label}
                        </span>
                      ) : null}
                    </div>
                  )}
                  {sauda.cash_discount != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cash Discount:</span>
                      <span className="font-semibold text-emerald-600">
                        {sauda.cash_discount_type === 'percentage' ? `${sauda.cash_discount}%` : `₹${sauda.cash_discount?.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Parties */}
              <div className="mb-4">
                <div className="font-bold border-b border-border pb-1 mb-2">Parties</div>
                <div className="grid grid-cols-1 gap-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendor:</span>
                    <span className="font-semibold">{getVendorName(sauda.purchaser_id)}</span>
                  </div>
                  {sauda.broker_id && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Broker:</span>
                        <span className="font-semibold">{getBrokerName(sauda.broker_id)}</span>
                      </div>
                      {sauda.broker_commission != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Commission:</span>
                          <span className="font-semibold">
                            {sauda.broker_commission_type === 'percentage' 
                              ? `${sauda.broker_commission}%`
                              : sauda.broker_commission_type === 'weight'
                              ? `₹${sauda.broker_commission}/kg`
                              : `₹${sauda.broker_commission?.toFixed(2)}`}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Amount */}
              {estimatedAmount && (
                <div className="bg-muted/50 rounded-lg p-3 text-center mt-4">
                  <p className="text-xs text-muted-foreground mb-1">Estimated Amount</p>
                  <p className="text-xl font-bold text-primary">
                    ₹{estimatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {/* Rice Sample Images */}
              {getSaudaDocuments().length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-border">
                  <div className="font-bold border-b border-border pb-1 mb-3">Rice Samples</div>
                  <div className="grid grid-cols-2 gap-3">
                    {sauda.cooked_rice_image_url && (
                      <button
                        onClick={() => handleViewImage(getSaudaDocuments(), 0)}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all bg-muted/30"
                      >
                        <img 
                          src={sauda.cooked_rice_image_url} 
                          alt="Cooked Rice Sample"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <span className="text-white text-xs font-medium">Cooked Rice</span>
                        </div>
                      </button>
                    )}
                    {sauda.uncooked_rice_image_url && (
                      <button
                        onClick={() => handleViewImage(getSaudaDocuments(), sauda.cooked_rice_image_url ? 1 : 0)}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all bg-muted/30"
                      >
                        <img 
                          src={sauda.uncooked_rice_image_url} 
                          alt="Uncooked Rice Sample"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <span className="text-white text-xs font-medium">Uncooked Rice</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {sauda.notes && (
                <div className="mt-4 pt-4 border-t border-dashed border-border">
                  <p className="text-xs text-muted-foreground">Notes:</p>
                  <p className="text-sm">{sauda.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center border-t-2 border-dashed border-border pt-4 mt-4">
                <p className="text-xs text-muted-foreground">Generated on {new Date().toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">This is a computer-generated document</p>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        document={viewerDocuments[0] || null}
        documents={viewerDocuments}
      />
    </Dialog.Root>
  );
}
