import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Globe, MessageCircle, Instagram, Facebook } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import { formatNumber } from '../utils/formatters';
import { isValidWebsite } from '../utils/helpers';
import { LEAD_STATUSES, LEAD_STATUS_STYLES } from '../utils/constants';

function extractCityCountry(address) {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim());
  if (parts.length < 2) return address;
  return parts.slice(-2).join(', ');
}

function StatusDot({ status }) {
  const config = LEAD_STATUS_STYLES[status] || LEAD_STATUS_STYLES.new;
  const label = LEAD_STATUSES.find((s) => s.value === status)?.label || status;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`h-2 w-2 rounded-full ${config.bar}`} />
      {label}
    </span>
  );
}

export default function LeadTable({ leads, searchId, onLeadClick }) {
  const navigate = useNavigate();

  const handleRowClick = (lead, e) => {
    if (e.target.closest('a')) return;
    onLeadClick?.(lead);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface">
      <table className="min-w-full divide-y divide-surface-border">
        <thead className="bg-surface-alt">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Negócio
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell">
              Categoria
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
              Rating
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
              Links
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
              Score
            </th>
            <th className="hidden px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border/60">
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={(e) => handleRowClick(lead, e)}
              className="cursor-pointer transition-colors hover:bg-white/5"
            >
              <td className="px-3 py-3 min-w-0 w-40">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-purple text-xs font-bold text-white">
                    {(lead.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {lead.name}
                    </p>
                    {lead.address && (
                      <p className="truncate text-xs text-gray-400">
                        {extractCityCountry(lead.address)}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-400 sm:table-cell">
                {lead.category || '-'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {lead.rating?.toFixed(1) || '-'}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  {isValidWebsite(lead.website) ? (
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      <Globe className="h-5 w-5 cursor-pointer text-accent-cyan hover:text-accent-cyan/80 transition-colors" title="Abrir site" />
                    </a>
                  ) : (
                    <Globe className="h-5 w-5 text-gray-600 cursor-not-allowed" title="Sem site" />
                  )}

                  {lead.phone ? (
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const message = (() => {
                        const copies = Array.isArray(lead.copy_variations) ? lead.copy_variations[0] : lead.copy_variations;
                        const selected = copies?.selected_variant || 'pain_point';
                        return copies?.[selected] || 'Olá! Gostaria de saber mais sobre seus serviços.';
                      })();
                      const whatsappUrl = `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                      window.open(whatsappUrl, '_blank');
                    }} className="p-0">
                      <MessageCircle className="h-5 w-5 cursor-pointer text-accent-green hover:text-accent-green/80 transition-colors" title="Abrir WhatsApp" />
                    </button>
                  ) : (
                    <MessageCircle className="h-5 w-5 text-gray-600 cursor-not-allowed" title="Sem WhatsApp" />
                  )}

                  {(() => {
                    const ig = Array.isArray(lead.instagram_data) ? lead.instagram_data[0] : lead.instagram_data;
                    return ig?.handle ? (
                      <a href={`https://instagram.com/${ig.handle}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <Instagram className="h-5 w-5 cursor-pointer text-pink-400 hover:text-pink-300 transition-colors" title={`@${ig.handle}`} />
                      </a>
                    ) : (
                      <Instagram className="h-5 w-5 text-gray-600 cursor-not-allowed" title="Sem Instagram" />
                    );
                  })()}

                  {lead.facebook_url ? (
                    <a href={lead.facebook_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      <Facebook className="h-5 w-5 cursor-pointer text-blue-400 hover:text-blue-300 transition-colors" title="Abrir Facebook" />
                    </a>
                  ) : (
                    <Facebook className="h-5 w-5 text-gray-600 cursor-not-allowed" title="Sem Facebook" />
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-center">
                <ScoreBadge
                  temperature={(() => {
                    const score = Array.isArray(lead.lead_scores)
                      ? lead.lead_scores[0]
                      : lead.lead_scores;
                    return score?.temperature;
                  })()}
                  score={(() => {
                    const score = Array.isArray(lead.lead_scores)
                      ? lead.lead_scores[0]
                      : lead.lead_scores;
                    return score?.total_score;
                  })()}
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
