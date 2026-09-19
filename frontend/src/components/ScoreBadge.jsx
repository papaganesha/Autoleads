import React from 'react';
import { TEMPERATURE_CONFIG } from '../utils/constants';

export default function ScoreBadge({ temperature, score }) {
  const config = TEMPERATURE_CONFIG[temperature] || TEMPERATURE_CONFIG.cold;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
      {score !== undefined && score !== null && (
        <span className="ml-0.5 font-bold">{score}</span>
      )}
    </span>
  );
}
