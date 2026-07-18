import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Ticket,
  Wallet,
  Users,
  Sparkles,
  ShieldAlert,
  Settings,
  ArrowLeft,
  LogOut,
  Search,
  TrendingUp,
  Trophy,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const OPERATIONS_NAV = [
  { to: '/coupons', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/coupons/batches', label: 'Batches', icon: Layers },
  { to: '/coupons/inventory', label: 'Inventory', icon: Ticket },
  { to: '/coupons/pending-payouts', label: 'Pending Payouts', icon: Wallet },
  { to: '/coupons/redemptions', label: 'Redemptions', icon: Wallet },
  { to: '/coupons/redeemers', label: 'Redeemers', icon: Users },
];

const ANALYTICS_NAV = [
  { to: '/coupons/analytics/trends', label: 'Trends', icon: TrendingUp },
  { to: '/coupons/analytics/batches', label: 'Batch performance', icon: BarChart3 },
  { to: '/coupons/analytics/payouts', label: 'Payouts', icon: Wallet },
  { to: '/coupons/analytics/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/coupons/analytics/rules', label: 'Rule performance', icon: Sparkles },
  { to: '/coupons/fraud', label: 'Fraud signals', icon: ShieldAlert },
];

const CONFIG_NAV = [
  { to: '/coupons/rules', label: 'Promotion Rules', icon: Sparkles },
  { to: '/coupons/settings', label: 'Settings', icon: Settings },
];

function isActive(pathname: string, to: string, end?: boolean): boolean {
  if (end) return pathname === to || pathname === to + '/';
  return pathname === to || pathname.startsWith(to + '/');
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: { to: string; label: string; icon: LucideIcon; end?: boolean }[];
  pathname: string;
}) {
  return (
    <div>
      <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.to, item.end);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'coupon-nav-active font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function CouponLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="coupon-app min-h-screen flex">
      <aside className="coupon-sidebar w-64 shrink-0 flex flex-col border-r border-violet-200/60">
        <div className="p-5 border-b border-violet-200/40">
          <Link to="/coupons" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl coupon-gradient-bg flex items-center justify-center shadow-sm">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-violet-900 text-sm tracking-tight">
                Coupon Studio
              </div>
              <div className="text-[10px] text-violet-500 font-medium uppercase tracking-wider">
                Admin CMS
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          <NavGroup label="Operations" items={OPERATIONS_NAV} pathname={location.pathname} />
          <NavGroup label="Analytics" items={ANALYTICS_NAV} pathname={location.pathname} />
          <NavGroup label="Configuration" items={CONFIG_NAV} pathname={location.pathname} />
        </nav>

        <div className="p-3 border-t border-violet-200/40 space-y-1">
          <Link
            to="/coupons/lookup"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-violet-600 hover:bg-violet-50"
          >
            <Search className="h-4 w-4" />
            Code lookup
          </Link>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-violet-600 hover:bg-violet-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Rice Ops
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
          {user && (
            <div className="px-3 py-2 text-[11px] text-violet-400 truncate">
              {user.full_name || user.username}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
