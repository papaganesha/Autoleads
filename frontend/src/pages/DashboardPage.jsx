import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import FilterTabs from '../components/FilterTabs';
import LeadTable from '../components/LeadTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ProgressBar from '../components/ProgressBar';

export default function DashboardPage() {
  const { searchId } = useParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState(null);
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const intervalRef = useRef(null);

  const fetchSearch = useCallback(async () => {
    try {
      const res = await api.get(`/search/${searchId}`);
      setSearch(res.data);
      return res.data;
    } catch (err) {
      setError('Erro ao carregar busca.');
      return null;
    }
  }, [searchId]);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await api.get(`/search/${searchId}/leads`);
      const data = Array.isArray(res.data) ? res.data : res.data.leads || [];
      // Sort by score descending
      data.sort((a, b) => (b.score || 0) - (a.score || 0));
      setLeads(data);
    } catch (err) {
      setError('Erro ao carregar leads.');
    }
  }, [searchId]);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      const s = await fetchSearch();
      if (cancelled) return;

      if (s && (s.status === 'completed' || s.status === 'done')) {
        await fetchLeads();
      }
      setLoading(false);
    }

    init();
    return () => { cancelled = true; };
  }, [fetchSearch, fetchLeads]);

  // Polling while processing
  useEffect(() => {
    if (!search || search.status === 'completed' || search.status === 'done') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(async () => {
      const s = await fetchSearch();
      if (s && (s.status === 'completed' || s.status === 'done')) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        await fetchLeads();
      }
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [search?.status, fetchSearch, fetchLeads]);

  // Filter leads by temperature
  const filteredLeads =
    filter === 'all'
      ? leads
      : leads.filter((l) => l.temperature === filter);

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
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Nova busca
        </button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Resultados da Busca
            </h1>
            {search && (
              <p className="mt-1 text-sm text-gray-500">
                {search.category} em {search.location}
                {!isProcessing && (
                  <span className="ml-2 font-medium text-indigo-600">
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
        <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <ProgressBar
            processed={search.processedCount || 0}
            total={search.totalCount || 0}
          />
        </div>
      )}

      {/* Filter + Table */}
      {!isProcessing && (
        <>
          <div className="mb-4">
            <FilterTabs
              active={filter}
              counts={counts}
              onChange={setFilter}
            />
          </div>

          <LeadTable leads={filteredLeads} searchId={searchId} />
        </>
      )}

      {isProcessing && leads.length === 0 && (
        <LoadingSpinner message="Processando leads, aguarde..." />
      )}
    </div>
  );
}
