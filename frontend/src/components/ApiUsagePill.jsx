import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import api from '../api/client';

export default function ApiUsagePill() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await api.get('/usage/google_places');
        setUsage(res.data);
      } catch (err) {
        console.error('Failed to fetch API usage:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
    // Refresh every 15 seconds for real-time feel
    const interval = setInterval(fetchUsage, 15 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !usage) return null;

  const { used, limit, remaining, percentageUsed } = usage;

  // Color based on percentage used
  let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (percentageUsed > 80) {
    statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  } else if (percentageUsed > 50) {
    statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${statusColor}`}
      title={`Google Places API: ${used}/${limit} requisições usadas`}
    >
      <Activity className="h-4 w-4" />
      <span>{used}/{limit}</span>
      <span className="text-xs opacity-75">({percentageUsed}%)</span>
    </div>
  );
}
