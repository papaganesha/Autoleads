import React, { useMemo } from 'react';
import { PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { LEAD_STATUSES } from '../utils/constants';

export default function PipelineAnalyticsRail({ leads }) {
  const STATUS_COLORS = {
    new: '#8B5CF6',
    contacted: '#06B6D4',
    interested: '#F59E0B',
    not_interested: '#F43F5E',
    converted: '#10B981',
    archived: '#64748B',
  };

  const donutData = useMemo(() => {
    const counts = {};
    LEAD_STATUSES.forEach((status) => {
      counts[status.value] = leads.filter((l) => l.status === status.value).length;
    });
    return LEAD_STATUSES.map((status) => ({
      name: status.label,
      value: counts[status.value],
      color: STATUS_COLORS[status.value],
    })).filter((item) => item.value > 0);
  }, [leads]);

  const lineData = useMemo(() => {
    const dailyCount = {};
    leads.forEach((lead) => {
      if (lead.created_at) {
        const date = new Date(lead.created_at).toLocaleDateString('pt-BR');
        dailyCount[date] = (dailyCount[date] || 0) + 1;
      }
    });
    const dates = Object.keys(dailyCount).sort((a, b) => new Date(a) - new Date(b));
    return dates.map((date) => ({
      date,
      count: dailyCount[date],
    }));
  }, [leads]);

  return (
    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-surface-border bg-surface-alt p-3">
        <h3 className="mb-1 text-xs font-semibold text-gray-300">Status Distribution</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={44}
                paddingAngle={2}
                dataKey="value"
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E2029',
                  border: '1px solid #2A2D3A',
                  borderRadius: '0.5rem',
                  color: '#E5E7EB',
                }}
                formatter={(value) => `${value} leads`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-alt p-3">
        <h3 className="mb-1 text-xs font-semibold text-gray-300">Leads Over Time</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
              <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '10px' }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: '10px' }} allowDecimals={false} width={24} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E2029',
                  border: '1px solid #2A2D3A',
                  borderRadius: '0.5rem',
                  color: '#E5E7EB',
                }}
                formatter={(value) => `${value} leads`}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8B5CF6"
                dot={{ fill: '#8B5CF6', r: 2 }}
                activeDot={{ r: 4 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
