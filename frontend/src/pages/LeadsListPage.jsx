import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import FilterTabs from '../components/FilterTabs';
import LeadTable from '../components/LeadTable';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LeadsListPage() {
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const pageSize = 20;

  // Fetch all leads with pagination
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
  // Note: counts are approximate based on current page; ideally backend would return total counts per temperature
  const counts = {
    all: pagination?.total || leads.length,
    cold: leads.filter((l) => l.temperature === 'cold').length,
    warm: leads.filter((l) => l.temperature === 'warm').length,
    hot: leads.filter((l) => l.temperature === 'hot').length,
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportCSV = () => {
    // Build query string with current filters
    const params = new URLSearchParams();
    if (filter !== 'all') {
      params.append('temperature', filter);
    }

    // Trigger download
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Meus Leads
          </h1>
          <p className="mt-1 text-gray-500">
            {pagination?.total || leads.length} leads encontrados
          </p>
        </div>
        {leads.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CSV
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-6">
        <FilterTabs
          filter={filter}
          onFilterChange={(f) => {
            setFilter(f);
            setPage(1);
          }}
          counts={counts}
        />
      </div>

      {/* Leads table */}
      {leads.length > 0 ? (
        <>
          <LeadTable leads={leads} searchId={null} />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.totalPages}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      ) : (
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
          <p className="text-sm font-medium text-gray-500">
            {filter === 'all' ? 'Nenhum lead encontrado' : `Nenhum lead ${filter} encontrado`}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {filter === 'all'
              ? 'Comece uma nova busca para criar leads'
              : 'Tente ajustar os filtros'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200"
          >
            Nova busca
          </button>
        </div>
      )}
    </div>
  );
}
