import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import LeadDetailCard from '../components/LeadDetailCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LeadDetailPage() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchId = location.state?.searchId;

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLead() {
      setLoading(true);
      try {
        const res = await api.get(`/leads/${leadId}`);
        if (!cancelled) {
          setLead(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Erro ao carregar detalhes do lead.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLead();
    return () => { cancelled = true; };
  }, [leadId]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/leads/${leadId}`, { status: newStatus });
      setLead((prev) => ({ ...prev, status: newStatus }));
    } catch {
      // Silently fail — the dropdown will revert on re-render
    }
  };

  const handleBack = () => {
    if (searchId) {
      navigate(`/results/${searchId}`);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Carregando detalhes..." />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={handleBack}
            className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Voltar aos resultados
      </button>

      {/* Lead name header */}
      {lead && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
          {lead.category && (
            <p className="mt-1 text-sm text-gray-500">{lead.category}</p>
          )}
        </div>
      )}

      <LeadDetailCard lead={lead} onStatusChange={handleStatusChange} />
    </div>
  );
}
