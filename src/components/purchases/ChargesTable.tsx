import { Plus, Trash2 } from 'lucide-react';
import type { CreatePaymentAdviceChargeRequest } from '../../types/entities';

interface ChargesTableProps {
  charges: CreatePaymentAdviceChargeRequest[];
  onChargesChange: (charges: CreatePaymentAdviceChargeRequest[]) => void;
  amount: number;
  errors?: Record<number, Record<string, string>>;
}

export function ChargesTable({
  charges,
  onChargesChange,
  amount,
  errors = {},
}: ChargesTableProps) {
  const addCharge = () => {
    onChargesChange([
      ...charges,
      {
        charge_name: '',
        charge_value: 0,
        charge_type: 'fixed',
      },
    ]);
  };

  const removeCharge = (index: number) => {
    onChargesChange(charges.filter((_, i) => i !== index));
  };

  const updateCharge = (
    index: number,
    field: keyof CreatePaymentAdviceChargeRequest,
    value: any
  ) => {
    const updated = [...charges];
    updated[index] = { ...updated[index], [field]: value };
    onChargesChange(updated);
  };

  const calculateTotalCharges = () => {
    return charges.reduce((sum, charge) => sum + (charge.charge_value || 0), 0);
  };

  const calculateNetPayable = () => {
    return amount - calculateTotalCharges();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Charges</label>
        <button
          type="button"
          onClick={addCharge}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Charge
        </button>
      </div>

      {charges.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
          No charges added. Click "Add Charge" to add one.
        </div>
      ) : (
        <div className="space-y-3">
          {charges.map((charge, index) => (
            <div
              key={index}
              className="border border-border rounded-lg p-4 bg-background/40"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Charge {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeCharge(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Charge Name *</label>
                  <input
                    type="text"
                    value={charge.charge_name}
                    onChange={(e) => updateCharge(index, 'charge_name', e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="CD 2.0%"
                  />
                  {errors[index]?.charge_name && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].charge_name}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Charge Type *</label>
                  <select
                    value={charge.charge_type}
                    onChange={(e) =>
                      updateCharge(index, 'charge_type', e.target.value as 'percentage' | 'fixed')
                    }
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Charge Value *</label>
                  <input
                    type="number"
                    value={charge.charge_value || ''}
                    onChange={(e) =>
                      updateCharge(index, 'charge_value', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    min="0"
                    step="0.01"
                    placeholder={charge.charge_type === 'percentage' ? '2.0' : '0.00'}
                  />
                  {errors[index]?.charge_value && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].charge_value}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {charges.length > 0 && (
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Amount:</span>
            <span className="font-medium">
              ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Charges:</span>
            <span className="font-medium text-red-600">
              - ₹{calculateTotalCharges().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
            <span>Net Payable:</span>
            <span className="text-primary">
              ₹{calculateNetPayable().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

