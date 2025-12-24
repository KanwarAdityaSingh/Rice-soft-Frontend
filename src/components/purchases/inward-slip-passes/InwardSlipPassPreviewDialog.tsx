import * as Dialog from '@radix-ui/react-dialog';
import { X, FileText, Download, Image as ImageIcon, Files } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { vendorsAPI } from '../../../services/vendors.api';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { useTransporters } from '../../../hooks/useTransporters';
import { useSaudas } from '../../../hooks/useSaudas';
import { useVendors } from '../../../hooks/useVendors';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { DocumentViewerModal, type DocumentInfo } from '../../shared/DocumentViewerModal';
import type { InwardSlipPass, RiceCode, RiceType, Sauda, Vehicle } from '../../../types/entities';

interface DefaultRecipient {
  name: string;
  address: string;
  llpin: string;
}

interface InwardSlipPassPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isp: InwardSlipPass | null;
}

export function InwardSlipPassPreviewDialog({ open, onOpenChange, isp }: InwardSlipPassPreviewDialogProps) {
  const [defaultRecipient, setDefaultRecipient] = useState<DefaultRecipient | null>(null);
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const { transporters } = useTransporters();
  const { saudas } = useSaudas();
  const { vendors } = useVendors();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Document viewer state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [viewerDocuments, setViewerDocuments] = useState<DocumentInfo[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipient, codes, types] = await Promise.all([
          vendorsAPI.getDefaultRecipient(),
          riceCodesAPI.getAllRiceCodes(),
          riceCodesAPI.getRiceTypes()
        ]);
        setDefaultRecipient(recipient);
        setRiceCodes(codes);
        setRiceTypes(types);
        
        // Fetch vehicle details
        if (isp?.vehicle_id) {
          try {
            const vehicleData = await vehiclesAPI.getVehicleById(isp.vehicle_id);
            setVehicle(vehicleData);
          } catch (err) {
            console.error('Failed to fetch vehicle:', err);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    if (open && isp) {
      fetchData();
    }
  }, [open, isp]);

  const getTransporterName = (transporterId: string | null): string => {
    if (!transporterId) return '-';
    const transporter = transporters.find(t => t.id === transporterId);
    return transporter ? transporter.business_name : '-';
  };

  const getPurchaserName = (purchaserId: string | null | undefined): string => {
    if (!purchaserId) return '';
    const purchaser = vendors.find((v) => v.id === purchaserId);
    return purchaser ? purchaser.business_name : '';
  };

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '';
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

  const getLinkedSaudas = (): Sauda[] => {
    if (!isp?.sauda_ids) return [];
    return saudas.filter(s => isp.sauda_ids.includes(s.id));
  };

  const getISPDocuments = (): DocumentInfo[] => {
    if (!isp) return [];
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

  const handleViewDocuments = (docs: DocumentInfo[], startIndex: number = 0) => {
    const reordered = [...docs.slice(startIndex), ...docs.slice(0, startIndex)];
    setViewerDocuments(reordered);
    setDocumentViewerOpen(true);
  };

  const handleDownloadPDF = () => {
    if (!previewRef.current) return;
    
    try {
      const printContent = previewRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to download the PDF');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Inward Slip Pass - ${isp?.slip_number}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Courier New', monospace; padding: 20px; background: white; color: black; font-size: 11px; }
              .preview-container { max-width: 700px; margin: 0 auto; border: 2px solid #333; padding: 15px; }
              .thanks { text-align: center; font-size: 10px; margin-bottom: 20px; }
              .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 15px; }
              .header h2 { font-size: 20px; margin-bottom: 3px; letter-spacing: 2px; }
              .header p { font-size: 9px; color: #666; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px dotted #999; }
              .info-pair { display: flex; gap: 8px; }
              .info-label { color: #666; }
              .info-value { font-weight: bold; }
              .weight-section { margin: 15px 0; }
              .weight-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dotted #999; }
              .weight-label { flex: 1; }
              .weight-value { font-weight: bold; font-size: 14px; min-width: 100px; text-align: right; }
              .weight-date { font-size: 10px; color: #666; margin-left: 20px; min-width: 150px; }
              .net-weight { background: #f5f5f5; padding: 10px; font-size: 16px; font-weight: bold; border: 2px solid #333; }
              .charges { margin-top: 15px; padding-top: 10px; border-top: 2px dashed #333; }
              .sauda-section { margin-top: 15px; padding: 10px; background: #f9f9f9; }
              .sauda-item { padding: 5px 0; border-bottom: 1px dotted #ccc; }
              @media print { body { padding: 0; } .preview-container { border: none; } }
            </style>
          </head>
          <body>
            <div class="preview-container">${printContent}</div>
            <script>
              (function() {
                var printWindow = window;
                var closed = false;
                
                function closeWindow() {
                  if (!closed && printWindow && !printWindow.closed) {
                    closed = true;
                    try {
                      printWindow.close();
                    } catch (e) {
                      // Ignore errors when closing
                    }
                  }
                }
                
                // Use onafterprint event if available (more reliable)
                if (printWindow.matchMedia) {
                  var mediaQueryList = printWindow.matchMedia('print');
                  mediaQueryList.addEventListener('change', function(mql) {
                    if (!mql.matches) {
                      // Print dialog was closed
                      setTimeout(closeWindow, 100);
                    }
                  });
                }
                
                // Fallback: use onafterprint event
                printWindow.onafterprint = function() {
                  setTimeout(closeWindow, 100);
                };
                
                // Trigger print after a short delay
                setTimeout(function() {
                  printWindow.print();
                }, 250);
              })();
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (!isp) return null;

  const linkedSaudas = getLinkedSaudas();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-xl translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <Dialog.Title className="text-lg font-semibold">ISP Preview</Dialog.Title>
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

            <div ref={previewRef} className="border-2 border-border rounded-lg p-4 bg-background font-mono text-xs">
              {/* Thanks Message */}
              <div className="text-center mb-4 text-[10px] text-muted-foreground">
                ! Thanks for your visit !
              </div>

              {/* Company Header */}
              <div className="text-center border-b-2 border-dashed border-border pb-3 mb-4">
                <h2 className="font-bold text-lg tracking-wider">{defaultRecipient?.name || 'Loading...'}</h2>
                <p className="text-[9px] text-muted-foreground mt-1">{defaultRecipient?.address || '-'}</p>
                <p className="text-[9px] text-muted-foreground">LLPIN: {defaultRecipient?.llpin || '-'}</p>
              </div>

              {/* Slip Info Row */}
              <div className="border-b border-dotted border-border pb-2 mb-3">
                <div className="flex justify-between gap-4 flex-wrap">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">RST No.:</span>
                    <span className="font-bold">{isp.slip_number}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Vehicle No.:</span>
                    <span className="font-bold">{vehicle?.vehicle_number || '-'}</span>
                  </div>
                </div>
                <div className="flex justify-between gap-4 mt-2 flex-wrap">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Party Name:</span>
                    <span className="font-bold">{isp.party_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Item:</span>
                    <span className="font-bold">RICE</span>
                  </div>
                </div>
              </div>

              {/* Address Row */}
              {isp.party_address && (
                <div className="border-b border-dotted border-border pb-2 mb-3">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-semibold ml-2">{isp.party_address}</span>
                </div>
              )}

              {/* Date */}
              <div className="flex justify-between border-b border-dotted border-border pb-2 mb-3">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-bold">{new Date(isp.date).toLocaleDateString('en-IN')}</span>
              </div>

              {/* Charges */}
              {isp.transportation_cost != null && (
                <div className="border-t-2 border-dashed border-border pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transportation Cost:</span>
                    <span className="font-bold">₹ {isp.transportation_cost?.toLocaleString('en-IN') || '-'}</span>
                  </div>
                </div>
              )}

              {/* Transporter Info */}
              {isp.transporter_id && (
                <div className="border-t border-dotted border-border pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transporter:</span>
                    <span className="font-semibold">{getTransporterName(isp.transporter_id)}</span>
                  </div>
                </div>
              )}

              {/* Linked Saudas */}
              {linkedSaudas.length > 0 && (
                <div className="border-t-2 border-dashed border-border pt-3 mt-3">
                  <div className="font-bold mb-2">Linked Saudas ({linkedSaudas.length})</div>
                  <div className="space-y-1 bg-muted/30 p-2 rounded">
                    {linkedSaudas.map((sauda, idx) => (
                      <div key={sauda.id} className="flex justify-between items-center py-1 border-b border-dotted border-border last:border-0">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <span className="flex-1 ml-2">{getSaudaDisplayName(sauda)}</span>
                        <span className="font-semibold">₹{sauda.rate}/kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              {getISPDocuments().length > 0 && (
                <div className="border-t-2 border-dashed border-border pt-3 mt-3">
                  <div className="font-bold mb-2 flex items-center gap-2">
                    <Files className="h-4 w-4" />
                    Documents ({getISPDocuments().length})
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {getISPDocuments().map((doc, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleViewDocuments(getISPDocuments(), idx)}
                        className="group flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border hover:border-primary/50 transition-all"
                      >
                        {doc.type === 'pdf' ? (
                          <FileText className="h-6 w-6 text-red-500" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-blue-500" />
                        )}
                        <span className="text-[10px] text-center text-muted-foreground group-hover:text-foreground line-clamp-2">
                          {doc.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {isp.notes && (
                <div className="border-t border-dotted border-border pt-2 mt-3">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1">{isp.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center border-t-2 border-dashed border-border pt-3 mt-4">
                <p className="text-[9px] text-muted-foreground">Generated on {new Date().toLocaleString('en-IN')}</p>
                <p className="text-[9px] text-muted-foreground">This is a computer-generated document</p>
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
