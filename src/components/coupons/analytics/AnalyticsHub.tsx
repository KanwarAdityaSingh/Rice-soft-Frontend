import { Link, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  TrendingUp,
  Layers,
  Wallet,
  Trophy,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

const ANALYTICS_LINKS: { to: string; label: string; desc: string; icon: LucideIcon; color: string }[] = [
  {
    to: '/coupons/analytics/trends',
    label: 'Redemption trends',
    desc: 'Volume & payout over time',
    icon: TrendingUp,
    color: 'from-violet-400 to-violet-500',
  },
  {
    to: '/coupons/analytics/batches',
    label: 'Batch performance',
    desc: 'Per-campaign redemption rates',
    icon: Layers,
    color: 'from-sky-400 to-sky-500',
  },
  {
    to: '/coupons/analytics/payouts',
    label: 'Payout analytics',
    desc: 'Pending, manual & Razorpay split',
    icon: Wallet,
    color: 'from-slate-400 to-slate-500',
  },
  {
    to: '/coupons/analytics/leaderboard',
    label: 'Redeemer leaderboard',
    desc: 'Top customers by activity',
    icon: Trophy,
    color: 'from-amber-400 to-amber-500',
  },
  {
    to: '/coupons/analytics/rules',
    label: 'Rule performance',
    desc: 'Promotion engine bonus impact',
    icon: Sparkles,
    color: 'from-emerald-400 to-emerald-500',
  },
  {
    to: '/coupons/fraud',
    label: 'Fraud signals',
    desc: 'Failed attempts & abuse patterns',
    icon: ShieldAlert,
    color: 'from-rose-400 to-rose-500',
  },
];

export function AnalyticsHubCards() {
  const [searchParams] = useSearchParams();
  const periodQs = searchParams.get('period') ? `?period=${searchParams.get('period')}` : '';

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ANALYTICS_LINKS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={`${item.to}${periodQs}`}
            className="coupon-card p-5 group hover:shadow-lg hover:-translate-y-0.5 transition-all no-underline"
          >
            <div
              className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${item.color} text-white mb-3 shadow-md`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-violet-900 group-hover:text-violet-600">
              {item.label}
            </h3>
            <p className="text-sm text-violet-500 mt-1">{item.desc}</p>
          </Link>
        );
      })}
    </div>
  );
}

interface AnalyticsPageHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
}

export function AnalyticsPageHeader({ title, subtitle, badge }: AnalyticsPageHeaderProps) {
  return (
    <div className="mb-6">
      {badge && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <h1 className="text-2xl md:text-3xl font-bold text-violet-950 mt-2">{title}</h1>
      <p className="text-sm text-violet-500 mt-1">{subtitle}</p>
    </div>
  );
}
