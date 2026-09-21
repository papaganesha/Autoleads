import React from 'react';

export default function ProgressBar({ processed, total }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-sm text-gray-400">
        <span>Processando {processed} de {total} leads...</span>
        <span className="font-medium text-gray-200">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-alt">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-cyan transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
