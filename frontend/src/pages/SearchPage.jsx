import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchForm from '../components/SearchForm';
import ApiUsageFeed from '../components/ApiUsageFeed';
import api from '../api/client';

export default function SearchPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async ({ location, category, limit, websiteFilter, whatsappFilter }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/search', { location, category, limit, websiteFilter, whatsappFilter });
      const searchId = res.data.id || res.data.searchId;
      navigate(`/results/${searchId}`);
    } catch (err) {
      const raw =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Erro ao iniciar busca. Tente novamente.';
      const message = typeof raw === 'string' ? raw : raw?.message || 'Erro ao iniciar busca. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-purple to-accent-cyan shadow-lg shadow-accent-purple/20">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Auto<span className="text-accent-purple">Leads</span>
          </h1>
          <p className="mt-2 text-gray-400">
            Encontre leads qualificados para seu negocio
          </p>
        </div>

        {/* Search Card */}
        <div className="rounded-2xl border border-surface-border bg-surface p-6 shadow-xl sm:p-8">
          <SearchForm onSubmit={handleSearch} loading={loading} />

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* API Usage Live Feed */}
        <ApiUsageFeed searchInProgress={loading} />

        {/* Footer hint */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Busque por cidade, bairro ou regiao e selecione uma categoria
        </p>
      </div>
    </div>
  );
}
