import { useState } from 'react';
import { RuleStackPreview } from './RuleStackPreview';

interface RuleSimulatorPanelProps {
  batchOptions: { id: string; name: string; face_value_paise: number }[];
}

export function RuleSimulatorPanel({ batchOptions }: RuleSimulatorPanelProps) {
  const [batchId, setBatchId] = useState(batchOptions[0]?.id ?? '');
  const [phone, setPhone] = useState('');
  const [priorCount, setPriorCount] = useState('0');
  const [faceOverride, setFaceOverride] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const batch = batchOptions.find((b) => b.id === batchId);
  const facePaise = faceOverride
    ? Math.round(parseFloat(faceOverride) * 100)
    : batch?.face_value_paise;

  return (
    <div className="space-y-5">
      <div className="coupon-card p-5">
        <h3 className="font-bold text-violet-900">Simulation inputs</h3>
        <p className="text-sm text-violet-500 mt-1 mb-4">
          Model a hypothetical redeem to see which rules in the stack apply and the final payout.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-violet-500">Coupon batch</label>
            <select
              className="coupon-select w-full mt-1"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            >
              {batchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-violet-500">Face value override (₹)</label>
            <input
              className="coupon-input mt-1"
              placeholder={batch ? String(batch.face_value_paise / 100) : '50'}
              value={faceOverride}
              onChange={(e) => setFaceOverride(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-violet-500">Redeemer phone</label>
            <input
              className="coupon-input mt-1"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-[10px] text-violet-400 mt-1">Looks up real redemption history</p>
          </div>
          {!phone && (
            <div>
              <label className="text-xs font-semibold text-violet-500">Prior redeems (simulated)</label>
              <input
                className="coupon-input mt-1"
                type="number"
                min="0"
                value={priorCount}
                onChange={(e) => setPriorCount(e.target.value)}
              />
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 mt-4 text-sm text-violet-600 cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Show inactive rules in skipped list
        </label>
      </div>

      <RuleStackPreview
        batchId={batchId}
        faceValuePaise={facePaise}
        phone={phone || undefined}
        totalRedemptions={phone ? undefined : parseInt(priorCount, 10) || 0}
        includeInactive={includeInactive}
      />
    </div>
  );
}
