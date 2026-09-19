import React, { useState } from 'react';
import ScoreBadge from './ScoreBadge';
import ScoreBreakdown from './ScoreBreakdown';
import CompetitorList from './CompetitorList';
import CopyCard from './CopyCard';
import { LEAD_STATUSES } from '../utils/constants';
import { formatNumber } from '../utils/formatters';

function StarRating({ rating }) {
  const stars = [];
  const full = Math.floor(rating || 0);

  for (let i = 0; i < 5; i++) {
    stars.push(
      <svg
        key={i}
        className={`h-5 w-5 ${i < full ? 'text-amber-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
}

function InfoRow({ icon, label, value, href }) {
  const content = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-800 hover:underline"
    >
      {value}
    </a>
  ) : (
    <span className="text-gray-800">{value}</span>
  );

  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 flex-shrink-0 text-gray-400">{icon}</span>
      <div>
        <span className="text-gray-500">{label}: </span>
        {content}
      </div>
    </div>
  );
}

export default function LeadDetailCard({ lead, onStatusChange }) {
  const [selectedCopy, setSelectedCopy] = useState(null);

  if (!lead) return null;

  const phone = lead.phone || lead.whatsapp;
  const whatsappLink = phone
    ? `https://wa.me/55${phone.replace(/\D/g, '')}`
    : null;
  const mapsLink = lead.placeId
    ? `https://www.google.com/maps/place/?q=place_id:${lead.placeId}`
    : lead.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`
    : null;

  const copyVariations = lead.copyVariations || lead.copy_variations || {};

  return (
    <div className="space-y-6">
      {/* Top grid: Business Info + Digital Presence */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Business info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Informacoes do Negocio
          </h3>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-lg font-bold text-white">
              {(lead.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{lead.name}</p>
              <p className="text-xs text-gray-500">{lead.category}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="mb-4 flex items-center gap-2">
            <StarRating rating={lead.rating} />
            <span className="text-sm font-medium text-gray-700">
              {lead.rating?.toFixed(1) || '-'}
            </span>
            <span className="text-xs text-gray-400">
              ({lead.reviewCount || 0} avaliacoes)
            </span>
          </div>

          <div className="space-y-3">
            {lead.address && (
              <InfoRow
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                label="Endereco"
                value={lead.address}
                href={mapsLink}
              />
            )}
            {phone && (
              <InfoRow
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
                label="Telefone"
                value={phone}
              />
            )}
            {lead.website && (
              <InfoRow
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                }
                label="Website"
                value={lead.website}
                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              />
            )}
            {mapsLink && (
              <InfoRow
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                }
                label="Mapa"
                value="Ver no Google Maps"
                href={mapsLink}
              />
            )}
          </div>
        </div>

        {/* Middle: Instagram + Score */}
        <div className="space-y-6 lg:col-span-1">
          {/* Instagram */}
          {lead.instagram && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <svg className="h-5 w-5 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                Instagram
              </h3>

              {lead.instagram.handle && (
                <p className="mb-3 text-sm font-medium text-indigo-600">
                  @{lead.instagram.handle}
                </p>
              )}

              <div className="mb-3 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(lead.instagram.followers)}
                  </p>
                  <p className="text-xs text-gray-500">Seguidores</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(lead.instagram.following)}
                  </p>
                  <p className="text-xs text-gray-500">Seguindo</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(lead.instagram.posts)}
                  </p>
                  <p className="text-xs text-gray-500">Posts</p>
                </div>
              </div>

              {lead.instagram.bio && (
                <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  {lead.instagram.bio}
                </p>
              )}
            </div>
          )}

          {/* Score */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Score</h3>
              <ScoreBadge temperature={lead.temperature} score={lead.score} />
            </div>
            <ScoreBreakdown breakdown={lead.scoreBreakdown || lead.score_breakdown} />
          </div>
        </div>

        {/* Right: Copy Variations */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Copys de Abordagem
            </h3>
            <div className="space-y-3">
              {Object.entries(copyVariations).length > 0 ? (
                Object.entries(copyVariations).map(([type, text]) => (
                  <CopyCard
                    key={type}
                    type={type}
                    text={text}
                    selected={selectedCopy === type}
                    onSelect={setSelectedCopy}
                  />
                ))
              ) : (
                <p className="text-center text-sm text-gray-400 py-8">
                  Nenhuma copy gerada ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Competitors */}
      {lead.competitors && lead.competitors.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Concorrentes Proximos
          </h3>
          <CompetitorList competitors={lead.competitors} />
        </div>
      )}

      {/* Bottom bar: Status + WhatsApp */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label
            htmlFor="lead-status"
            className="text-sm font-medium text-gray-700"
          >
            Status:
          </label>
          <select
            id="lead-status"
            value={lead.status || 'new'}
            onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Abrir WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
