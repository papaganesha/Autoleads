import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LeadDetailPage() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCopy, setSelectedCopy] = useState(null);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await api.get(`/leads/${leadId}`);
        setLead(res.data);
        setSelectedCopy(res.data.copy_variations?.selected_variant || 'pain_point');
      } catch (err) {
        setError('Erro ao carregar lead. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  if (loading) {
    return <LoadingSpinner message="Carregando detalhes do lead..." />;
  }

  if (error || !lead) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error || 'Lead não encontrado'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const igData = lead.instagram;
  const scoreData = lead.lead_scores;
  const copyData = lead.copy_variations;
  const competitors = lead.competitors || [];
  const statusHistory = lead.status_history || [];

  const copyVariants = [
    { key: 'pain_point', label: 'Dor (Pain Point)', text: copyData?.pain_point },
    { key: 'social_proof', label: 'Prova Social', text: copyData?.social_proof },
    { key: 'urgency', label: 'Urgência', text: copyData?.urgency },
    { key: 'value', label: 'Valor', text: copyData?.value },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Back Button & Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
            <p className="mt-1 text-gray-500">{lead.category}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
              scoreData?.temperature === 'hot'
                ? 'bg-red-100 text-red-700'
                : scoreData?.temperature === 'warm'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                scoreData?.temperature === 'hot'
                  ? 'bg-red-500'
                  : scoreData?.temperature === 'warm'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}></span>
              {scoreData?.temperature?.toUpperCase() || 'FRIO'}
            </div>
            <p className="mt-2 text-sm text-gray-500">Score: {scoreData?.total_score || 0}/110</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact Info */}
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Informações</h2>
            <div className="space-y-4 text-sm">
              {lead.phone && (
                <div>
                  <p className="text-gray-500">Telefone</p>
                  <a href={`tel:${lead.phone}`} className="font-medium text-indigo-600 hover:underline">
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.website && (
                <div>
                  <p className="text-gray-500">Website</p>
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline break-all">
                    {lead.website}
                  </a>
                </div>
              )}
              {lead.address && (
                <div>
                  <p className="text-gray-500">Endereço</p>
                  <p className="font-medium text-gray-900">{lead.address}</p>
                </div>
              )}
              {lead.google_maps_url && (
                <div>
                  <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
                    Ver no Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Google Rating */}
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Avaliação Google</h2>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-yellow-500">{lead.rating || 'N/A'}</div>
              <p className="text-sm text-gray-500">
                {lead.user_rating_count || 0} avaliações
              </p>
            </div>
          </div>

          {/* Instagram */}
          {igData && (
            <div className="rounded-xl border border-gray-200 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Instagram</h2>
              <div className="space-y-3">
                {igData.profile_pic_url && (
                  <img src={igData.profile_pic_url} alt={igData.handle} className="h-16 w-16 rounded-full object-cover" />
                )}
                {igData.handle && (
                  <div>
                    <p className="text-gray-500 text-sm">Perfil</p>
                    <a href={`https://instagram.com/${igData.handle}`} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline">
                      @{igData.handle}
                    </a>
                  </div>
                )}
                {igData.followers_count !== undefined && (
                  <div>
                    <p className="text-gray-500 text-sm">Seguidores</p>
                    <p className="font-medium text-gray-900">{igData.followers_count.toLocaleString('pt-BR')}</p>
                  </div>
                )}
                {igData.posts_count !== undefined && (
                  <div>
                    <p className="text-gray-500 text-sm">Posts</p>
                    <p className="font-medium text-gray-900">{igData.posts_count}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Enrichment Data */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Breakdown */}
          {scoreData?.score_breakdown && (
            <div className="rounded-xl border border-gray-200 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Análise de Score</h2>
              <div className="space-y-3">
                {Object.entries(scoreData.score_breakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-indigo-500"
                          style={{ width: `${Math.min(100, (value / 20) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-right text-sm font-medium text-gray-900">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitors */}
          {competitors.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Concorrentes Próximos</h2>
              <div className="space-y-3">
                {competitors.map((comp) => (
                  <div key={comp.id} className="flex items-center justify-between border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                    <div>
                      <p className="font-medium text-gray-900">{comp.competitor_name}</p>
                      <p className="text-sm text-gray-500">
                        {comp.distance_meters ? `${(comp.distance_meters / 1000).toFixed(1)} km` : 'Distância desconhecida'}
                      </p>
                    </div>
                    <div className="text-right">
                      {comp.rating && <p className="font-medium text-gray-900">{comp.rating} ⭐</p>}
                      {comp.review_count && <p className="text-sm text-gray-500">{comp.review_count} avaliações</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Copy Variations */}
          {copyData && (
            <div className="rounded-xl border border-gray-200 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Variações de Texto</h2>

              {/* Tabs */}
              <div className="mb-4 border-b border-gray-200">
                <div className="flex gap-1">
                  {copyVariants.map((variant) => (
                    <button
                      key={variant.key}
                      onClick={() => setSelectedCopy(variant.key)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        selectedCopy === variant.key
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {variant.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              {copyVariants.find((v) => v.key === selectedCopy)?.text && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-900 leading-relaxed">
                    {copyVariants.find((v) => v.key === selectedCopy).text}
                  </p>
                  <button
                    onClick={() => {
                      const text = copyVariants.find((v) => v.key === selectedCopy).text;
                      navigator.clipboard.writeText(text);
                      alert('Texto copiado!');
                    }}
                    className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Copiar Texto
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Histórico de Status</h2>
              <div className="space-y-3">
                {statusHistory.map((entry, idx) => (
                  <div key={idx} className="border-l-2 border-indigo-500 pl-4 py-2">
                    <p className="text-sm text-gray-500">
                      {entry.previous_status} → <span className="font-medium text-gray-900">{entry.new_status}</span>
                    </p>
                    {entry.notes && <p className="mt-1 text-sm text-gray-600 italic">{entry.notes}</p>}
                    {entry.changed_at && (
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(entry.changed_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
