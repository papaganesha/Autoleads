import React from 'react';

const TABS = [
  { key: 'all', label: 'TODOS', color: 'indigo' },
  { key: 'cold', label: 'FRIO', color: 'blue' },
  { key: 'warm', label: 'MORNO', color: 'amber' },
  { key: 'hot', label: 'QUENTE', color: 'red' },
];

const activeStyles = {
  indigo: 'bg-indigo-600 text-white border-indigo-600',
  blue: 'bg-blue-600 text-white border-blue-600',
  amber: 'bg-amber-500 text-white border-amber-500',
  red: 'bg-red-600 text-white border-red-600',
};

const inactiveStyles = {
  indigo: 'border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600',
  blue: 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600',
  amber: 'border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-600',
  red: 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600',
};

export default function FilterTabs({ active, counts, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const count = counts[tab.key] ?? 0;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive ? activeStyles[tab.color] : inactiveStyles[tab.color]
            }`}
          >
            {tab.label}
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-500'
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
