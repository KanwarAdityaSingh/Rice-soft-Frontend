import * as Dialog from '@radix-ui/react-dialog';
import { X, CreditCard, Download, Image as ImageIcon, FileText } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { vendorsAPI } from '../../../services/vendors.api';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { purchasesAPI } from '../../../services/purchases.api';
import { useSaudas } from '../../../hooks/useSaudas';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { useBrokers } from '../../../hooks/useBrokers';
import { useTransporters } from '../../../hooks/useTransporters';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { DocumentViewerModal, type DocumentInfo } from '../../shared/DocumentViewerModal';
import type { PaymentAdvice, RiceCode, RiceType, Sauda, InwardSlipPass, Vehicle } from '../../../types/entities';

interface DefaultRecipient {
  name: string;
  address: string;
  llpin: string;
}

interface PurchaseSummary {
  total_lots: number;
  total_bags: number;
  total_weight: number;
  base_amount: number;
  cash_discount_amount: number;
  amount_after_discount: number;
  broker_commission_amount: number;
  amount_after_commission: number;
  transportation_cost: number;
  amount_after_transportation: number;
  igst_amount: number;
  final_total_amount: number;
  net_payable: number;
  sauda_details?: any;
  isp_details?: any[];
}

interface PaymentAdvicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentAdvice: PaymentAdvice | null;
}

export function PaymentAdvicePreviewDialog({ open, onOpenChange, paymentAdvice }: PaymentAdvicePreviewDialogProps) {
  const [defaultRecipient, setDefaultRecipient] = useState<DefaultRecipient | null>(null);
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const { saudas } = useSaudas();
  const { inwardSlipPasses } = useInwardSlipPasses();
  const { brokers } = useBrokers();
  const { transporters } = useTransporters();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Document viewer state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<DocumentInfo | null>(null);

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

        // Fetch summary
        if (paymentAdvice?.sauda_id) {
          const summaryData = await purchasesAPI.getSaudaSummary(paymentAdvice.sauda_id, paymentAdvice.igst_percentage || 0);
          setSummary(summaryData);
        } else if (paymentAdvice?.inward_slip_pass_id) {
          const summaryData = await purchasesAPI.getISPSummary(paymentAdvice.inward_slip_pass_id, paymentAdvice.igst_percentage || 0);
          setSummary(summaryData);
        }

        // Fetch vehicle if ISP is linked
        if (paymentAdvice?.inward_slip_pass_id) {
          const isp = inwardSlipPasses.find(i => i.id === paymentAdvice.inward_slip_pass_id);
          if (isp?.vehicle_id) {
            try {
              const vehicleData = await vehiclesAPI.getVehicleById(isp.vehicle_id);
              setVehicle(vehicleData);
            } catch (err) {
              console.error('Failed to fetch vehicle:', err);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    if (open && paymentAdvice) {
      fetchData();
    }
  }, [open, paymentAdvice, inwardSlipPasses]);

  const getSauda = (): Sauda | undefined => {
    if (!paymentAdvice?.sauda_id) return undefined;
    return saudas.find(s => s.id === paymentAdvice.sauda_id);
  };

  const getISP = (): InwardSlipPass | undefined => {
    if (!paymentAdvice?.inward_slip_pass_id) return undefined;
    return inwardSlipPasses.find(isp => isp.id === paymentAdvice.inward_slip_pass_id);
  };

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '';
  };

  const getBrokerName = (brokerId: string | null | undefined): string => {
    if (!brokerId) return '-';
    const broker = brokers.find(b => b.id === brokerId);
    return broker ? broker.business_name : '-';
  };

  const getTransporterName = (transporterId: string | null | undefined): string => {
    if (!transporterId) return '-';
    const transporter = transporters.find(t => t.id === transporterId);
    return transporter ? transporter.business_name : '-';
  };

  const getPaymentSlipUrl = (): string | null => {
    if (!paymentAdvice) return null;
    return (paymentAdvice as any).payment_slip_image_url || paymentAdvice.payment_slip_url || null;
  };

  const handleViewPaymentSlip = () => {
    const slipUrl = getPaymentSlipUrl();
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
            <title>Payment Advice - ${paymentAdvice?.transaction_id || paymentAdvice?.id}</title>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Arial', 'Helvetica', sans-serif; 
                padding: 30px; 
                background: white; 
                color: black; 
                font-size: 14px;
                line-height: 1.6;
              }
              .preview-container { 
                max-width: 800px; 
                margin: 0 auto; 
                border: 2px solid #333; 
                padding: 25px;
                background: white;
              }
              .header { 
                text-align: center; 
                border-bottom: 2px dashed #333; 
                padding-bottom: 15px; 
                margin-bottom: 20px; 
              }
              .header h2 { font-size: 22px; margin-bottom: 8px; font-weight: bold; }
              .header p { font-size: 12px; color: #666; margin: 4px 0; }
              .row { 
                display: flex; 
                justify-content: space-between; 
                padding: 8px 0; 
                border-bottom: 1px dotted #ccc; 
              }
              .label { color: #666; font-size: 13px; }
              .value { font-weight: bold; font-size: 14px; }
              .section { margin: 18px 0; }
              .section-title { 
                font-weight: bold; 
                border-bottom: 1px solid #333; 
                padding-bottom: 8px; 
                margin-bottom: 12px; 
                font-size: 16px;
              }
              .highlight { 
                background: #f5f5f5; 
                padding: 15px; 
                text-align: center; 
                margin-top: 20px; 
                border: 2px solid #333; 
              }
              .highlight .amount { font-size: 24px; font-weight: bold; }
              .footer { 
                text-align: center; 
                border-top: 2px dashed #333; 
                padding-top: 15px; 
                margin-top: 20px; 
                font-size: 11px; 
                color: #666; 
              }
              @media print { 
                body { padding: 15px; } 
                .preview-container { border: none; padding: 20px; }
                @page { margin: 1cm; }
              }
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

  if (!paymentAdvice) return null;

  const sauda = getSauda();
  const isp = getISP();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-xl translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <Dialog.Title className="text-lg font-semibold">Payment Advice Preview</Dialog.Title>
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
              {/* Header */}
              <div className="text-center border-b-2 border-dashed border-border pb-3 mb-4">
                <h2 className="font-bold text-lg">{defaultRecipient?.name || 'Loading...'}</h2>
                <p className="text-[9px] text-muted-foreground">LLPIN: {defaultRecipient?.llpin || '-'}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{defaultRecipient?.address || '-'}</p>
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-3 gap-2 border-b border-dotted border-border pb-2 mb-3">
                <div>
                  <span className="text-muted-foreground">SR.NO:</span>
                  <span className="font-bold ml-1">{paymentAdvice.sr_number || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-bold ml-1">{paymentAdvice.transaction_id || '-'}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-bold ml-1">{new Date(paymentAdvice.date_of_payment).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              {/* Party Info */}
              <div className="mb-3 border-b border-dotted border-border pb-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Party Name:</span>
                  <span className="font-bold">{paymentAdvice.party_name || isp?.party_name || '-'}</span>
                </div>
                {sauda?.broker_id && (
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Broker:</span>
                    <span className="font-semibold">{getBrokerName(sauda.broker_id)}</span>
                  </div>
                )}
              </div>

              {/* Linked Info */}
              <div className="mb-3 border-b border-dotted border-border pb-2">
                {sauda && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sauda:</span>
                    <span className="font-semibold">{getRiceCodeName(sauda.rice_code_id)} {getRiceTypeLabel(sauda.rice_type, riceTypes)} @ ₹{sauda.rate}/kg</span>
                  </div>
                )}
                {isp && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ISP:</span>
                    <span className="font-semibold">{isp.slip_number} - {vehicle?.vehicle_number || '-'}</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              {summary && (
                <div className="mb-3">
                  <div className="font-bold border-b border-border pb-1 mb-2">Calculation Breakdown</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Weight:</span>
                      <span className="font-semibold">{summary.total_weight?.toFixed(2) || '-'} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Bags:</span>
                      <span className="font-semibold">{summary.total_bags || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Amount:</span>
                      <span className="font-semibold">₹{summary.base_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '-'}</span>
                    </div>
                    {summary.cash_discount_amount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>- Cash Discount:</span>
                        <span>₹{summary.cash_discount_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {summary.broker_commission_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">+ Broker Commission:</span>
                        <span>₹{summary.broker_commission_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {summary.transportation_cost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">+ Transport:</span>
                        <span>₹{summary.transportation_cost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {summary.igst_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">+ IGST ({paymentAdvice.igst_percentage || 0}%):</span>
                        <span>₹{summary.igst_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Charges */}
              {paymentAdvice.charges && paymentAdvice.charges.length > 0 && (
                <div className="mb-3 border-t border-dotted border-border pt-2">
                  <div className="font-bold mb-2">Deductions</div>
                  {paymentAdvice.charges.map((charge, idx) => (
                    <div key={idx} className="flex justify-between text-red-600">
                      <span>- {charge.charge_name}:</span>
                      <span>₹{charge.charge_type === 'fixed' ? charge.charge_value?.toFixed(2) : `${charge.charge_value}%`}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Final Amount */}
              <div className="bg-primary/10 rounded-lg p-3 text-center mt-4 border-2 border-primary/30">
                <p className="text-xs text-muted-foreground mb-1">Net Payable</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{(paymentAdvice.net_payable || paymentAdvice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* Due Date */}
              {paymentAdvice.due_date && (
                <div className="text-center mt-2">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-bold ml-1">{new Date(paymentAdvice.due_date).toLocaleDateString('en-IN')}</span>
                </div>
              )}

              {/* Payment Slip */}
              {getPaymentSlipUrl() && (
                <div className="mt-4 pt-4 border-t border-dashed border-border">
                  <div className="font-bold mb-2">Payment Slip</div>
                  <button
                    onClick={handleViewPaymentSlip}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 border border-violet-500/20 hover:border-violet-500/40 transition-all"
                  >
                    {getPaymentSlipUrl()?.toLowerCase().includes('.pdf') ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                    <span className="font-medium">View Payment Slip</span>
                  </button>
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
        document={viewerDocument}
      />
    </Dialog.Root>
  );
}

