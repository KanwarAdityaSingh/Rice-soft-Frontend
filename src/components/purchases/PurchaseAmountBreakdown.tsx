import { ChevronRight, Minus, Plus } from 'lucide-react';
import type { Purchase, Sauda, InwardSlipPass } from '../../types/entities';

interface PurchaseAmountBreakdownProps {
  purchase: Purchase;
  sauda: Sauda | null;
  inwardSlipPasses: InwardSlipPass[];
}

export function PurchaseAmountBreakdown({
  purchase,
  sauda,
  inwardSlipPasses,
}: PurchaseAmountBreakdownProps) {
  // Calculate base amount from inward slip lots (received_weight × rate)
  const calculateBaseAmount = () => {
    let total = 0;
    inwardSlipPasses.forEach((slip) => {
      slip.lots.forEach((lot) => {
        total += lot.amount; // amount is already calculated as received_weight × rate
      });
    });
    return total;
  };

  const baseAmount = calculateBaseAmount();
  const cashDiscount = sauda?.cash_discount || 0;
  const amountAfterDiscount = baseAmount - cashDiscount;
  const brokerCommissionPercent = sauda?.broker_commission || 0;
  const brokerCommissionAmount = (amountAfterDiscount * brokerCommissionPercent) / 100;
  const amountWithCommission = amountAfterDiscount + brokerCommissionAmount;
  const transportationCost = sauda?.sauda_type === 'xgodown' ? (sauda?.transportation_cost || 0) : 0;
  const amountWithTransportation = amountWithCommission + transportationCost;
  const igstPercent = purchase.igst_percentage || 0;
  const igstAmount = purchase.igst_amount || 0;
  const finalAmount = purchase.total_amount || 0;

  const steps = [
    {
      label: 'Base Amount (from Inward Slip Lots)',
      value: baseAmount,
      type: 'base' as const,
      show: true,
    },
    {
      label: 'Cash Discount',
      value: -cashDiscount,
      type: 'subtract' as const,
      show: cashDiscount > 0,
    },
    {
      label: 'Amount After Discount',
      value: amountAfterDiscount,
      type: 'intermediate' as const,
      show: cashDiscount > 0,
    },
    {
      label: `Broker Commission (${brokerCommissionPercent}%)`,
      value: brokerCommissionAmount,
      type: 'add' as const,
      show: brokerCommissionPercent > 0,
    },
    {
      label: 'Amount With Commission',
      value: amountWithCommission,
      type: 'intermediate' as const,
      show: brokerCommissionPercent > 0,
    },
    {
      label: 'Transportation Cost',
      value: transportationCost,
      type: 'add' as const,
      show: transportationCost > 0,
    },
    {
      label: 'Amount With Transportation',
      value: amountWithTransportation,
      type: 'intermediate' as const,
      show: transportationCost > 0,
    },
    {
      label: `IGST (${igstPercent}%)`,
      value: igstAmount,
      type: 'add' as const,
      show: igstPercent > 0,
    },
    {
      label: 'Final Total Amount',
      value: finalAmount,
      type: 'final' as const,
      show: true,
    },
  ].filter((step) => step.show);

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold">Purchase Amount Breakdown</h2>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isIntermediate = step.type === 'intermediate';
          const isSubtract = step.type === 'subtract';
          const isAdd = step.type === 'add';
          const isFinal = step.type === 'final';

          return (
            <div key={index} className="flex items-center gap-3">
              {!isLast && (
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isFinal
                        ? 'bg-primary text-primary-foreground'
                        : isIntermediate
                        ? 'bg-muted text-muted-foreground'
                        : isSubtract
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : isAdd
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {isSubtract ? (
                      <Minus className="h-4 w-4" />
                    ) : isAdd ? (
                      <Plus className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  {!isLast && <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />}
                </div>
              )}

              <div className="flex-1 flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <span
                  className={`text-sm ${
                    isFinal
                      ? 'font-semibold text-lg'
                      : isIntermediate
                      ? 'text-muted-foreground'
                      : 'font-medium'
                  }`}
                >
                  {step.label}
                </span>
                <span
                  className={`font-medium ${
                    isFinal
                      ? 'text-lg text-primary'
                      : isSubtract
                      ? 'text-red-600 dark:text-red-400'
                      : isAdd
                      ? 'text-green-600 dark:text-green-400'
                      : ''
                  }`}
                >
                  {isSubtract && step.value < 0 ? '' : isAdd || isFinal ? '+' : ''}
                  {formatCurrency(Math.abs(step.value))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

