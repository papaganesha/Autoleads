import React from 'react';

export default function ProgressBar({ processed, total }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
        <span>Processando {processed} de {total} leads...</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
