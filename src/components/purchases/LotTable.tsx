import { Plus, Trash2 } from 'lucide-react';
import type { CreateInwardSlipLotRequest } from '../../types/entities';

interface LotTableProps {
  lots: (CreateInwardSlipLotRequest & { id?: string })[];
  onLotsChange: (lots: (CreateInwardSlipLotRequest & { id?: string })[]) => void;
  errors?: Record<number, Record<string, string>>;
  defaultRate?: number | null;
}

export function LotTable({ lots, onLotsChange, errors = {}, defaultRate }: LotTableProps) {
  const addLot = () => {
    onLotsChange([
      ...lots,
      {
        lot_number: '',
        item_name: '',
        no_of_bags: 0,
        bag_weight: 0,
        bill_weight: 0, // Will be auto-calculated when bags/weight are entered
        received_weight: 0,
        bardana: '',
        rate: defaultRate || 0,
      },
    ]);
  };

  const removeLot = (index: number) => {
    onLotsChange(lots.filter((_, i) => i !== index));
  };

  const updateLot = (index: number, field: keyof CreateInwardSlipLotRequest, value: any) => {
    const updated = [...lots];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate bill_weight (total weight) when no_of_bags or bag_weight changes
    if (field === 'no_of_bags' || field === 'bag_weight') {
      const noOfBags = field === 'no_of_bags' ? value : updated[index].no_of_bags;
      const bagWeight = field === 'bag_weight' ? value : updated[index].bag_weight;
      updated[index].bill_weight = calculateTotalWeight(noOfBags || 0, bagWeight || 0);
    }
    
    onLotsChange(updated);
  };

  const calculateTotalWeight = (noOfBags: number, bagWeight: number) => {
    return noOfBags * bagWeight;
  };

  const calculateAmount = (receivedWeight: number, rate: number) => {
    return receivedWeight * rate;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Lots</label>
        <button
          type="button"
          onClick={addLot}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Lot
        </button>
      </div>

      {lots.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
          No lots added. Click "Add Lot" to add one.
        </div>
      ) : (
        <div className="space-y-4">
          {lots.map((lot, index) => (
            <div
              key={index}
              className="border border-border rounded-lg p-4 space-y-3 bg-background/40"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Lot {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeLot(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Lot Number *</label>
                  <input
                    type="text"
                    value={lot.lot_number}
                    onChange={(e) => updateLot(index, 'lot_number', e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="P3236"
                  />
                  {errors[index]?.lot_number && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].lot_number}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Item Name *</label>
                  <input
                    type="text"
                    value={lot.item_name}
                    onChange={(e) => updateLot(index, 'item_name', e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="CHAPI WAND RAW PARMAL"
                  />
                  {errors[index]?.item_name && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].item_name}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">No. of Bags *</label>
                  <input
                    type="number"
                    value={lot.no_of_bags || ''}
                    onChange={(e) => updateLot(index, 'no_of_bags', parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    min="0"
                  />
                  {errors[index]?.no_of_bags && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].no_of_bags}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Bag Weight (kg) *</label>
                  <input
                    type="number"
                    value={lot.bag_weight || ''}
                    onChange={(e) => updateLot(index, 'bag_weight', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    min="0"
                    step="0.01"
                  />
                  {errors[index]?.bag_weight && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].bag_weight}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Total Weight (kg) *</label>
                  <input
                    type="number"
                    value={lot.bill_weight || calculateTotalWeight(lot.no_of_bags || 0, lot.bag_weight || 0) || ''}
                    onChange={(e) => updateLot(index, 'bill_weight', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    min="0"
                    step="0.01"
                  />
                  {errors[index]?.bill_weight && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].bill_weight}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Received Weight (kg) *</label>
                  <input
                    type="number"
                    value={lot.received_weight || ''}
                    onChange={(e) => updateLot(index, 'received_weight', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    min="0"
                    step="0.01"
                  />
                  {errors[index]?.received_weight && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].received_weight}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Bardana *</label>
                  <input
                    type="text"
                    value={lot.bardana}
                    onChange={(e) => updateLot(index, 'bardana', e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="BOPP"
                  />
                  {errors[index]?.bardana && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].bardana}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Rate (₹/kg) *</label>
                  <input
                    type="number"
                    value={lot.rate > 0 ? lot.rate : (defaultRate || '')}
                    onChange={(e) => {
                      const newRate = parseFloat(e.target.value) || 0;
                      updateLot(index, 'rate', newRate);
                    }}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    min="0"
                    step="0.01"
                    placeholder={defaultRate ? defaultRate.toString() : '0.00'}
                  />
                  {errors[index]?.rate && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].rate}</p>
                  )}
                </div>
              </div>

              {/* Calculated values */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                <div className="bg-primary/10 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Total Weight</p>
                  <p className="text-sm font-semibold">
                    {calculateTotalWeight(lot.no_of_bags, lot.bag_weight).toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    kg
                  </p>
                </div>
                <div className="bg-primary/10 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-sm font-semibold">
                    ₹
                    {calculateAmount(lot.received_weight, lot.rate || defaultRate || 0).toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

