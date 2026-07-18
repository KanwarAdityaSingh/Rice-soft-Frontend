import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  Pencil,
  FlaskConical,
  Save,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  CouponLoading,
  CouponConfirmDialog,
} from '../../components/coupons/shared/CouponUi';
import { AnalyticsDateFilter, useAnalyticsPreset } from '../../components/coupons/analytics/AnalyticsDateFilter';
import { RuleEditorForm } from '../../components/coupons/rules/RuleEditorForm';
import { RuleSimulatorPanel } from '../../components/coupons/rules/RuleSimulatorPanel';
import { couponsAPI } from '../../services/coupons.api';
import { couponsAnalyticsAPI } from '../../services/coupons.analytics.api';
import type { PromotionRule, CouponBatch } from '../../types/coupons';
import {
  formatRupees,
  formatRewardSummary,
  formatDateTime,
  ruleTypeLabel,
  rewardTypeLabel,
} from '../../utils/couponFormat';
import {
  formatConditionSummary,
  RULE_TYPE_META,
} from '../../utils/promotionRuleHelpers';
import {
  EMPTY_RULE_FORM,
  ruleToForm,
  formToCreateRequest,
  type RuleFormState,
} from '../../utils/promotionRuleForm';

type EditorTab = 'view' | 'edit' | 'simulate';

export default function PromotionRuleEditorPage() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { preset, range, setPreset, rangeLabel } = useAnalyticsPreset();
  const navigate = useNavigate();
  const isSimulator = ruleId === 'simulator';
  const isNew = ruleId === 'new';

  const initialTab = (searchParams.get('tab') as EditorTab) || (isNew ? 'edit' : isSimulator ? 'simulate' : 'view');
  const [tab, setTab] = useState<EditorTab>(initialTab);
  const [rule, setRule] = useState<PromotionRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_RULE_FORM);
  const [batches, setBatches] = useState<CouponBatch[]>([]);
  const [stats, setStats] = useState<{
    applicationCount: number;
    totalBonusPaise: number;
    averageBonusPaise: number;
    lastAppliedAt?: string;
  } | null>(null);
  const [recent, setRecent] = useState<
    {
      publicRef: string;
      redemptionId: string;
      bonusPaise: number;
      appliedAt: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(!isNew && !isSimulator);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const batchOptions = useMemo(
    () =>
      batches.map((b) => ({
        id: b.coupon_batch_id,
        name: b.name,
        face_value_paise: b.face_value_paise,
      })),
    [batches]
  );

  const batchNames = useMemo(
    () => new Map(batches.map((b) => [b.coupon_batch_id, b.name])),
    [batches]
  );

  useEffect(() => {
    couponsAPI.getAllCouponBatches(1, 100).then((r) => setBatches(r.rows));
  }, []);

  useEffect(() => {
    if (isNew || isSimulator) return;
    setLoading(true);
    Promise.all([
      couponsAPI.getPromotionRuleById(ruleId!),
      couponsAPI.getPromotionRuleStats(ruleId!, {
        recentLimit: 8,
        fromDate: range.fromDate,
        toDate: range.toDate,
      }),
    ])
      .then(([r, s]) => {
        setRule(r);
        setForm(ruleToForm(r));
        setStats(s.stats);
        setRecent(s.recentApplications ?? []);
      })
      .catch(() => setError('Rule not found'))
      .finally(() => setLoading(false));
  }, [ruleId, isNew, isSimulator, range.fromDate, range.toDate, preset]);

  const switchTab = (t: EditorTab) => {
    setTab(t);
    const next = new URLSearchParams(searchParams);
    if (t === 'view') next.delete('tab');
    else next.set('tab', t);
    setSearchParams(next, { replace: true });
  };

  const handleFormChange = (next: RuleFormState) => {
    setForm(next);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = formToCreateRequest(form);
      if (isNew) {
        const created = await couponsAPI.createPromotionRule(payload);
        navigate(`/coupons/rules/${created.promotion_rule_id}?tab=view`, { replace: true });
      } else {
        await couponsAPI.updatePromotionRule(ruleId!, payload);
        const updated = await couponsAPI.getPromotionRuleById(ruleId!);
        setRule(updated);
        setForm(ruleToForm(updated));
        setDirty(false);
        switchTab('view');
        const s = await couponsAPI.getPromotionRuleStats(ruleId!, {
          recentLimit: 8,
          fromDate: range.fromDate,
          toDate: range.toDate,
        });
        setStats(s.stats);
        setRecent(s.recentApplications ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ruleId || isNew) return;
    await couponsAPI.deletePromotionRule(ruleId);
    navigate('/coupons/rules');
  };

  const handleToggle = async () => {
    if (!rule) return;
    await couponsAPI.togglePromotionRule(rule.promotion_rule_id, !rule.is_active);
    const updated = await couponsAPI.getPromotionRuleById(rule.promotion_rule_id);
    setRule(updated);
    setForm(ruleToForm(updated));
  };

  if (loading) return <CouponLoading />;

  const tabs: { id: EditorTab; label: string; icon: typeof Eye }[] = [
    { id: 'view', label: 'View', icon: Eye },
    { id: 'edit', label: 'Edit', icon: Pencil },
    { id: 'simulate', label: 'Simulate', icon: FlaskConical },
  ];

  const canDelete = !isNew && !isSimulator && (stats?.applicationCount ?? 0) === 0;

  if (isSimulator) {
    return (
      <div className="coupon-page max-w-5xl">
        <Link
          to="/coupons/rules"
          className="inline-flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          All promotion rules
        </Link>
        <h1 className="text-2xl font-bold text-violet-950 mb-1">Payout simulator</h1>
        <p className="text-sm text-violet-500 mb-6">
          Test the full rule stack for any hypothetical redeem.
        </p>
        <RuleSimulatorPanel batchOptions={batchOptions} />
      </div>
    );
  }

  return (
    <div className="coupon-page max-w-5xl">
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <Link
          to="/coupons/rules"
          className="inline-flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          All promotion rules
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {!isNew && rule && (
                <>
                  <span className="text-xs font-bold bg-violet-100 text-violet-600 px-2.5 py-1 rounded-full">
                    Priority {rule.priority}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      rule.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </>
              )}
              {isNew && (
                <span className="text-xs font-bold bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full">
                  New rule
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-violet-950">
              {isNew ? 'Create promotion rule' : rule?.name}
            </h1>
            {!isNew && rule && (
              <p className="text-sm text-violet-500 mt-1">
                {RULE_TYPE_META[rule.rule_type].label} ·{' '}
                {formatRewardSummary(rule.reward)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!isNew && rule && tab !== 'edit' && (
              <button type="button" className="coupon-btn-secondary text-sm" onClick={handleToggle}>
                {rule.is_active ? 'Deactivate' : 'Activate'}
              </button>
            )}
            {tab === 'edit' && (
              <button
                type="button"
                className="coupon-btn-primary text-sm flex items-center gap-2"
                disabled={saving || (!dirty && !isNew)}
                onClick={handleSave}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : isNew ? 'Create rule' : 'Save changes'}
              </button>
            )}
            {!isNew && canDelete && (
              <button
                type="button"
                className="coupon-btn-danger text-sm flex items-center gap-1"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-violet-100/70 rounded-xl mb-6 w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          const disabled = isNew && t.id === 'view';
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-white text-violet-800 shadow-sm'
                  : disabled
                    ? 'text-violet-300 cursor-not-allowed'
                    : 'text-violet-500 hover:text-violet-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* View tab */}
      {tab === 'view' && rule && (
        <div className="space-y-6">
          <AnalyticsDateFilter
            preset={preset}
            onPresetChange={setPreset}
            rangeLabel={rangeLabel}
            hint="Stats and recent applications are filtered by period. Rule configuration is unchanged."
          />
          <div className="grid sm:grid-cols-3 gap-4">
            <StatBox label="Times fired" value={stats?.applicationCount?.toLocaleString() ?? '0'} />
            <StatBox
              label="Total bonus paid"
              value={formatRupees(stats?.totalBonusPaise ?? 0)}
              accent="emerald"
            />
            <StatBox
              label="Avg bonus"
              value={
                stats && stats.applicationCount > 0
                  ? formatRupees(stats.averageBonusPaise)
                  : '—'
              }
              accent="sky"
            />
          </div>
          {stats?.lastAppliedAt && (
            <p className="text-xs text-violet-500">
              Last fired {formatDateTime(stats.lastAppliedAt)}
            </p>
          )}

          <div className="coupon-card p-6 space-y-5">
            <h2 className="font-bold text-violet-900">Rule configuration</h2>
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <Field label="Name" value={rule.name} />
              <Field label="Priority" value={String(rule.priority)} />
              <Field label="Status" value={rule.is_active ? 'Active' : 'Inactive'} />
              <Field label="Rule type" value={ruleTypeLabel(rule.rule_type)} />
              <Field
                label="Condition"
                value={formatConditionSummary(rule, batchNames)}
                className="sm:col-span-2"
              />
              <Field label="Reward" value={formatRewardSummary(rule.reward)} accent />
              <Field
                label="Reward type"
                value={rewardTypeLabel((rule.reward.type as 'FIXED') ?? 'FIXED')}
              />
              {rule.description && (
                <Field label="Description" value={rule.description} className="sm:col-span-2" />
              )}
            </dl>
            <button
              type="button"
              className="coupon-btn-primary text-sm"
              onClick={() => switchTab('edit')}
            >
              Edit this rule
            </button>
          </div>

          {recent.length > 0 && (
            <div className="coupon-card overflow-hidden">
              <div className="px-5 py-3 border-b border-violet-100 font-bold text-violet-800 text-sm">
                Recent applications
              </div>
              <table className="coupon-table w-full">
                <thead>
                  <tr>
                    <th>Redemption</th>
                    <th>Bonus</th>
                    <th>Applied at</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((a) => (
                    <tr key={a.publicRef}>
                      <td>
                        <Link
                          to={`/coupons/redemptions/${a.redemptionId}`}
                          className="text-violet-700 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          {a.publicRef}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                      <td className="text-emerald-600 font-semibold">
                        +{formatRupees(a.bonusPaise)}
                      </td>
                      <td className="text-violet-400 text-xs">{formatDateTime(a.appliedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              className="coupon-btn-secondary text-sm"
              onClick={() => switchTab('simulate')}
            >
              Run payout simulation →
            </button>
          </div>
        </div>
      )}

      {/* Edit tab */}
      {tab === 'edit' && (
        <div>
          <RuleEditorForm
            form={form}
            onChange={handleFormChange}
            batchOptions={batchOptions}
          />
          <div className="sticky bottom-0 mt-6 py-4 bg-gradient-to-t from-[#faf5ff] via-[#faf5ff] to-transparent flex gap-3 justify-end">
            {!isNew && (
              <button
                type="button"
                className="coupon-btn-secondary"
                onClick={() => {
                  if (rule) setForm(ruleToForm(rule));
                  setDirty(false);
                  switchTab('view');
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className="coupon-btn-primary flex items-center gap-2"
              disabled={saving}
              onClick={handleSave}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : isNew ? 'Create rule' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {/* Simulate tab */}
      {tab === 'simulate' && (
        <RuleSimulatorPanel batchOptions={batchOptions} />
      )}

      <CouponConfirmDialog
        open={deleteOpen}
        title="Delete rule"
        message={`Permanently delete "${rule?.name}"? Only possible if never applied.`}
        destructive
        confirmLabel="Delete"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'emerald' | 'sky';
}) {
  const bg =
    accent === 'emerald'
      ? 'bg-emerald-50 border-emerald-100'
      : accent === 'sky'
        ? 'bg-sky-50 border-sky-100'
        : 'bg-white border-violet-100';
  return (
    <div className={`coupon-card px-4 py-4 text-center border ${bg}`}>
      <p className="text-2xl font-bold text-violet-950">{value}</p>
      <p className="text-[10px] uppercase font-semibold text-violet-400 tracking-wide mt-1">
        {label}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  accent,
  className = '',
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold text-violet-400 uppercase tracking-wide">{label}</dt>
      <dd className={`mt-1 font-medium ${accent ? 'text-emerald-600 text-lg' : 'text-violet-900'}`}>
        {value}
      </dd>
    </div>
  );
}
