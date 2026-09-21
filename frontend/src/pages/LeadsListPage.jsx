import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Menu } from 'lucide-react';
import api from '../api/client';
import { isValidWebsite } from '../utils/helpers';
import GlassToggle from '../components/GlassToggle';
import FilterTabs from '../components/FilterTabs';
import LeadTable from '../components/LeadTable';
import LeadDetailModal from '../components/LeadDetailModal';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LeadsListPage() {
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [sortBy, setSortBy] = useState('score'); // 'score', 'rating', 'recent'
  const [searchTerm, setSearchTerm] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [prioritizeNoWebsite, setPrioritizeNoWebsite] = useState(false);
  const [prioritizeNoSocial, setPrioritizeNoSocial] = useState(false);

  const pageSize = 20;

  // Fetch all leads with pagination and temperature filter only
  useEffect(() => {
    let cancelled = false;

    async function fetchLeads() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/leads', {
          params: {
            page,
            limit: pageSize,
            ...(filter !== 'all' && { temperature: filter }),
          },
        });

        if (!cancelled) {
          const data = res.data?.data || res.data || [];
          setLeads(data);
          if (res.data?.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('Erro ao carregar leads.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLeads();
    return () => { cancelled = true; };
  }, [page, filter]);

  // Calculate counts for filter tabs
  const counts = {
    all: pagination?.total || leads.length,
    cold: leads.filter((l) => l.temperature === 'cold').length,
    warm: leads.filter((l) => l.temperature === 'warm').length,
    hot: leads.filter((l) => l.temperature === 'hot').length,
  };

  // Filter by name (client-side, real-time)
  const filteredLeads = leads.filter((lead) =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helpers to check lead attributes
  const hasNoWebsite = (lead) => !isValidWebsite(lead.website);
  const hasNoSocial = (lead) => {
    const ig = Array.isArray(lead.instagram_data) ? lead.instagram_data[0] : lead.instagram_data;
    const hasNoInstagram = !ig?.handle;
    const hasNoFacebook = !lead.facebook_url;
    return hasNoInstagram && hasNoFacebook;
  };

  // Sort based on sortBy preference + prioritize flags
  const sortedLeads = (() => {
    const sorted = [...filteredLeads];
    const sortByScore = (a, b) => {
      const scoreA = (Array.isArray(a.lead_scores) ? a.lead_scores[0] : a.lead_scores)?.total_score || 0;
      const scoreB = (Array.isArray(b.lead_scores) ? b.lead_scores[0] : b.lead_scores)?.total_score || 0;
      return scoreB - scoreA;
    };

    if (sortBy === 'score') {
      // If prioritization flags are active, separate and reorder
      if (prioritizeNoWebsite || prioritizeNoSocial) {
        const groups = [[], [], [], []]; // [both, noWebsite, noSocial, neither]

        sorted.forEach(lead => {
          const noWebsite = hasNoWebsite(lead);
          const noSocial = hasNoSocial(lead);

          if (prioritizeNoWebsite && prioritizeNoSocial) {
            if (noWebsite && noSocial) groups[0].push(lead);
            else if (noWebsite) groups[1].push(lead);
            else if (noSocial) groups[2].push(lead);
            else groups[3].push(lead);
          } else if (prioritizeNoWebsite) {
            if (noWebsite) groups[0].push(lead);
            else groups[1].push(lead);
          } else if (prioritizeNoSocial) {
            if (noSocial) groups[0].push(lead);
            else groups[1].push(lead);
          }
        });

        // Sort each group by score and flatten
        groups.forEach(group => group.sort(sortByScore));
        return groups.flat();
      } else {
        // No prioritization, just sort by score
        return sorted.sort(sortByScore);
      }
    } else if (sortBy === 'rating') {
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'recent') {
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return sorted;
  })();

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (filter !== 'all') {
      params.append('temperature', filter);
    }

    const url = `/api/export/csv?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    link.click();
  };

  if (loading && leads.length === 0) {
    return <LoadingSpinner message="Carregando leads..." />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
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

  return (
    <div className="w-full px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Meus Leads
          </h1>
          <p className="mt-1 text-gray-400">
            {pagination?.total || leads.length} leads encontrados
          </p>
        </div>
        {leads.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-alt px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-6">
        <FilterTabs
          active={filter}
          counts={counts}
          onChange={(f) => {
            setFilter(f);
            setPage(1);
          }}
        />
      </div>

      {/* Search and Sort Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-lg border border-surface-border bg-surface-alt px-4 py-2 text-sm text-gray-200 placeholder-gray-400 outline-none transition-colors focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/40"
        />

        <div className="flex flex-wrap gap-4 items-center">
          <GlassToggle
            enabled={prioritizeNoWebsite}
            onChange={setPrioritizeNoWebsite}
            label="🌐 Sem Site"
          />

          <GlassToggle
            enabled={prioritizeNoSocial}
            onChange={setPrioritizeNoSocial}
            label="📱 Sem Redes"
          />

          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-alt px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
            >
              <Menu className="h-4 w-4" />
              Ordenar
            </button>

            {showSortMenu && (
              <div className="absolute left-0 z-10 mt-1 w-48 rounded-lg border border-surface-border bg-surface shadow-2xl shadow-black/40">
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
      </div>


      {/* Leads table */}
      {leads.length > 0 ? (
        <>
          <LeadTable
            leads={sortedLeads}
            searchId={null}
            onLeadClick={setSelectedLead}
          />

          {/* Empty state message when search finds no results */}
          {sortedLeads.length === 0 && searchTerm && (
            <div className="mt-4 rounded-lg border border-surface-border bg-surface-alt p-4 text-center">
              <p className="text-sm text-gray-300">
                Nenhum lead encontrado com o nome "{searchTerm}"
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="rounded-lg border border-surface-border bg-surface-alt px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Anterior
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      p === page
                        ? 'bg-accent-purple text-white'
                        : 'bg-surface-alt text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.totalPages}
                className="rounded-lg border border-surface-border bg-surface-alt px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-surface-border bg-surface-alt py-16">
          <p className="text-sm font-medium text-gray-400">
            {filter === 'all' ? 'Nenhum lead encontrado' : `Nenhum lead ${filter} encontrado`}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {filter === 'all'
              ? 'Comece uma nova busca para criar leads'
              : 'Tente ajustar os filtros'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-accent-purple/15 px-4 py-2 text-sm font-medium text-accent-purple hover:bg-accent-purple/25"
          >
            Nova busca
          </button>
        </div>
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
