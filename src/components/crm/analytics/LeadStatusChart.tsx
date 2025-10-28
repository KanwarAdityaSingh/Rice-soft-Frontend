import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { LeadAnalytics } from '../../../types/entities';

interface LeadStatusChartProps {
  analytics: LeadAnalytics;
}

const COLORS = {
  new: 'hsl(var(--primary))',
  contacted: '#f59e0b',
  engaged: '#8b5cf6',
  converted: '#10b981',
  rejected: '#ef4444',
};

export function LeadStatusChart({ analytics }: LeadStatusChartProps) {
  const statusData = [
    { name: 'New', value: parseInt(analytics.stats.new_leads), color: COLORS.new },
    { name: 'Contacted', value: parseInt(analytics.stats.contacted_leads), color: COLORS.contacted },
    { name: 'Engaged', value: parseInt(analytics.stats.engaged_leads), color: COLORS.engaged },
    { name: 'Converted', value: parseInt(analytics.stats.converted_leads), color: COLORS.converted },
    { name: 'Rejected', value: parseInt(analytics.stats.rejected_leads), color: COLORS.rejected },
  ].filter(item => item.value > 0);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={statusData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {statusData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

