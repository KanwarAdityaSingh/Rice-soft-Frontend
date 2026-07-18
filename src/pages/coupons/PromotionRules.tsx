import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, FlaskConical } from 'lucide-react';
import {
  CouponPageHeader,
  CouponLoading,
  CouponEmpty,
} from '../../components/coupons/shared/CouponUi';
import { couponsAPI } from '../../services/coupons.api';
import { couponsAnalyticsAPI } from '../../services/coupons.analytics.api';
import type { PromotionRule } from '../../types/coupons';
import { formatRupees, formatRewardSummary } from '../../utils/couponFormat';
import {
  RULE_TYPE_META,
  formatConditionSummary,
  activeRulesCount,
} from '../../utils/promotionRuleHelpers';

export default function PromotionRulesPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<PromotionRule[]>([]);
  const [performance, setPerformance] = useState<Map<string, number>>(new Map());
  const [bonusPaid, setBonusPaid] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    (async () => {
      try {
        const [rulesRes, perfRes] = await Promise.all([
          couponsAPI.getAllPromotionRules(true),
          couponsAnalyticsAPI.getPromotionRulePerformance(),
        ]);
        setRules(Array.isArray(rulesRes) ? rulesRes : []);
        const perfMap = new Map<string, number>();
        const bonusMap = new Map<string, number>();
        (perfRes.rules ?? []).forEach((r) => {
          perfMap.set(r.promotionRuleId, r.applicationCount);
          bonusMap.set(r.promotionRuleId, r.totalBonusPaise);
        });
        setPerformance(perfMap);
        setBonusPaid(bonusMap);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = [...rules].sort((a, b) => a.priority - b.priority);
    if (filter === 'active') list = list.filter((r) => r.is_active);
    if (filter === 'inactive') list = list.filter((r) => !r.is_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.rule_type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rules, filter, search]);

  if (loading) return <CouponLoading />;

  return (
    <div className="coupon-page">
      <CouponPageHeader
        title="Promotion Rules"
        subtitle="Each rule adds a bonus when its condition matches — all matches stack on payout"
        badge="Rule engine"
        actions={
          <div className="flex gap-2">
            <Link to="/coupons/rules/simulator" className="coupon-btn-secondary flex items-center gap-2 text-sm">
              <FlaskConical className="h-4 w-4" />
              Simulator
            </Link>
            <button
              type="button"
              className="coupon-btn-primary flex items-center gap-2"
              onClick={() => navigate('/coupons/rules/new')}
            >
              <Plus className="h-4 w-4" /> New rule
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total rules', value: rules.length },
          { label: 'Active', value: activeRulesCount(rules) },
          {
            label: 'Total fired',
            value: [...performance.values()].reduce((a, b) => a + b, 0).toLocaleString(),
          },
          {
            label: 'Bonus paid',
            value: formatRupees([...bonusPaid.values()].reduce((a, b) => a + b, 0)),
          },
        ].map((s) => (
          <div key={s.label} className="coupon-card px-4 py-3">
            <p className="text-xl font-bold text-violet-950">{s.value}</p>
            <p className="text-[10px] uppercase font-semibold text-violet-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
          <input
            className="coupon-input pl-9"
            placeholder="Search by name or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 p-1 bg-violet-50 rounded-lg">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${
                filter === f ? 'bg-white text-violet-800 shadow-sm' : 'text-violet-500'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="coupon-card overflow-hidden">
        {filtered.length === 0 ? (
          <CouponEmpty
            message={
              filter === 'active'
                ? 'No active rules — turn a rule on or create a new one'
                : filter === 'inactive'
                  ? 'No inactive rules'
                  : 'No rules match your search'
            }
          />
        ) : (
          <table className="coupon-table w-full">
            <thead>
              <tr>
                <th className="w-16">Pri</th>
                <th>Rule</th>
                <th className="hidden md:table-cell">Condition</th>
                <th>Reward</th>
                <th className="hidden sm:table-cell">Fired</th>
                <th>Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((rule) => {
                const meta = RULE_TYPE_META[rule.rule_type];
                const fired = performance.get(rule.promotion_rule_id);
                return (
                  <tr
                    key={rule.promotion_rule_id}
                    className="cursor-pointer group"
                    onClick={() => navigate(`/coupons/rules/${rule.promotion_rule_id}`)}
                  >
                    <td className="font-mono text-violet-500 font-bold">{rule.priority}</td>
                    <td>
                      <p className="font-semibold text-violet-900 group-hover:text-violet-600">
                        {rule.name}
                      </p>
                      <p className="text-xs text-violet-400">{meta.label}</p>
                    </td>
                    <td className="hidden md:table-cell text-sm text-violet-500 max-w-[200px] truncate">
                      {formatConditionSummary(rule)}
                    </td>
                    <td className="text-emerald-600 font-semibold text-sm whitespace-nowrap">
                      {formatRewardSummary(rule.reward)}
                    </td>
                    <td className="hidden sm:table-cell text-violet-500 text-sm">
                      {fired != null ? fired.toLocaleString() : '—'}
                    </td>
                    <td>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rule.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {rule.is_active ? 'Active' : 'Off'}
                      </span>
                    </td>
                    <td>
                      <ChevronRight className="h-4 w-4 text-violet-300 group-hover:text-violet-500" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-violet-400 mt-4 text-center">
        Click any rule to open the editor — view details, make changes, or run a payout simulation.
      </p>
    </div>
  );
}
