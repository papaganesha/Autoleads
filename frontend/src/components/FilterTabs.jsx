import React from 'react';
import { TEMPERATURE_CONFIG } from '../utils/constants';

const ALL_STYLE = { bg: 'bg-accent-purple/15', text: 'text-accent-purple', ring: 'ring-accent-purple/30' };
const TABS = [
  { key: 'all', ...ALL_STYLE },
  { key: 'cold', ...TEMPERATURE_CONFIG.cold },
  { key: 'warm', ...TEMPERATURE_CONFIG.warm },
  { key: 'hot', ...TEMPERATURE_CONFIG.hot },
];

export default function FilterTabs({ active, counts, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const count = counts[tab.key] ?? 0;
        const label = tab.key === 'all' ? 'TODOS' : tab.label;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? `${tab.bg} ${tab.text} ring-1 ${tab.ring}`
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
            }`}
          >
            {label}
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                isActive
                  ? 'bg-white/10 text-current'
                  : 'bg-white/5 text-gray-500'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
