import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AnalyticsOverview,
  BatchPerformanceRow,
  RedemptionTrendPoint,
  PayoutSummary,
  FraudSignals,
  PromotionRulePerformanceRow,
} from '../../../types/coupons';
import type { RedeemerLeaderboardEntry } from '../../../types/coupons';
import { formatRupees, formatDate, formatChartBucketDate, FAILURE_REASON_LABELS, ruleTypeLabel } from '../../../utils/couponFormat';
import {
  fillDailyTrendGaps,
  summarizeTrends,
  trendTickInterval,
} from '../../../utils/trendChartData';
import { AnalyticsSectionHeader, ChartTooltipStyle } from './AnalyticsUi';
import { CouponPagination } from '../shared/CouponUi';
import { Medal, ShieldAlert, Trophy } from 'lucide-react';

const PIE_COLORS = ['#f59e0b', '#10b981', '#7c3aed', '#e2e8f0'];

export function CouponLifecycleFunnel({ overview }: { overview: AnalyticsOverview }) {
  const c = overview.coupons;
  const stages = [
    { label: 'Generated', value: c.totalGenerated, pct: 100, color: '#c4b5fd' },
    {
      label: 'Allotted',
      value: c.allotted,
      pct: c.totalGenerated ? (c.allotted / c.totalGenerated) * 100 : 0,
      color: '#8b5cf6',
    },
    {
      label: 'Redeemed',
      value: c.redeemed,
      pct: c.allotted ? (c.redeemed / c.allotted) * 100 : 0,
      color: '#10b981',
    },
    {
      label: 'Expired',
      value: c.expired,
      pct: c.totalGenerated ? (c.expired / c.totalGenerated) * 100 : 0,
      color: '#fbbf24',
    },
  ];

  return (
    <div className="coupon-card p-5 h-full">
      <AnalyticsSectionHeader
        title="Coupon lifecycle"
        subtitle={`All-time · ${c.redemptionRate.toFixed(1)}% redemption rate (redeemed ÷ allotted)`}
      />
      <div className="space-y-3 mt-2">
        {stages.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-violet-800">{s.label}</span>
              <span className="text-violet-600 font-bold">
                {s.value.toLocaleString()}
                <span className="text-violet-400 font-normal text-xs ml-1">
                  ({s.pct.toFixed(0)}%)
                </span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-violet-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, s.pct)}%`,
                  backgroundColor: s.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RedemptionTrendsChart({
  trends,
  granularity,
  fromDate,
  toDate,
}: {
  trends: RedemptionTrendPoint[];
  granularity: string;
  fromDate?: string;
  toDate?: string;
}) {
  const filled = useMemo(
    () => (granularity === 'day' ? fillDailyTrendGaps(trends, fromDate, toDate) : trends),
    [trends, granularity, fromDate, toDate]
  );

  const summary = useMemo(() => summarizeTrends(filled), [filled]);

  const data = useMemo(
    () =>
      filled.map((t) => ({
        date: formatChartBucketDate(t.date, granularity),
        count: t.redemptionCount,
        amount: t.totalAmountPaise / 100,
        hasActivity: t.redemptionCount > 0,
      })),
    [filled, granularity]
  );

  const tickInterval = trendTickInterval(data.length);
  const dense = data.length > 14;
  const barSize = data.length > 45 ? 6 : data.length > 14 ? 14 : data.length > 3 ? 28 : 56;

  if (!trends.length) {
    return (
      <div className="coupon-card p-5 h-[360px] flex items-center justify-center text-violet-400 text-sm">
        No redemption data in this period
      </div>
    );
  }

  return (
    <div className="coupon-card p-5">
      <AnalyticsSectionHeader
        title="Redemption trends"
        subtitle={`Volume and payout value · ${granularity} granularity`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <TrendStat label="Total redemptions" value={summary.totalCount.toLocaleString()} accent="violet" />
        <TrendStat label="Total payout" value={formatRupees(summary.totalPaise)} accent="emerald" />
        <TrendStat
          label="Active periods"
          value={`${summary.activeBuckets} / ${summary.totalBuckets}`}
          accent="sky"
        />
        <TrendStat
          label="Peak period"
          value={
            summary.peak
              ? `${formatChartBucketDate(summary.peak.date, granularity)} · ${summary.peak.redemptionCount.toLocaleString()}`
              : '—'
          }
          accent="amber"
          small
        />
      </div>

      <ResponsiveContainer width="100%" height={dense ? 340 : 300}>
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 12, left: 4, bottom: dense ? 8 : 0 }}
          barCategoryGap={data.length > 30 ? '18%' : '30%'}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: dense ? 9 : 11, fill: '#8b5cf6' }}
            axisLine={false}
            tickLine={false}
            interval={tickInterval}
            angle={dense ? -32 : 0}
            textAnchor={dense ? 'end' : 'middle'}
            height={dense ? 52 : 28}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: '#8b5cf6' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: '#10b981' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
            tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltipStyle
                active={props.active}
                payload={props.payload as { name: string; value: number; color: string }[]}
                label={props.label as string}
                valueFormatter={(v, name) =>
                  name.includes('Payout') ? formatRupees(v * 100) : v.toLocaleString()
                }
              />
            )}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar
            yAxisId="left"
            dataKey="count"
            name="Redemptions"
            radius={[4, 4, 0, 0]}
            maxBarSize={barSize}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.hasActivity ? '#7c3aed' : '#e9e0ff'}
                fillOpacity={entry.hasActivity ? 1 : 0.55}
              />
            ))}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="amount"
            name="Payout (₹)"
            stroke="#10b981"
            strokeWidth={data.length <= 3 ? 0 : 2}
            dot={
              data.length <= 14
                ? { r: data.length <= 3 ? 6 : 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }
                : false
            }
            activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendStat({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent: 'violet' | 'emerald' | 'sky' | 'amber';
  small?: boolean;
}) {
  const colors = {
    violet: 'text-violet-800',
    emerald: 'text-emerald-700',
    sky: 'text-sky-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="rounded-xl bg-violet-50/80 border border-violet-100 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">{label}</p>
      <p
        className={`mt-0.5 font-bold ${colors[accent]} ${small ? 'text-xs leading-snug' : 'text-lg'}`}
      >
        {value}
      </p>
    </div>
  );
}

export function PayoutBreakdownChart({ summary }: { summary: PayoutSummary }) {
  const data = [
    { name: 'Pending', value: summary.pending.amountPaise, count: summary.pending.count },
    { name: 'Paid (manual)', value: summary.paidManual.amountPaise, count: summary.paidManual.count },
    { name: 'Paid (Razorpay)', value: summary.paidRazorpay.amountPaise, count: summary.paidRazorpay.count },
  ].filter((d) => d.value > 0 || d.count > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="coupon-card p-5 h-full flex flex-col">
      <AnalyticsSectionHeader
        title="Payout breakdown"
        subtitle={
          summary.razorpayFailedAttempts > 0
            ? `${summary.razorpayFailedAttempts} Razorpay failures`
            : 'How settlements are distributed'
        }
      />
      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-violet-400 text-sm">
          No payout data yet
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => formatRupees(v)}
              />
            </PieChart>
          </ResponsiveContainer>
          <ul className="space-y-2 mt-2">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-violet-700">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i] }}
                  />
                  {d.name}
                </span>
                <span className="font-semibold text-violet-900">
                  {formatRupees(d.value)}
                  <span className="text-violet-400 font-normal text-xs ml-1">
                    ({d.count})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function BatchPerformanceSection({
  batches,
  page,
  total,
  limit,
  onPageChange,
}: {
  batches: BatchPerformanceRow[];
  page?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
}) {
  const chartData = useMemo(
    () =>
      [...batches]
        .sort((a, b) => b.redemptionRate - a.redemptionRate || b.redeemed - a.redeemed)
        .slice(0, 10)
        .map((b) => ({
          name: b.name.length > 18 ? `${b.name.slice(0, 16)}…` : b.name,
          fullName: b.name,
          rate: b.redemptionRate,
          redeemed: b.redeemed,
        })),
    [batches]
  );

  const chartHeight = Math.max(160, chartData.length * 28);

  return (
    <div className="coupon-card overflow-hidden">
      <div className="p-5 border-b border-violet-100">
        <AnalyticsSectionHeader
          title="Batch performance"
          subtitle={
            total != null && total > batches.length
              ? `Redemption rates and payout exposure · showing page ${page ?? 1}`
              : 'Redemption rates and payout exposure per campaign'
          }
        />
      </div>
      {batches.length === 0 ? (
        <p className="text-center text-violet-400 py-12 text-sm">No batches yet</p>
      ) : (
        <>
          <div className="p-5 border-b border-violet-100">
            {chartData.length > 0 ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400 mb-3">
                  Top on this page
                </p>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      formatter={(v: number) => `${v.toFixed(1)}%`}
                      labelFormatter={(_, payload) =>
                        (payload?.[0]?.payload as { fullName?: string })?.fullName ?? ''
                      }
                    />
                    <Bar dataKey="rate" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Redemption rate" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p className="text-violet-400 text-sm text-center py-8">No chart data</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="coupon-table w-full text-sm">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Allotted</th>
                  <th>Redeemed</th>
                  <th>Rate</th>
                  <th>Pending</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.couponBatchId}>
                    <td className="font-semibold text-violet-800">
                      <Link
                        to={`/coupons/batches/${b.couponBatchId}`}
                        className="hover:text-violet-600 hover:underline"
                        title={b.name}
                      >
                        {b.name}
                      </Link>
                    </td>
                    <td>{b.allotted.toLocaleString()}</td>
                    <td className="text-emerald-600 font-medium">{b.redeemed.toLocaleString()}</td>
                    <td>{b.redemptionRate.toFixed(1)}%</td>
                    <td className="text-amber-600">{formatRupees(b.pendingAmountPaise)}</td>
                    <td>{formatRupees(b.paidAmountPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {page != null && total != null && limit != null && onPageChange && (
            <CouponPagination
              page={page}
              total={total}
              limit={limit}
              onPageChange={onPageChange}
            />
          )}
        </>
      )}
    </div>
  );
}

const MEDAL_COLORS = ['text-amber-500', 'text-slate-400', 'text-orange-600'];

export function RedeemerLeaderboardSection({
  entries,
  sortBy,
  onSortChange,
}: {
  entries: RedeemerLeaderboardEntry[];
  sortBy: 'count' | 'amount';
  onSortChange: (s: 'count' | 'amount') => void;
}) {
  return (
    <div className="coupon-card p-5 h-full">
      <AnalyticsSectionHeader
        title="Top redeemers"
        subtitle="Leaderboard by activity"
        action={
          <div className="flex gap-1 p-0.5 bg-violet-100 rounded-lg">
            {(['count', 'amount'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSortChange(s)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                  sortBy === s ? 'bg-white text-violet-800 shadow-sm' : 'text-violet-500'
                }`}
              >
                {s === 'count' ? 'By count' : 'By earnings'}
              </button>
            ))}
          </div>
        }
      />
      {entries.length === 0 ? (
        <p className="text-violet-400 text-sm text-center py-8">No redeemers yet</p>
      ) : (
        <ul className="space-y-2 mt-2">
          {entries.map((r, i) => (
            <li
              key={r.phone}
              className="flex items-center gap-3 p-3 rounded-xl bg-violet-50/60 hover:bg-violet-50 transition-colors"
            >
              <span className="w-6 text-center shrink-0">
                {i < 3 ? (
                  <Medal className={`h-5 w-5 mx-auto ${MEDAL_COLORS[i]}`} />
                ) : (
                  <span className="text-xs font-bold text-violet-400">{i + 1}</span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/coupons/redeemers?phone=${r.phone}`}
                  className="font-semibold text-violet-800 hover:underline"
                >
                  {r.phone}
                </Link>
                {r.name && <p className="text-xs text-violet-400 truncate">{r.name}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-violet-900">
                  {sortBy === 'count'
                    ? `${r.redemptionCount} redeems`
                    : formatRupees(r.totalEarnedPaise)}
                </p>
                <p className="text-[10px] text-violet-400">
                  {sortBy === 'count'
                    ? formatRupees(r.totalEarnedPaise)
                    : `${r.redemptionCount} redeems`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FraudSignalsSection({ fraud }: { fraud: FraudSignals }) {
  const reasons = Object.entries(fraud.failureReasonBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const maxReason = reasons[0]?.[1] ?? 1;

  return (
    <div className="coupon-card p-5 h-full">
      <AnalyticsSectionHeader
        title="Fraud & abuse signals"
        subtitle={`${fraud.failedAttempts.toLocaleString()} failed attempts in period`}
        action={
          <Link to="/coupons/fraud" className="coupon-btn-secondary text-xs py-1.5 px-3">
            Investigate
          </Link>
        }
      />

      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
        <ShieldAlert className="h-8 w-8 text-amber-500 shrink-0" />
        <div>
          <p className="text-2xl font-bold text-amber-900">
            {fraud.failedAttempts.toLocaleString()}
          </p>
          <p className="text-xs text-amber-700">Blocked redemption attempts</p>
        </div>
      </div>

      <p className="text-xs font-bold uppercase text-violet-500 mb-2">By reason</p>
      <ul className="space-y-2 mb-4">
        {reasons.map(([reason, count]) => (
          <li key={reason}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-violet-700">
                {FAILURE_REASON_LABELS[reason] ?? reason.replace(/_/g, ' ')}
              </span>
              <span className="font-bold text-violet-900">{count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${(count / maxReason) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-violet-50">
          <p className="font-bold text-violet-500 uppercase text-[10px] mb-1">Top failed codes</p>
          {fraud.topFailedCodes.slice(0, 3).map((c) => (
            <p key={c.codePrefix} className="text-violet-800 font-mono">
              {c.codePrefix}… <span className="text-violet-400">{c.attempts}</span>
            </p>
          ))}
        </div>
        <div className="p-3 rounded-lg bg-violet-50">
          <p className="font-bold text-violet-500 uppercase text-[10px] mb-1">High-volume phones</p>
          {fraud.phonesWithHighRedemptions.slice(0, 3).map((p) => (
            <p key={p.phone} className="text-violet-800">
              {p.phone} <span className="text-violet-400">{p.count}×</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RulePerformanceSection({ rules }: { rules: PromotionRulePerformanceRow[] }) {
  const top = [...rules]
    .sort((a, b) => b.totalBonusPaise - a.totalBonusPaise)
    .slice(0, 6);

  const chartData = top.map((r) => ({
    name: r.name.length > 16 ? r.name.slice(0, 14) + '…' : r.name,
    bonus: r.totalBonusPaise / 100,
    fires: r.applicationCount,
  }));

  return (
    <div className="coupon-card overflow-hidden">
      <div className="p-5 border-b border-violet-100 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-violet-500" />
        <AnalyticsSectionHeader
          title="Promotion rule performance"
          subtitle="Bonus engine impact — fires and total bonus paid"
        />
      </div>
      {rules.length === 0 ? (
        <p className="text-center text-violet-400 py-12 text-sm">No rule applications yet</p>
      ) : (
        <div className="grid lg:grid-cols-5 gap-0 lg:divide-x divide-violet-100">
          <div className="lg:col-span-2 p-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v: number) => formatRupees(v * 100)} />
                <Bar dataKey="bonus" fill="#10b981" radius={[4, 4, 0, 0]} name="Bonus paid (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-3 overflow-x-auto">
            <table className="coupon-table w-full text-sm">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Fired</th>
                  <th>Bonus paid</th>
                  <th>Last fired</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.promotionRuleId}>
                    <td className="font-semibold text-violet-800">{r.name}</td>
                    <td className="text-violet-500 text-xs">{ruleTypeLabel(r.ruleType)}</td>
                    <td>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {r.isActive ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td>{r.applicationCount.toLocaleString()}</td>
                    <td className="text-emerald-600 font-semibold">
                      {formatRupees(r.totalBonusPaise)}
                    </td>
                    <td className="text-violet-400 text-xs">
                      {r.lastAppliedAt ? formatDate(r.lastAppliedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function PeriodRedemptionStrip({
  overview,
  periodLabel = 'Selected period',
}: {
  overview: AnalyticsOverview;
  periodLabel?: string;
}) {
  const r = overview.redemptions;
  const bonusPct =
    r.totalAmountPaise > 0
      ? ((r.bonusAmountPaise / r.totalAmountPaise) * 100).toFixed(1)
      : '0';

  return (
    <div className="analytics-period-strip rounded-2xl p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
        {periodLabel} · redemption summary
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-3xl font-bold text-slate-900">{r.totalCount.toLocaleString()}</p>
          <p className="text-sm text-slate-500">Redemptions</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-slate-900">{formatRupees(r.totalAmountPaise)}</p>
          <p className="text-sm text-slate-500">Total paid out</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-emerald-600">
            +{formatRupees(r.bonusAmountPaise)}
          </p>
          <p className="text-sm text-slate-500">Bonus ({bonusPct}% of total)</p>
        </div>
      </div>
    </div>
  );
}
