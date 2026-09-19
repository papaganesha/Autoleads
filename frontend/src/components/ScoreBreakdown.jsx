import React from 'react';

const CRITERIA = [
  { key: 'hasWebsite', label: 'Website', points: 20 },
  { key: 'hasInstagram500', label: 'Instagram 500+', points: 20 },
  { key: 'hasRecentPost', label: 'Post recente', points: 15 },
  { key: 'has50Reviews', label: '50+ avaliacoes', points: 20 },
  { key: 'hasRating4Plus', label: 'Rating 4.0+', points: 15 },
  { key: 'hasWhatsApp', label: 'WhatsApp', points: 10 },
  { key: 'hasCompetitors', label: 'Competitors', points: 10 },
];

export default function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null;

  const total = CRITERIA.reduce((sum, c) => {
    return sum + (breakdown[c.key] ? c.points : 0);
  }, 0);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">Detalhamento do Score</h4>
      <ul className="space-y-1.5">
        {CRITERIA.map((c) => {
          const met = !!breakdown[c.key];
          return (
            <li
              key={c.key}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {met ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
                <span className={met ? 'text-gray-700' : 'text-gray-400'}>
                  {c.label}
                </span>
              </div>
              <span className={`font-mono text-xs ${met ? 'text-green-600' : 'text-gray-300'}`}>
                +{c.points}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
        <span className="text-sm font-semibold text-gray-700">Total</span>
        <span className="text-lg font-bold text-indigo-600">{total}</span>
      </div>
    </div>
  );
}
