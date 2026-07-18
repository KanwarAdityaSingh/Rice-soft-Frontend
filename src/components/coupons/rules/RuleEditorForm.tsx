import { Gift, Zap, Layers } from 'lucide-react';
import type { RuleType, RewardType } from '../../../types/coupons';
import {
  RULE_TYPE_META,
  REWARD_TYPE_META,
} from '../../../utils/promotionRuleHelpers';
import type { RuleFormState } from '../../../utils/promotionRuleForm';

const RULE_ICONS = { gift: Gift, zap: Zap, layers: Layers };
const REWARD_TYPES: RewardType[] = [
  'FIXED',
  'PERCENT',
  'MULTIPLIER',
  'PERCENT_CAPPED',
];

interface RuleEditorFormProps {
  form: RuleFormState;
  onChange: (form: RuleFormState) => void;
  batchOptions: { id: string; name: string }[];
  readOnly?: boolean;
  id?: string;
}

export function RuleEditorForm({
  form,
  onChange,
  batchOptions,
  readOnly = false,
  id = 'rule-editor-form',
}: RuleEditorFormProps) {
  const set = <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) =>
    onChange({ ...form, [key]: value });

  const toggleBatch = (batchId: string) => {
    set(
      'batchIds',
      form.batchIds.includes(batchId)
        ? form.batchIds.filter((b) => b !== batchId)
        : [...form.batchIds, batchId]
    );
  };

  const inputCls = readOnly
    ? 'coupon-input bg-violet-50/50 cursor-default'
    : 'coupon-input';

  return (
    <div id={id} className="space-y-8">
      <section className="coupon-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-violet-900">Rule details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-violet-500">Name</label>
            <input
              className={`${inputCls} mt-1`}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              readOnly={readOnly}
              required
              placeholder="e.g. 5th redeem bonus"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-violet-500">Description</label>
            <textarea
              className={`${inputCls} mt-1 min-h-[72px]`}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              readOnly={readOnly}
              placeholder="Optional internal note"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-violet-500">
              Priority (lower = evaluated first)
            </label>
            <input
              className={`${inputCls} mt-1`}
              type="number"
              min="1"
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
              readOnly={readOnly}
            />
          </div>
          <div className="flex items-end">
            <label
              className={`flex items-center gap-2 text-sm font-medium text-violet-800 ${
                readOnly ? 'opacity-80' : 'cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                disabled={readOnly}
                className="rounded border-violet-300 text-violet-600"
              />
              Rule is active
            </label>
          </div>
        </div>
      </section>

      <section className="coupon-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-violet-900">Trigger condition</h3>
        <p className="text-xs text-violet-500 -mt-2">
          When should this rule apply on a redemption?
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {(Object.keys(RULE_TYPE_META) as RuleType[]).map((type) => {
            const meta = RULE_TYPE_META[type];
            const Icon = RULE_ICONS[meta.icon as keyof typeof RULE_ICONS];
            const selected = form.ruleType === type;
            return (
              <button
                key={type}
                type="button"
                disabled={readOnly}
                onClick={() => !readOnly && set('ruleType', type)}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                  selected
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-violet-100 bg-white'
                } ${readOnly ? 'cursor-default' : 'hover:border-violet-200'}`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    selected ? 'coupon-gradient-bg text-white' : 'bg-violet-100 text-violet-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-semibold text-sm text-violet-900">{meta.label}</p>
                <p className="text-[11px] text-violet-500 leading-snug">{meta.description}</p>
              </button>
            );
          })}
        </div>

        {form.ruleType === 'REDEMPTION_COUNT' && (
          <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-violet-600">Min redemption count</label>
              <input
                className={`${inputCls} mt-1`}
                type="number"
                min="1"
                value={form.minCount}
                onChange={(e) => set('minCount', e.target.value)}
                readOnly={readOnly}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-violet-600">
                Max count (optional)
              </label>
              <input
                className={`${inputCls} mt-1`}
                type="number"
                value={form.maxCount}
                onChange={(e) => set('maxCount', e.target.value)}
                readOnly={readOnly}
                placeholder="Leave empty for no max"
              />
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-violet-700">
              <input
                type="checkbox"
                checked={form.countIncludesCurrent}
                onChange={(e) => set('countIncludesCurrent', e.target.checked)}
                disabled={readOnly}
              />
              Include the current redemption in the count
            </label>
          </div>
        )}

        {form.ruleType === 'BATCH' && (
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 max-h-56 overflow-y-auto space-y-2">
            <p className="text-xs font-semibold text-orange-800">Applies to batches</p>
            {batchOptions.length === 0 ? (
              <p className="text-sm text-orange-600">No coupon batches found</p>
            ) : (
              batchOptions.map((b) => (
                <label
                  key={b.id}
                  className={`flex items-center gap-2 text-sm text-violet-900 py-1 ${
                    readOnly ? '' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.batchIds.includes(b.id)}
                    onChange={() => !readOnly && toggleBatch(b.id)}
                    disabled={readOnly}
                  />
                  {b.name}
                </label>
              ))
            )}
          </div>
        )}
      </section>

      <section className="coupon-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-violet-900">Reward</h3>
        <p className="text-xs text-violet-500 -mt-2">
          Bonus stacks with other matching rules — there is no global cap.
        </p>
        <div className="flex flex-wrap gap-2">
          {REWARD_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && set('rewardType', type)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                form.rewardType === type
                  ? 'coupon-gradient-bg text-white shadow-md'
                  : 'bg-violet-100 text-violet-600'
              } ${readOnly ? 'cursor-default' : ''}`}
            >
              {REWARD_TYPE_META[type].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-violet-400">{REWARD_TYPE_META[form.rewardType].description}</p>

        <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
          {form.rewardType === 'FIXED' && (
            <div>
              <label className="text-xs font-semibold text-violet-500">Bonus (₹)</label>
              <input
                className={`${inputCls} mt-1 text-xl font-bold`}
                value={form.bonusRupees}
                onChange={(e) => set('bonusRupees', e.target.value)}
                readOnly={readOnly}
              />
            </div>
          )}
          {(form.rewardType === 'PERCENT' || form.rewardType === 'PERCENT_CAPPED') && (
            <div>
              <label className="text-xs font-semibold text-violet-500">Percent (1–100)</label>
              <input
                className={`${inputCls} mt-1`}
                type="number"
                min="1"
                max="100"
                value={form.percent}
                onChange={(e) => set('percent', e.target.value)}
                readOnly={readOnly}
              />
            </div>
          )}
          {form.rewardType === 'MULTIPLIER' && (
            <div>
              <label className="text-xs font-semibold text-violet-500">Multiplier (≤5×)</label>
              <input
                className={`${inputCls} mt-1`}
                type="number"
                min="1.1"
                max="5"
                step="0.1"
                value={form.times}
                onChange={(e) => set('times', e.target.value)}
                readOnly={readOnly}
              />
            </div>
          )}
          {form.rewardType === 'PERCENT_CAPPED' && (
            <div>
              <label className="text-xs font-semibold text-violet-500">Max bonus cap (₹)</label>
              <input
                className={`${inputCls} mt-1`}
                value={form.maxBonusRupees}
                onChange={(e) => set('maxBonusRupees', e.target.value)}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
