import React from 'react';
import { useNavigate } from 'react-router-dom';
import ScoreBadge from './ScoreBadge';
import { formatNumber } from '../utils/formatters';
import { LEAD_STATUSES } from '../utils/constants';

function StatusDot({ status }) {
  const colors = {
    new: 'bg-blue-400',
    contacted: 'bg-amber-400',
    interested: 'bg-purple-400',
    converted: 'bg-green-400',
    lost: 'bg-gray-400',
  };

  const label = LEAD_STATUSES.find((s) => s.value === status)?.label || status;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className={`h-2 w-2 rounded-full ${colors[status] || 'bg-gray-400'}`} />
      {label}
    </span>
  );
}

export default function LeadTable({ leads, searchId }) {
  const navigate = useNavigate();

  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
        <svg
          className="mb-4 h-12 w-12 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-sm font-medium text-gray-500">Nenhum lead encontrado</p>
        <p className="mt-1 text-xs text-gray-400">Tente ajustar os filtros ou fazer uma nova busca</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Negocio
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">
              Categoria
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
              Rating
            </th>
            <th className="hidden px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
              Avaliacoes
            </th>
            <th className="hidden px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
              Seguidores
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
              Score
            </th>
            <th className="hidden px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() =>
                navigate(`/lead/${lead.id}`, {
                  state: { searchId },
                })
              }
              className="cursor-pointer transition-colors hover:bg-indigo-50/50"
            >
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                    {(lead.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {lead.name}
                    </p>
                    {lead.address && (
                      <p className="truncate text-xs text-gray-400">
                        {lead.address}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-600 sm:table-cell">
                {lead.category}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {lead.rating?.toFixed(1) || '-'}
                  </span>
                </div>
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-center text-sm text-gray-600 md:table-cell">
                {lead.reviewCount ?? '-'}
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-center text-sm text-gray-600 lg:table-cell">
                {lead.instagram?.followers != null
                  ? formatNumber(lead.instagram.followers)
                  : '-'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-center">
                <ScoreBadge
                  temperature={lead.temperature}
                  score={lead.score}
                />
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-center sm:table-cell">
                <StatusDot status={lead.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
