import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, Truck, Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { PurchaseFlowDiagram } from '../../components/purchases/PurchaseFlowDiagram';
import { PurchaseAmountBreakdown } from '../../components/purchases/PurchaseAmountBreakdown';
import { DocumentUpload } from '../../components/purchases/DocumentUpload';
import { PurchaseFormModal } from '../../components/purchases/PurchaseFormModal';
import { PaymentAdviceFormModal } from '../../components/purchases/PaymentAdviceFormModal';
import { PurchaseWizard } from '../../components/purchases/PurchaseWizard';
import { purchasesAPI } from '../../services/purchases.api';
import { inwardSlipPassesAPI } from '../../services/inwardSlipPasses.api';
import { saudasAPI } from '../../services/saudas.api';
import { usePaymentAdvices } from '../../hooks/usePaymentAdvices';
import { getNextStepForPurchase } from '../../utils/purchaseFlow';
import type { Purchase, InwardSlipPass, Sauda } from '../../types/entities';

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { paymentAdvices, refetch: refetchPayments } = usePaymentAdvices({ purchase_id: id });
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [sauda, setSauda] = useState<Sauda | null>(null);
  const [inwardSlipPasses, setInwardSlipPasses] = useState<InwardSlipPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInwardSlips, setLoadingInwardSlips] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [wizardOpen, setWizardOpen] = useState(false);
  const [nextStep, setNextStep] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPurchase();
      getNextStepForPurchase(id).then((step) => {
        setNextStep(step);
      }).catch(console.error);
    }
  }, [id]);

  const loadPurchase = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await purchasesAPI.getPurchaseById(id);
      setPurchase(data);
      // Load sauda and inward slip passes for the same sauda
      if (data.sauda_id) {
        try {
          const saudaData = await saudasAPI.getSaudaById(data.sauda_id);
          setSauda(saudaData);
        } catch (error) {
          console.error('Failed to load sauda:', error);
        }
        loadInwardSlipPasses(data.sauda_id);
      }
    } catch (error: any) {
      console.error('Failed to load purchase:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInwardSlipPasses = async (saudaId: string) => {
    setLoadingInwardSlips(true);
    try {
      const data = await inwardSlipPassesAPI.getAllInwardSlipPasses(saudaId);
      setInwardSlipPasses(data);
    } catch (error: any) {
      console.error('Failed to load inward slip passes:', error);
    } finally {
      setLoadingInwardSlips(false);
    }
  };

  const handleDocumentUpload = async (type: 'transportation' | 'purchase' | 'bilti' | 'eway', file: File) => {
    if (!id) return;
    setUploading({ ...uploading, [type]: true });
    try {
      switch (type) {
        case 'transportation':
          await purchasesAPI.uploadTransportationBill(id, file);
          break;
        case 'purchase':
          await purchasesAPI.uploadPurchaseBill(id, file);
          break;
        case 'bilti':
          await purchasesAPI.uploadBilti(id, file);
          break;
        case 'eway':
          await purchasesAPI.uploadEwayBill(id, file);
          break;
      }
      await loadPurchase();
    } catch (error: any) {
      console.error('Upload failed:', error);
    } finally {
      setUploading({ ...uploading, [type]: false });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <div className="text-center">
          <p className="text-muted-foreground">Purchase not found</p>
          <button onClick={() => navigate('/purchases')} className="btn-primary mt-4">
            Back to Purchases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate('/purchases')} className="hover:text-foreground transition-colors">
          Purchases
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">
          {purchase.invoice_number || `Purchase #${purchase.id.slice(0, 8)}`}
        </span>
      </nav>

      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchases')} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Purchase {purchase.invoice_number || `#${purchase.id.slice(0, 8)}`}
          </h1>
        </div>
        <div className="flex gap-2">
          {nextStep && (
            <button 
              onClick={() => setWizardOpen(true)} 
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Continue Purchase Flow
            </button>
          )}
        <button onClick={() => setEditModalOpen(true)} className="btn-secondary flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
        </button>
        </div>
      </div>

      {/* Purchase Flow Diagram */}
      <PurchaseFlowDiagram
        sauda={sauda}
        inwardSlipPasses={inwardSlipPasses}
        purchases={purchase ? [purchase] : []}
        paymentAdvices={paymentAdvices}
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Purchase Information */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Purchase Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="font-medium">{purchase.invoice_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Purchase Date</p>
                <p className="font-medium">{new Date(purchase.purchase_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="font-medium">₹{purchase.rate}/kg</p>
              </div>
              {purchase.total_weight && (
                <div>
                  <p className="text-sm text-muted-foreground">Total Weight</p>
                  <p className="font-medium">{purchase.total_weight.toLocaleString('en-IN')} kg</p>
                </div>
              )}
              {purchase.total_amount && (
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium">₹{purchase.total_amount.toLocaleString('en-IN')}</p>
                </div>
              )}
              {purchase.truck_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Truck Number</p>
                  <p className="font-medium">{purchase.truck_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Purchase Amount Breakdown */}
          {sauda && inwardSlipPasses.length > 0 && (
            <PurchaseAmountBreakdown purchase={purchase} sauda={sauda} inwardSlipPasses={inwardSlipPasses} />
          )}

          {/* Documents */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Documents</h2>
            <div className="space-y-4">
              <DocumentUpload
                label="Transportation Bill"
                currentUrl={purchase.transportation_bill_image_url}
                onUpload={(file) => handleDocumentUpload('transportation', file)}
                loading={uploading.transportation}
              />
              <DocumentUpload
                label="Purchase Bill"
                currentUrl={purchase.purchase_bill_image_url}
                onUpload={(file) => handleDocumentUpload('purchase', file)}
                loading={uploading.purchase}
              />
              <DocumentUpload
                label="Bilti"
                currentUrl={purchase.bilti_image_url}
                onUpload={(file) => handleDocumentUpload('bilti', file)}
                loading={uploading.bilti}
              />
              <DocumentUpload
                label="E-way Bill"
                currentUrl={purchase.eway_bill_image_url}
                onUpload={(file) => handleDocumentUpload('eway', file)}
                loading={uploading.eway}
              />
            </div>
          </div>

          {/* Inward Slip Passes */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Inward Slip Passes</h2>
            {loadingInwardSlips ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-sm text-muted-foreground">Loading inward slip passes...</span>
              </div>
            ) : inwardSlipPasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No inward slip passes found for this sauda</p>
            ) : (
              <div className="space-y-4">
                {inwardSlipPasses.map((isp) => (
                  <div
                    key={isp.id}
                    className="border border-border rounded-lg p-4 hover:bg-background/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-base mb-1">
                          Slip #{isp.slip_number} - {isp.party_name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(isp.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Truck className="h-4 w-4" />
                            <span>{isp.vehicle_number}</span>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              isp.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {isp.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lots */}
                    {isp.lots && isp.lots.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/40">
                        <h4 className="text-sm font-medium mb-2">Lots ({isp.lots.length})</h4>
                        <div className="space-y-2">
                          {isp.lots.map((lot, idx) => (
                            <div
                              key={lot.id || idx}
                              className="bg-background/40 rounded-lg p-3 text-sm"
                            >
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                <div>
                                  <p className="text-xs text-muted-foreground">Lot Number</p>
                                  <p className="font-medium">{lot.lot_number}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Item</p>
                                  <p className="font-medium truncate">{lot.item_name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Bags</p>
                                  <p className="font-medium">{lot.no_of_bags}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Total Weight</p>
                                  <p className="font-medium">
                                    {lot.bill_weight.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Received Weight</p>
                                  <p className="font-medium text-primary">
                                    {lot.received_weight.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Rate</p>
                                  <p className="font-medium">₹{lot.rate}/kg</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Amount</p>
                                  <p className="font-medium">
                                    ₹{lot.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                                {lot.bardana && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Bardana</p>
                                    <p className="font-medium">{lot.bardana}</p>
                                  </div>
                                )}
                              </div>
                              {lot.bill_weight && lot.received_weight && lot.bill_weight !== lot.received_weight && (
                                <div className="mt-2 pt-2 border-t border-border/40">
                                  <p className="text-xs text-muted-foreground">
                                    Weight Difference: {(lot.bill_weight - lot.received_weight).toLocaleString('en-IN', {
                                      maximumFractionDigits: 2,
                                    })}{' '}
                                    kg
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/40">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Lots Amount:</span>
                            <span className="font-semibold">
                              ₹
                              {isp.lots
                                .reduce((sum, lot) => sum + lot.amount, 0)
                                .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Advices */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Payment Advices</h2>
              {paymentAdvices.length === 0 && (
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Payment Advice
              </button>
              )}
            </div>
            {paymentAdvices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment advices yet</p>
            ) : (
              <div className="space-y-3">
                {paymentAdvices.map((pa) => (
                  <div
                    key={pa.id}
                    className="border border-border rounded-lg p-4 hover:bg-background/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/purchases/payments/${pa.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pa.sr_number || pa.invoice_number || 'Payment Advice'}</p>
                        <p className="text-sm text-muted-foreground">
                          Amount: ₹{pa.amount.toLocaleString('en-IN')} | Net Payable: ₹
                          {pa.net_payable.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          pa.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : pa.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {pa.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Additional sidebar content can be added here */}
        </div>
      </div>

      <PurchaseFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) loadPurchase();
        }}
        purchaseId={purchase.id}
      />

      <PaymentAdviceFormModal
        open={paymentModalOpen}
        onOpenChange={(open) => {
          setPaymentModalOpen(open);
          if (!open) {
            refetchPayments();
            if (id) {
              getNextStepForPurchase(id).then((step) => {
                setNextStep(step);
              }).catch(console.error);
            }
          }
        }}
        preselectedPurchaseId={purchase.id}
      />

      <PurchaseWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open && id) {
            loadPurchase();
            refetchPayments();
            getNextStepForPurchase(id).then((step) => {
              setNextStep(step);
            }).catch(console.error);
          }
        }}
        initialPurchaseId={id || null}
      />
    </div>
  );
}

