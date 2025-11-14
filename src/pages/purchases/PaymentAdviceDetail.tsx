import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, Trash2, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { DocumentUpload } from '../../components/purchases/DocumentUpload';
import { PaymentAdviceFormModal } from '../../components/purchases/PaymentAdviceFormModal';
import { ChargeFormModal } from '../../components/purchases/ChargeFormModal';
import { paymentAdvicesAPI } from '../../services/paymentAdvices.api';
import type { PaymentAdvice, CreatePaymentAdviceChargeRequest } from '../../types/entities';

export default function PaymentAdviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paymentAdvice, setPaymentAdvice] = useState<PaymentAdvice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingChargeId, setRemovingChargeId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPaymentAdvice();
    }
  }, [id]);

  const loadPaymentAdvice = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await paymentAdvicesAPI.getPaymentAdviceById(id);
      setPaymentAdvice(data);
    } catch (error: any) {
      console.error('Failed to load payment advice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlipUpload = async (file: File) => {
    if (!id) return;
    setUploading(true);
    try {
      await paymentAdvicesAPI.uploadPaymentSlip(id, file);
      await loadPaymentAdvice();
    } catch (error: any) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleAddCharge = async (charge: CreatePaymentAdviceChargeRequest) => {
    if (!id) return;
    await paymentAdvicesAPI.addCharge(id, charge);
    await loadPaymentAdvice();
  };

  const handleRemoveCharge = async (chargeId: string) => {
    if (!id) return;
    setRemovingChargeId(chargeId);
    try {
      await paymentAdvicesAPI.removeCharge(id, chargeId);
      await loadPaymentAdvice();
    } catch (error: any) {
      console.error('Failed to remove charge:', error);
    } finally {
      setRemovingChargeId(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!paymentAdvice) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <div className="text-center">
          <p className="text-muted-foreground">Payment advice not found</p>
          <button onClick={() => navigate('/purchases/payments')} className="btn-primary mt-4">
            Back to Payment Advices
          </button>
        </div>
      </div>
    );
  }

  const totalCharges = paymentAdvice.charges.reduce((sum, charge) => sum + charge.charge_value, 0);

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate('/purchases')} className="hover:text-foreground transition-colors">
          Purchases
        </button>
        <ChevronRight className="h-4 w-4" />
        <button onClick={() => navigate('/purchases/payments')} className="hover:text-foreground transition-colors">
          Payment Advices
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">
          {paymentAdvice.sr_number || paymentAdvice.invoice_number || `#${paymentAdvice.id.slice(0, 8)}`}
        </span>
      </nav>

      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchases/payments')} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Payment Advice {paymentAdvice.sr_number || paymentAdvice.invoice_number || `#${paymentAdvice.id.slice(0, 8)}`}
          </h1>
        </div>
        <button onClick={() => setEditModalOpen(true)} className="btn-secondary flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Payment Information */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Payment Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">SR Number</p>
                <p className="font-medium">{paymentAdvice.sr_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="font-medium">{paymentAdvice.invoice_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice Date</p>
                <p className="font-medium">
                  {paymentAdvice.invoice_date ? new Date(paymentAdvice.invoice_date).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Payment</p>
                <p className="font-medium">{new Date(paymentAdvice.date_of_payment).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">₹{paymentAdvice.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Payable</p>
                <p className="font-medium text-primary">
                  ₹{paymentAdvice.net_payable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    paymentAdvice.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : paymentAdvice.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {paymentAdvice.status.toUpperCase()}
                </span>
              </div>
              {paymentAdvice.transaction_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-medium">{paymentAdvice.transaction_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Party Information */}
          {(paymentAdvice.party_name || paymentAdvice.party_address || paymentAdvice.broker_name) && (
            <div className="glass rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold">Party Information</h2>
              <div className="grid grid-cols-2 gap-4">
                {paymentAdvice.party_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Party Name</p>
                    <p className="font-medium">{paymentAdvice.party_name}</p>
                  </div>
                )}
                {paymentAdvice.party_address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Party Address</p>
                    <p className="font-medium">{paymentAdvice.party_address}</p>
                  </div>
                )}
                {paymentAdvice.broker_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Broker Name</p>
                    <p className="font-medium">{paymentAdvice.broker_name}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Charges */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Charges</h2>
              <button
                onClick={() => setChargeModalOpen(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Charge
              </button>
            </div>
            {paymentAdvice.charges && paymentAdvice.charges.length > 0 ? (
              <div className="space-y-2">
                {paymentAdvice.charges.map((charge, index) => (
                  <div
                    key={charge.id || index}
                    className="flex items-center justify-between border-b border-border pb-2"
                  >
                    <div>
                      <p className="font-medium">{charge.charge_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {charge.charge_type === 'percentage' ? 'Percentage' : 'Fixed'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium">
                        ₹{charge.charge_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </p>
                      <button
                        onClick={() => handleRemoveCharge(charge.id)}
                        disabled={removingChargeId === charge.id}
                        className="text-red-600 hover:text-red-700 p-1 disabled:opacity-50"
                        title="Remove charge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border font-semibold">
                  <span>Total Charges</span>
                  <span className="text-red-600">
                    - ₹{totalCharges.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                No charges added. Click "Add Charge" to add one.
              </div>
            )}
          </div>

          {/* Payment Slip */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Payment Slip</h2>
            <DocumentUpload
              label="Payment Slip"
              currentUrl={paymentAdvice.payment_slip_image_url}
              onUpload={handleSlipUpload}
              loading={uploading}
            />
          </div>

          {/* Notes */}
          {paymentAdvice.notes && (
            <div className="glass rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold">Notes</h2>
              <p className="text-sm text-muted-foreground">{paymentAdvice.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">₹{paymentAdvice.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              {totalCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Charges</span>
                  <span className="font-medium text-red-600">
                    - ₹{totalCharges.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-3 border-t border-border">
                <span>Net Payable</span>
                <span className="text-primary">
                  ₹{paymentAdvice.net_payable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PaymentAdviceFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) loadPaymentAdvice();
        }}
        paymentAdviceId={paymentAdvice.id}
      />

      <ChargeFormModal
        open={chargeModalOpen}
        onOpenChange={setChargeModalOpen}
        onSubmit={handleAddCharge}
      />
    </div>
  );
}

