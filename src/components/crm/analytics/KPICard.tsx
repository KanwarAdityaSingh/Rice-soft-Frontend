interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  trend?: string;
  subtitle?: string;
}

export function KPICard({ title, value, icon: Icon, trend, subtitle }: KPICardProps) {
  return (
    <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border/50 hover:scale-105 transition-transform">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/20 flex items-center justify-center">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-green-600">{trend}</span>
        )}
      </div>
      <div>
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold">{value}</p>
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

