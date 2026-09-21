import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import api, { API_BASE_URL } from '../api/client';
import FilterTabs from '../components/FilterTabs';
import LeadTable from '../components/LeadTable';
import LeadDetailModal from '../components/LeadDetailModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ProgressBar from '../components/ProgressBar';

export default function DashboardPage() {
  const { searchId } = useParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState(null);
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [websiteFilter, setWebsiteFilter] = useState('any');
  const [whatsappFilter, setWhatsappFilter] = useState('any');
  const [instagramFilter, setInstagramFilter] = useState('any');
  const [facebookFilter, setFacebookFilter] = useState('any');
  const [statusFilter, setStatusFilter] = useState('any');
  const [ratingFilter, setRatingFilter] = useState('any');
  const [sortBy, setSortBy] = useState('score');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const eventSourceRef = useRef(null);

  const fetchLeads = async () => {
    try {
      const res = await api.get(`/search/${searchId}/leads`);
      const data = Array.isArray(res.data) ? res.data : res.data.leads || [];
      setLeads(data);
    } catch (err) {
      setError('Erro ao carregar leads.');
    }
  };

  const sortLeads = (leadsToSort) => {
    const sorted = [...leadsToSort];
    if (sortBy === 'score') {
      sorted.sort((a, b) => {
        const scoreA = Array.isArray(a.lead_scores) ? a.lead_scores[0]?.total_score : a.lead_scores?.total_score;
        const scoreB = Array.isArray(b.lead_scores) ? b.lead_scores[0]?.total_score : b.lead_scores?.total_score;
        if ((scoreB || 0) !== (scoreA || 0)) {
          return (scoreB || 0) - (scoreA || 0);
        }
        return (b.rating || 0) - (a.rating || 0);
      });
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'recent') {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return sorted;
  };

  // SSE-based real-time updates (replaces polling)
  useEffect(() => {
    const url = `${API_BASE_URL}/search/${searchId}/events`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setSearch(data);
        setLoading(false);

        // When complete, fetch final leads and close SSE
        if (data.status === 'completed' || data.status === 'done' || data.status === 'error') {
          if (data.status !== 'error') {
            fetchLeads();
          }
          eventSource.close();
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      setError('Erro na conexão com o servidor.');
      eventSource.close();
    };

    eventSourceRef.current = eventSource;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [searchId]);

  // Filter leads by all criteria
  const filteredLeads = leads.filter((l) => {
    if (filter !== 'all' && l.temperature !== filter) return false;
    if (websiteFilter === 'with' && !l.website) return false;
    if (websiteFilter === 'without' && l.website) return false;
    if (whatsappFilter === 'with' && !l.phone) return false;
    if (whatsappFilter === 'without' && l.phone) return false;

    if (instagramFilter === 'with') {
      const ig = Array.isArray(l.instagram_data) ? l.instagram_data[0] : l.instagram_data;
      if (!ig?.handle) return false;
    } else if (instagramFilter === 'without') {
      const ig = Array.isArray(l.instagram_data) ? l.instagram_data[0] : l.instagram_data;
      if (ig?.handle) return false;
    }

    if (facebookFilter === 'with' && !l.facebook_url) return false;
    if (facebookFilter === 'without' && l.facebook_url) return false;

    if (statusFilter !== 'any' && l.status !== statusFilter) return false;

    if (ratingFilter !== 'any') {
      const minRating = parseFloat(ratingFilter);
      if (!Number.isNaN(minRating) && (l.rating === null || l.rating < minRating)) return false;
    }

    return true;
  });

  // Sort filtered leads
  const sortedLeads = sortLeads(filteredLeads);

  // Counts for filter tabs
  const counts = {
    all: leads.length,
    cold: leads.filter((l) => l.temperature === 'cold').length,
    warm: leads.filter((l) => l.temperature === 'warm').length,
    hot: leads.filter((l) => l.temperature === 'hot').length,
  };

  if (loading) {
    return <LoadingSpinner message="Carregando resultados..." />;
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <p className="text-sm text-rose-400">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/30"
          >
            Voltar para busca
          </button>
        </div>
      </div>
    );
  }

  const isProcessing =
    search && search.status !== 'completed' && search.status !== 'done';

  return (
    <div className="w-full px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-accent-purple"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Nova busca
        </button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Resultados da Busca
            </h1>
            {search && (
              <p className="mt-1 text-sm text-gray-400">
                {search.category} em {search.location}
                {!isProcessing && (
                  <span className="ml-2 font-medium text-accent-purple">
                    {leads.length} leads encontrados
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className="mb-6 rounded-lg border border-surface-border bg-surface-alt p-4">
          <ProgressBar
            processed={search.processed_results || 0}
            total={search.total_results || 0}
          />
        </div>
      )}

      {/* Filter + Table */}
      {!isProcessing && (
        <>
          <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <FilterTabs
              active={filter}
              counts={counts}
              onChange={setFilter}
            />
            <button
              onClick={() => navigate('/leads')}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-purple px-4 py-2 text-sm font-medium text-white hover:bg-accent-purple/90 shadow-lg shadow-accent-purple/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Salvar Leads
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Filtros & Ordenação</h3>
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-alt px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
              >
                <Menu className="h-4 w-4" />
                Ordenar
              </button>

              {showSortMenu && (
                <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-surface-border bg-surface shadow-2xl shadow-black/40">
                  <button
                    onClick={() => { setSortBy('score'); setShowSortMenu(false); }}
                    className={`block w-full px-4 py-2 text-left text-sm ${sortBy === 'score' ? 'bg-accent-purple/15 text-accent-purple font-medium' : 'text-gray-300 hover:bg-white/5'}`}
                  >
                    Por Score (padrão)
                  </button>
                  <button
                    onClick={() => { setSortBy('rating'); setShowSortMenu(false); }}
                    className={`block w-full px-4 py-2 text-left text-sm ${sortBy === 'rating' ? 'bg-accent-purple/15 text-accent-purple font-medium' : 'text-gray-300 hover:bg-white/5'}`}
                  >
                    Por Rating
                  </button>
                  <button
                    onClick={() => { setSortBy('recent'); setShowSortMenu(false); }}
                    className={`block w-full px-4 py-2 text-left text-sm ${sortBy === 'recent' ? 'bg-accent-purple/15 text-accent-purple font-medium' : 'text-gray-300 hover:bg-white/5'}`}
                  >
                    Mais Recentes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content filters - Grid layout */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Website Filter */}
            <div>
              <label htmlFor="website-filter" className="mb-1.5 block text-xs font-medium text-gray-400">
                Site
              </label>
              <select
                id="website-filter"
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value)}
                className="block w-full rounded-lg border border-surface-border bg-surface-alt px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/40"
              >
                <option value="any">Qualquer</option>
                <option value="with">Com site</option>
                <option value="without">Sem site ⭐</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">⭐ = Score mais alto, menos Instagram</p>
            </div>

            {/* WhatsApp Filter */}
            <div>
              <label htmlFor="whatsapp-filter" className="mb-1.5 block text-xs font-medium text-gray-400">
                WhatsApp
              </label>
              <select
                id="whatsapp-filter"
                value={whatsappFilter}
                onChange={(e) => setWhatsappFilter(e.target.value)}
                className="block w-full rounded-lg border border-surface-border bg-surface-alt px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/40"
              >
                <option value="any">Qualquer</option>
                <option value="with">Com WhatsApp</option>
                <option value="without">Sem WhatsApp</option>
              </select>
            </div>

            {/* Instagram Filter */}
            <div>
              <label htmlFor="instagram-filter" className="mb-1.5 block text-xs font-medium text-gray-400">
                Instagram
              </label>
              <select
                id="instagram-filter"
                value={instagramFilter}
                onChange={(e) => setInstagramFilter(e.target.value)}
                className="block w-full rounded-lg border border-surface-border bg-surface-alt px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/40"
              >
                <option value="any">Qualquer</option>
                <option value="with">Com Instagram</option>
                <option value="without">Sem Instagram</option>
              </select>
            </div>

            {/* Facebook Filter */}
            <div>
              <label htmlFor="facebook-filter" className="mb-1.5 block text-xs font-medium text-gray-400">
                Facebook
              </label>
              <select
                id="facebook-filter"
                value={facebookFilter}
                onChange={(e) => setFacebookFilter(e.target.value)}
                className="block w-full rounded-lg border border-surface-border bg-surface-alt px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/40"
              >
                <option value="any">Qualquer</option>
                <option value="with">Com Facebook</option>
                <option value="without">Sem Facebook</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label htmlFor="rating-filter" className="mb-1.5 block text-xs font-medium text-gray-400">
                Rating Mínimo
              </label>
              <select
                id="rating-filter"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="block w-full rounded-lg border border-surface-border bg-surface-alt px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/40"
              >
                <option value="any">Qualquer</option>
                <option value="0">0+</option>
                <option value="3">3.0+</option>
                <option value="3.5">3.5+</option>
                <option value="4">4.0+</option>
                <option value="4.5">4.5+</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status-filter" className="mb-1.5 block text-xs font-medium text-gray-400">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full rounded-lg border border-surface-border bg-surface-alt px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/40"
              >
                <option value="any">Qualquer</option>
                <option value="new">Novo</option>
                <option value="contacted">Contatado</option>
                <option value="interested">Interessado</option>
                <option value="not_interested">Não interessado</option>
                <option value="converted">Convertido</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
          </div>

          <LeadTable leads={sortedLeads} searchId={searchId} onLeadClick={setSelectedLead} />
        </>
      )}

      {isProcessing && leads.length === 0 && (
        <LoadingSpinner message="Processando leads, aguarde..." />
      )}

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
