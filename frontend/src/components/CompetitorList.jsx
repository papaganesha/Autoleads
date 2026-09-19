import React from 'react';

function StarRating({ rating }) {
  const stars = [];
  const full = Math.floor(rating || 0);
  const half = (rating || 0) - full >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(
        <svg key={i} className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    } else if (i === full && half) {
      stars.push(
        <svg key={i} className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <defs>
            <linearGradient id={`half-star-${i}`}>
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#D1D5DB" />
            </linearGradient>
          </defs>
          <path fill={`url(#half-star-${i})`} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    } else {
      stars.push(
        <svg key={i} className="h-3.5 w-3.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
}

export default function CompetitorList({ competitors }) {
  if (!competitors || competitors.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
        Nenhum concorrente encontrado na regiao.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {competitors.map((comp, i) => (
        <div
          key={comp.id || i}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">
              {comp.name}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <StarRating rating={comp.rating} />
              <span className="text-xs text-gray-500">
                ({comp.reviewCount || 0})
              </span>
            </div>
          </div>
          <div className="ml-3 flex-shrink-0">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {comp.distance ? `${comp.distance}m` : '-'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
