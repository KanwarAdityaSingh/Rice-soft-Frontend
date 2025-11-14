import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Package, Truck, Calendar, Weight, DollarSign, ChevronRight, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { InwardSlipFormModal } from '../../components/purchases/InwardSlipFormModal';
import { PurchaseWizard } from '../../components/purchases/PurchaseWizard';
import { inwardSlipPassesAPI } from '../../services/inwardSlipPasses.api';
import { getNextStepForInwardSlip } from '../../utils/purchaseFlow';
import type { InwardSlipPass } from '../../types/entities';

export default function InwardSlipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inwardSlip, setInwardSlip] = useState<InwardSlipPass | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [nextStep, setNextStep] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadInwardSlip();
      getNextStepForInwardSlip(id).then((step) => {
        setNextStep(step);
      }).catch(console.error);
    }
  }, [id]);

  const loadInwardSlip = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await inwardSlipPassesAPI.getInwardSlipPassById(id);
      setInwardSlip(data);
    } catch (error: any) {
      console.error('Failed to load inward slip pass:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totals = inwardSlip
    ? {
        totalLots: inwardSlip.lots.length,
        totalBags: inwardSlip.lots.reduce((sum, lot) => sum + lot.no_of_bags, 0),
        totalBillWeight: inwardSlip.lots.reduce((sum, lot) => sum + lot.bill_weight, 0),
        totalReceivedWeight: inwardSlip.lots.reduce((sum, lot) => sum + lot.received_weight, 0),
        totalAmount: inwardSlip.lots.reduce((sum, lot) => sum + lot.amount, 0),
        weightDifference: inwardSlip.lots.reduce(
          (sum, lot) => sum + (lot.bill_weight - lot.received_weight),
          0
        ),
      }
    : null;

  if (loading) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!inwardSlip) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Inward slip pass not found</p>
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
      {inwardSlip && (
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate('/purchases')} className="hover:text-foreground transition-colors">
            Purchases
          </button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => navigate('/purchases/inward-slips')} className="hover:text-foreground transition-colors">
            Inward Slips
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{inwardSlip.slip_number}</span>
        </nav>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/purchases/inward-slips')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => setWizardOpen(true)} 
            className="btn-primary flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Continue Purchase Flow
          </button>
          <button onClick={() => setEditModalOpen(true)} className="btn-secondary flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Inward Slip
          </button>
        </div>
      </div>

      {/* Inward Slip Info */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{inwardSlip.slip_number}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                inwardSlip.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {inwardSlip.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">{new Date(inwardSlip.date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vehicle Number</p>
            <p className="font-medium">{inwardSlip.vehicle_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Party Name</p>
            <p className="font-medium">{inwardSlip.party_name}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Party Address</p>
            <p className="font-medium">{inwardSlip.party_address}</p>
          </div>
          {inwardSlip.party_gst_number && (
            <div>
              <p className="text-sm text-muted-foreground">Party GST Number</p>
              <p className="font-medium">{inwardSlip.party_gst_number}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{new Date(inwardSlip.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Lots</p>
                <p className="text-2xl font-bold">{totals.totalLots}</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bags</p>
                <p className="text-2xl font-bold">{totals.totalBags}</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Weight className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received Weight</p>
                <p className="text-2xl font-bold">{totals.totalReceivedWeight.toLocaleString('en-IN')} kg</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">₹{totals.totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weight Comparison */}
      {totals && totals.weightDifference !== 0 && (
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Weight Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Weight</p>
              <p className="text-xl font-bold">{totals.totalBillWeight.toLocaleString('en-IN')} kg</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received Weight</p>
              <p className="text-xl font-bold text-primary">
                {totals.totalReceivedWeight.toLocaleString('en-IN')} kg
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Difference</p>
              <p
                className={`text-xl font-bold ${
                  totals.weightDifference > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {totals.weightDifference > 0 ? '-' : '+'}
                {Math.abs(totals.weightDifference).toLocaleString('en-IN')} kg
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lots */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Lots ({inwardSlip.lots.length})</h2>
        {inwardSlip.lots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lots found</p>
        ) : (
          <div className="space-y-4">
            {inwardSlip.lots.map((lot, idx) => (
              <div key={lot.id || idx} className="border border-border rounded-lg p-4 bg-background/40">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base mb-1">Lot #{lot.lot_number}</h3>
                    <p className="text-sm text-muted-foreground">{lot.item_name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Bags</p>
                    <p className="font-medium">{lot.no_of_bags}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bag Weight</p>
                    <p className="font-medium">{lot.bag_weight} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Weight</p>
                    <p className="font-medium">{lot.bill_weight.toLocaleString('en-IN')} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Received Weight</p>
                    <p className="font-medium text-primary">
                      {lot.received_weight.toLocaleString('en-IN')} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rate</p>
                    <p className="font-medium">₹{lot.rate}/kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-medium">₹{lot.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  </div>
                  {lot.bardana && (
                    <div>
                      <p className="text-xs text-muted-foreground">Bardana</p>
                      <p className="font-medium">{lot.bardana}</p>
                    </div>
                  )}
                </div>

                {lot.bill_weight !== lot.received_weight && (
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <p className="text-xs text-muted-foreground">
                      Weight Difference:{' '}
                      <span
                        className={`font-medium ${
                          lot.bill_weight > lot.received_weight ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {lot.bill_weight > lot.received_weight ? '-' : '+'}
                        {Math.abs(lot.bill_weight - lot.received_weight).toLocaleString('en-IN')} kg
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Total Summary */}
        {totals && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Lots Amount:</span>
              <span className="text-lg font-semibold">
                ₹{totals.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>

      <InwardSlipFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            loadInwardSlip();
            if (id) {
              getNextStepForInwardSlip(id).then((step) => {
                setNextStep(step);
              }).catch(console.error);
            }
          }
        }}
        saudaId={inwardSlip.sauda_id}
        inwardSlipId={id || undefined}
      />

      {inwardSlip && (
        <PurchaseWizard
          open={wizardOpen}
          onOpenChange={(open) => {
            setWizardOpen(open);
            if (!open && id) {
              loadInwardSlip();
              getNextStepForInwardSlip(id).then((step) => {
                setNextStep(step);
              }).catch(console.error);
            }
          }}
          initialInwardSlipId={id || null}
        />
      )}
    </div>
  );
}

