import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Gift, Zap, Layers } from 'lucide-react';
import type { RuleType, RewardType } from '../../../types/coupons';
import { formatRewardSummary } from '../../../utils/couponFormat';
import { RULE_TYPE_META } from '../../../utils/promotionRuleHelpers';

export interface RuleNodeData {
  ruleId: string;
  name: string;
  ruleType: RuleType;
  priority: number;
  isActive: boolean;
  conditionSummary?: string;
  reward: {
    type?: RewardType;
    bonusPaise?: number;
    percent?: number;
    times?: number;
    maxBonusPaise?: number;
  };
  applicationCount?: number;
  onSelect?: (id: string) => void;
}

const TYPE_ICONS = { gift: Gift, zap: Zap, layers: Layers };

const BORDER_COLORS: Record<string, string> = {
  emerald: 'rgba(16, 185, 129, 0.4)',
  violet: 'rgba(124, 58, 237, 0.4)',
  orange: 'rgba(249, 115, 22, 0.4)',
};

const GRADIENTS: Record<string, string> = {
  emerald: 'from-emerald-400 to-teal-500',
  violet: 'from-violet-500 to-purple-600',
  orange: 'from-orange-400 to-rose-500',
};

interface RuleNodeProps {
  data: RuleNodeData;
  selected?: boolean;
}

export const RuleNode = memo(({ data, selected }: RuleNodeProps) => {
  const meta = RULE_TYPE_META[data.ruleType];
  const Icon = TYPE_ICONS[meta.icon as keyof typeof TYPE_ICONS] ?? Gift;

  return (
    <div
      className={`rounded-2xl shadow-lg transition-all w-[260px] cursor-pointer ${
        selected
          ? 'ring-4 ring-violet-400/80 ring-offset-2 shadow-violet-200/60'
          : 'hover:shadow-xl hover:-translate-y-0.5'
      } ${!data.isActive ? 'opacity-55 saturate-50' : ''}`}
      style={{
        background: 'white',
        border: `2px solid ${BORDER_COLORS[meta.color] ?? BORDER_COLORS.violet}`,
        padding: '14px 16px',
      }}
      onClick={() => data.onSelect?.(data.ruleId)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white"
      />

      <div className="flex items-start gap-3">
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${GRADIENTS[meta.color]} text-white shrink-0 shadow-sm`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">
              P{data.priority}
            </span>
            {!data.isActive && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                Off
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm text-violet-950 mt-1 leading-tight">
            {data.name}
          </h3>
          <p className="text-[11px] text-violet-500 mt-0.5 line-clamp-1">
            {data.conditionSummary ?? meta.label}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-violet-100/80">
        <span className="text-sm font-bold text-emerald-600">
          {formatRewardSummary(data.reward)}
        </span>
        {data.applicationCount != null && data.applicationCount > 0 && (
          <span className="text-[10px] font-semibold text-violet-400 bg-violet-50 px-2 py-0.5 rounded-full">
            {data.applicationCount.toLocaleString()}×
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white"
      />
    </div>
  );
});

RuleNode.displayName = 'RuleNode';
