import type { PromotionRule, RuleType, RewardType } from '../types/coupons';
import { formatRupees, ruleTypeLabel } from './couponFormat';

export const RULE_TYPE_META: Record<
  RuleType,
  { label: string; description: string; color: string; icon: string }
> = {
  FIRST_TIME: {
    label: 'First-time bonus',
    description: 'Applies on a redeemer’s very first coupon redemption',
    color: 'emerald',
    icon: 'gift',
  },
  REDEMPTION_COUNT: {
    label: 'Milestone redeem',
    description: 'Triggers when redeemer hits a specific redemption count',
    color: 'violet',
    icon: 'zap',
  },
  BATCH: {
    label: 'Batch promo',
    description: 'Only applies to coupons from selected batches',
    color: 'orange',
    icon: 'layers',
  },
};

export const REWARD_TYPE_META: Record<
  RewardType,
  { label: string; description: string }
> = {
  FIXED: { label: 'Fixed bonus', description: 'Flat ₹ amount on top of face value' },
  PERCENT: { label: 'Percentage', description: '% of coupon face value' },
  MULTIPLIER: { label: 'Multiplier', description: 'Multiply total payout (e.g. 1.5×)' },
  PERCENT_CAPPED: {
    label: 'Percent capped',
    description: '% bonus with a maximum cap',
  },
};

export function formatConditionSummary(
  rule: Pick<PromotionRule, 'rule_type' | 'conditions'>,
  batchNames?: Map<string, string>
): string {
  const c = rule.conditions as Record<string, unknown>;
  switch (rule.rule_type) {
    case 'FIRST_TIME':
      return 'First redemption ever for this phone';
    case 'REDEMPTION_COUNT': {
      const min = c.minCount as number | undefined;
      const max = c.maxCount as number | undefined;
      if (min != null && max != null && min === max) {
        return `Exactly the ${ordinal(min)} redemption`;
      }
      if (min != null && max != null) {
        return `Between ${min}–${max} redemptions`;
      }
      if (min != null) return `${min}+ redemptions`;
      return 'Redemption count milestone';
    }
    case 'BATCH': {
      const ids = (c.batchIds as string[]) ?? [];
      if (ids.length === 0) return 'Specific batches (none selected)';
      const names = ids.map((id) => batchNames?.get(id) ?? id.slice(0, 8));
      return names.length <= 2
        ? `Batches: ${names.join(', ')}`
        : `${names.length} batches (${names.slice(0, 2).join(', ')}…)`;
    }
    default:
      return ruleTypeLabel(rule.rule_type);
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function activeRulesCount(rules: PromotionRule[]): number {
  return rules.filter((r) => r.is_active).length;
}
