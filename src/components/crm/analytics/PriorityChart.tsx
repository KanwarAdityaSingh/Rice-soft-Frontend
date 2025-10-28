import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { LeadAnalytics } from '../../../types/entities';

interface PriorityChartProps {
  analytics: LeadAnalytics;
}

const COLORS = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export function PriorityChart({ analytics }: PriorityChartProps) {
  const priorityData = [
    { name: 'Low', count: 0, color: COLORS.low },
    { name: 'Medium', count: 0, color: COLORS.medium },
    { name: 'High', count: parseInt(analytics.stats.high_priority_leads), color: COLORS.high },
    { name: 'Urgent', count: parseInt(analytics.stats.urgent_leads), color: COLORS.urgent },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={priorityData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#8884d8">
          {priorityData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

