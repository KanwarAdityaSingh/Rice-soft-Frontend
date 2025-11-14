import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Truck,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { SaudaFormModal } from '../../components/purchases/SaudaFormModal';
import { SaudaStatusBadge } from '../../components/purchases/SaudaStatusBadge';
import { PurchaseFlowDiagram } from '../../components/purchases/PurchaseFlowDiagram';
import { PurchaseWizard } from '../../components/purchases/PurchaseWizard';
import { saudasAPI } from '../../services/saudas.api';
import { inwardSlipPassesAPI } from '../../services/inwardSlipPasses.api';
import { purchasesAPI } from '../../services/purchases.api';
import { paymentAdvicesAPI } from '../../services/paymentAdvices.api';
import { getNextStepForSauda } from '../../utils/purchaseFlow';
import type { Sauda, InwardSlipPass, Purchase, PaymentAdvice } from '../../types/entities';

export default function SaudaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sauda, setSauda] = useState<Sauda | null>(null);
  const [inwardSlipPasses, setInwardSlipPasses] = useState<InwardSlipPass[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [paymentAdvices, setPaymentAdvices] = useState<PaymentAdvice[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [nextStep, setNextStep] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadSauda();
      loadRelatedData();
      // Determine next step
      getNextStepForSauda(id).then((step) => {
        setNextStep(step);
      }).catch(console.error);
    }
  }, [id]);

  const loadSauda = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await saudasAPI.getSaudaById(id);
      setSauda(data);
    } catch (error: any) {
      console.error('Failed to load sauda:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedData = async () => {
    if (!id) return;
    setLoadingRelated(true);
    try {
      // Load all inward slip passes for this sauda
      const slips = await inwardSlipPassesAPI.getAllInwardSlipPasses(id);
      setInwardSlipPasses(slips);

      // Load all purchases for this sauda
      const purchasesData = await purchasesAPI.getAllPurchases({ sauda_id: id });
      setPurchases(purchasesData);

      // Load payment advices for all purchases
      if (purchasesData.length > 0) {
        try {
          const allPaymentAdvices = await paymentAdvicesAPI.getAllPaymentAdvices();
          const relatedPayments = allPaymentAdvices.filter((pa) =>
            purchasesData.some((p: Purchase) => pa.purchase_id === p.id)
          );
          setPaymentAdvices(relatedPayments);
        } catch (error) {
          console.error('Failed to load payment advices:', error);
        }
      }
    } catch (error: any) {
      console.error('Failed to load related data:', error);
    } finally {
      setLoadingRelated(false);
    }
  };


  if (loading) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!sauda) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Sauda not found</p>
          <button onClick={() => navigate('/purchases/saudas')} className="btn-primary mt-4">
            Back to Saudas
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
        <button onClick={() => navigate('/purchases/saudas')} className="hover:text-foreground transition-colors">
          Saudas
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{sauda.rice_quality}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/purchases/saudas')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
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
            Edit Sauda
          </button>
        </div>
      </div>

      {/* Sauda Info */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{sauda.rice_quality}</h1>
            <SaudaStatusBadge status={sauda.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Sauda Type</p>
            <p className="font-medium">{sauda.sauda_type.toUpperCase()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rate</p>
            <p className="font-medium">₹{sauda.rate}/kg</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Quantity</p>
            <p className="font-medium">{sauda.quantity.toLocaleString('en-IN')} kg</p>
          </div>
          {sauda.broker_commission && (
            <div>
              <p className="text-sm text-muted-foreground">Broker Commission</p>
              <p className="font-medium">{sauda.broker_commission}%</p>
            </div>
          )}
          {sauda.transportation_cost && (
            <div>
              <p className="text-sm text-muted-foreground">Transportation Cost</p>
              <p className="font-medium">₹{sauda.transportation_cost.toLocaleString('en-IN')}</p>
            </div>
          )}
          {sauda.cash_discount && (
            <div>
              <p className="text-sm text-muted-foreground">Cash Discount</p>
              <p className="font-medium">₹{sauda.cash_discount.toLocaleString('en-IN')}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Estimated Delivery</p>
            <p className="font-medium">{sauda.estimated_delivery_time} days</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{new Date(sauda.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Purchase Flow Diagram */}
      <PurchaseFlowDiagram
        sauda={sauda}
        inwardSlipPasses={inwardSlipPasses}
        purchases={purchases}
        paymentAdvices={paymentAdvices}
      />

      {/* Inward Slip Passes */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inward Slip Passes</h2>
        </div>
        {loadingRelated ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-muted-foreground">Loading inward slip passes...</span>
          </div>
        ) : inwardSlipPasses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No inward slip passes found</p>
        ) : (
          <div className="space-y-3">
            {inwardSlipPasses.map((isp) => (
              <div
                key={isp.id}
                className="border border-border rounded-lg p-4 hover:bg-background/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/purchases/inward-slips/${isp.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base mb-1">
                      {isp.slip_number} - {isp.party_name}
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
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Lots: </span>
                      <span className="font-medium">{isp.lots.length}</span>
                      <span className="text-muted-foreground ml-4">Total Amount: </span>
                      <span className="font-medium">
                        ₹
                        {isp.lots
                          .reduce((sum, lot) => sum + lot.amount, 0)
                          .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchases */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Purchases</h2>
        </div>
        {loadingRelated ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-muted-foreground">Loading purchases...</span>
          </div>
        ) : purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchases found</p>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="border border-border rounded-lg p-4 hover:bg-background/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/purchases/${purchase.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base mb-1">
                      {purchase.invoice_number || `Purchase #${purchase.id.slice(0, 8)}`}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(purchase.purchase_date).toLocaleDateString()}</span>
                      </div>
                      {purchase.truck_number && (
                        <div className="flex items-center gap-1">
                          <Truck className="h-4 w-4" />
                          <span>{purchase.truck_number}</span>
                        </div>
                      )}
                    </div>
                    {purchase.total_amount && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Total Amount: </span>
                        <span className="font-medium">₹{purchase.total_amount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SaudaFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            loadSauda();
            loadRelatedData();
            if (id) {
              getNextStepForSauda(id).then((step) => {
                setNextStep(step);
              }).catch(console.error);
            }
          }
        }}
        saudaId={id || null}
        preselectedVendorId={null}
      />

      <PurchaseWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open && id) {
            // Reload data when wizard closes
            loadSauda();
            loadRelatedData();
            getNextStepForSauda(id).then((step) => {
              setNextStep(step);
            }).catch(console.error);
          }
        }}
        initialSaudaId={id || null}
      />
    </div>
  );
}

