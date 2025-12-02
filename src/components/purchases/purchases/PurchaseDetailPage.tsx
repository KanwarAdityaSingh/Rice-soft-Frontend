import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { purchasesAPI } from '../../../services/purchases.api';
import { AlertDialog } from '../../shared/AlertDialog';
import type { Purchase, LinkedEntitiesResponse } from '../../../types/entities';

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (id) {
      loadPurchaseData();
    }
  }, [id]);

  const loadPurchaseData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [purchaseData, linkedData] = await Promise.all([
        purchasesAPI.getPurchaseById(id),
        purchasesAPI.getLinkedEntities(id),
      ]);
      setPurchase(purchaseData);
      setLinkedEntities(linkedData);
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage(error.message || 'Failed to load purchase data');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!id) return;
    try {
      const updated = await purchasesAPI.recalculateTotals(id);
      setPurchase(updated);
      setAlertType('success');
      setAlertMessage('Totals recalculated successfully');
      setAlertOpen(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage(error.message || 'Failed to recalculate totals');
      setAlertOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Purchase not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Details</h1>
          <p className="text-muted-foreground">{purchase.invoice_number || purchase.id}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRecalculate}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Recalculate Totals
          </button>
          <button
            onClick={() => navigate('/purchases')}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
          >
            Back to Purchases
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Purchase Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Number:</span>
              <span className="font-medium">{purchase.invoice_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purchase Date:</span>
              <span className="font-medium">{new Date(purchase.purchase_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Weight:</span>
              <span className="font-medium">{(purchase.total_weight ?? 0).toFixed(2)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">₹{(purchase.total_amount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IGST ({purchase.igst_percentage ?? 0}%):</span>
              <span className="font-medium">₹{(purchase.igst_amount ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Linked Entities</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saudas:</span>
              <span className="font-medium">{linkedEntities?.sauda_ids.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inward Slip Passes:</span>
              <span className="font-medium">{linkedEntities?.inward_slip_pass_ids.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lots:</span>
              <span className="font-medium">{linkedEntities?.lot_ids.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertType === 'success' ? 'Success' : 'Error'}
        message={alertMessage}
      />
    </div>
  );
}

