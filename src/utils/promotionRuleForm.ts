import type {
  CreatePromotionRuleRequest,
  PromotionRule,
  RuleType,
  RewardType,
} from '../types/coupons';
import { rupeesInputToPaise } from './couponFormat';

export interface RuleFormState {
  name: string;
  description: string;
  ruleType: RuleType;
  minCount: string;
  maxCount: string;
  countIncludesCurrent: boolean;
  batchIds: string[];
  rewardType: RewardType;
  bonusRupees: string;
  percent: string;
  times: string;
  maxBonusRupees: string;
  priority: string;
  isActive: boolean;
}

export const EMPTY_RULE_FORM: RuleFormState = {
  name: '',
  description: '',
  ruleType: 'FIRST_TIME',
  minCount: '5',
  maxCount: '5',
  countIncludesCurrent: true,
  batchIds: [],
  rewardType: 'FIXED',
  bonusRupees: '10',
  percent: '20',
  times: '1.5',
  maxBonusRupees: '20',
  priority: '10',
  isActive: true,
};

export function ruleToForm(rule: PromotionRule): RuleFormState {
  const c = rule.conditions as Record<string, unknown>;
  return {
    name: rule.name,
    description: rule.description ?? '',
    ruleType: rule.rule_type,
    minCount: String(c.minCount ?? 1),
    maxCount: String(c.maxCount ?? ''),
    countIncludesCurrent: Boolean(c.countIncludesCurrent ?? true),
    batchIds: (c.batchIds as string[]) ?? [],
    rewardType: (rule.reward.type as RewardType) ?? 'FIXED',
    bonusRupees: rule.reward.bonusPaise
      ? String(rule.reward.bonusPaise / 100)
      : '10',
    percent: String(rule.reward.percent ?? 20),
    times: String(rule.reward.times ?? 1.5),
    maxBonusRupees: rule.reward.maxBonusPaise
      ? String(rule.reward.maxBonusPaise / 100)
      : '20',
    priority: String(rule.priority),
    isActive: rule.is_active,
  };
}

export function formToCreateRequest(form: RuleFormState): CreatePromotionRuleRequest {
  const buildConditions = (): Record<string, unknown> => {
    if (form.ruleType === 'FIRST_TIME') return {};
    if (form.ruleType === 'REDEMPTION_COUNT') {
      const cond: Record<string, unknown> = {
        minCount: parseInt(form.minCount, 10),
        countIncludesCurrent: form.countIncludesCurrent,
      };
      if (form.maxCount) cond.maxCount = parseInt(form.maxCount, 10);
      return cond;
    }
    return { batchIds: form.batchIds };
  };

  const buildReward = () => {
    switch (form.rewardType) {
      case 'FIXED':
        return { type: 'FIXED' as const, bonusPaise: rupeesInputToPaise(form.bonusRupees) };
      case 'PERCENT':
        return { type: 'PERCENT' as const, percent: parseFloat(form.percent) };
      case 'MULTIPLIER':
        return { type: 'MULTIPLIER' as const, times: parseFloat(form.times) };
      case 'PERCENT_CAPPED':
        return {
          type: 'PERCENT_CAPPED' as const,
          percent: parseFloat(form.percent),
          maxBonusPaise: rupeesInputToPaise(form.maxBonusRupees),
        };
    }
  };

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    rule_type: form.ruleType,
    conditions: buildConditions(),
    reward: buildReward(),
    is_active: form.isActive,
    priority: parseInt(form.priority, 10),
  };
}
