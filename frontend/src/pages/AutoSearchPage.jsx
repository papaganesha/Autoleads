import React, { useState } from 'react';
import api from '../api/client';

export default function AutoSearchPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post('/auto-search/run', { cities: 4, niches: 4 });
      setResult(res.data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Erro ao iniciar busca automatica.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Busca <span className="text-accent-purple">Automatica</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Sorteia 4 cidades e 4 nichos, roda 16 buscas (320 leads)
          </p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface p-6 shadow-xl">
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-cyan px-6 py-4 text-lg font-semibold text-white transition-all hover:shadow-lg hover:shadow-accent-purple/25 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processando buscas...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Rodar Busca Automatica
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
                {result.message}
              </div>
              <div className="rounded-lg border border-surface-border bg-charcoal p-4 text-xs text-gray-400 space-y-2">
                <div>
                  <span className="font-medium text-gray-300">Cidades:</span>{' '}
                  {result.cities?.join(', ')}
                </div>
                <div>
                  <span className="font-medium text-gray-300">Nichos:</span>{' '}
                  {result.niches?.join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
