import type { Purchase } from '../../../types/entities';

interface PurchaseCalculationBreakdownProps {
  purchase: Purchase;
  baseAmount?: number;
}

export function PurchaseCalculationBreakdown({ purchase, baseAmount }: PurchaseCalculationBreakdownProps) {
  // Calculate breakdown if baseAmount is provided, otherwise use purchase totals
  const base = baseAmount || purchase.total_amount;
  const cashDiscount = purchase.cash_discount || 0;
  const afterDiscount = base - cashDiscount;
  const brokerCommission = purchase.broker_commission || 0;
  const brokerAmount = afterDiscount * (brokerCommission / 100);
  const afterCommission = afterDiscount + brokerAmount;
  const transportation = purchase.transportation_cost || 0;
  const afterTransportation = afterCommission + transportation;
  const igstAmount = purchase.igst_amount || 0;
  const finalTotal = afterTransportation + igstAmount;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Base Amount:</span>
        <span className="font-medium">₹{base.toFixed(2)}</span>
      </div>
      {cashDiscount > 0 && (
        <>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cash Discount:</span>
            <span className="font-medium text-red-500">-₹{cashDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1">
            <span className="text-muted-foreground">After Discount:</span>
            <span className="font-medium">₹{afterDiscount.toFixed(2)}</span>
          </div>
        </>
      )}
      {brokerCommission > 0 && (
        <>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Broker Commission ({brokerCommission}%):</span>
            <span className="font-medium">+₹{brokerAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1">
            <span className="text-muted-foreground">After Commission:</span>
            <span className="font-medium">₹{afterCommission.toFixed(2)}</span>
          </div>
        </>
      )}
      {transportation > 0 && (
        <>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transportation Cost:</span>
            <span className="font-medium">+₹{transportation.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1">
            <span className="text-muted-foreground">After Transportation:</span>
            <span className="font-medium">₹{afterTransportation.toFixed(2)}</span>
          </div>
        </>
      )}
      {igstAmount > 0 && (
        <>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IGST ({purchase.igst_percentage}%):</span>
            <span className="font-medium">+₹{igstAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-primary pt-2">
            <span className="font-semibold">Final Total:</span>
            <span className="font-bold text-primary">₹{finalTotal.toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  );
}

