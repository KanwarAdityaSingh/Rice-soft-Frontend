import { useLeadAnalytics } from '../../hooks/useLeadAnalytics';
import { Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import { KPICard } from '../../components/crm/analytics/KPICard';
import { LeadStatusChart } from '../../components/crm/analytics/LeadStatusChart';
import { PriorityChart } from '../../components/crm/analytics/PriorityChart';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';

export default function AnalyticsPage() {
  const { analytics, loading } = useLeadAnalytics();

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const stats = analytics.stats;
  const totalLeads = parseInt(stats.total_leads);
  const convertedLeads = parseInt(stats.converted_leads);
  const totalValue = parseFloat(stats.total_estimated_value);
  
  const conversionRate = totalLeads > 0 
    ? ((convertedLeads / totalLeads) * 100).toFixed(1)
    : '0';
  const avgDealSize = convertedLeads > 0
    ? (totalValue / convertedLeads).toFixed(0)
    : '0';

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-muted-foreground">
            Real‑time pipeline health
          </div>
          <h1 className="mt-2 sm:mt-3 text-2xl sm:text-3xl md:text-4xl font-bold"><span className="text-gradient">Analytics Dashboard</span></h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Comprehensive insights into your lead pipeline</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <KPICard
          title="Total Leads"
          value={totalLeads}
          icon={Users}
          subtitle={`${stats.new_leads} new`}
        />
        <KPICard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Target}
          subtitle={`${convertedLeads} conversions`}
        />
        <KPICard
          title="Pipeline Value"
          value={`₹${(totalValue / 100000).toFixed(1)}L`}
          icon={DollarSign}
          subtitle="Total estimated"
        />
        <KPICard
          title="Avg Deal Size"
          value={`₹${avgDealSize}`}
          icon={TrendingUp}
          subtitle="Per conversion"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card-glow p-4 sm:p-6 highlight-box">
          <div className="mb-4 sm:mb-6 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold">Lead Status Distribution</h2>
          </div>
          <LeadStatusChart analytics={analytics} />
        </div>

        <div className="card-glow p-4 sm:p-6 highlight-box">
          <div className="mb-4 sm:mb-6 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold">Priority Distribution</h2>
          </div>
          <PriorityChart analytics={analytics} />
        </div>
      </div>
    </div>
  );
}
