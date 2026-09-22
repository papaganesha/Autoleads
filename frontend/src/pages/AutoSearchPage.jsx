import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function AutoSearchPage() {
  const [config, setConfig] = useState(null);
  const [states, setStates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedRunDetail, setSelectedRunDetail] = useState(null);

  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, statesRes, categoriesRes, runsRes] = await Promise.all([
        api.get('/auto-search/config'),
        api.get('/meta/states'),
        api.get('/meta/categories'),
        api.get('/auto-search/runs?limit=10'),
      ]);
      setConfig(configRes.data);
      setFormData(configRes.data);
      setStates(statesRes.data.states || []);
      setCategories(categoriesRes.data.categories || []);
      setRuns(runsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.put('/auto-search/config', formData);
      setConfig(res.data);
      setFormData(res.data);
      setSuccess('Configuração salva com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      const endpoint = config.is_enabled ? '/auto-search/pause' : '/auto-search/resume';
      const res = await api.post(endpoint);
      setConfig(res.data);
      setFormData(res.data);
      setSuccess(res.data.message + '!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alternar status');
    }
  };

  const handleTriggerRun = async () => {
    setTriggering(true);
    setError(null);
    try {
      const res = await api.post('/auto-search/run');
      setSuccess('Execução iniciada com runId: ' + res.data.runId);
      setTimeout(() => {
        setSuccess(null);
        loadData();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao iniciar execução');
    } finally {
      setTriggering(false);
    }
  };

  const handleLoadRunDetail = async (runId) => {
    try {
      const res = await api.get(`/auto-search/runs/${runId}`);
      setSelectedRunDetail(res.data);
    } catch (err) {
      setError('Erro ao carregar detalhes da execução');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <svg className="h-12 w-12 animate-spin text-accent-purple mx-auto" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-gray-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!config || !formData) {
    return <div className="flex min-h-screen items-center justify-center text-red-500">Erro ao carregar configurações</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-charcoal to-charcoal/50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">
          Busca <span className="text-accent-purple">Automática</span>
        </h1>
        <p className="text-gray-400 mb-8">Configuração e histórico de execuções automáticas</p>

        {error && <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">{error}</div>}
        {success && <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-400">{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Bar */}
            <div className="rounded-2xl border border-surface-border bg-surface p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Status</h2>
                <button
                  onClick={handleTogglePause}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    config.is_enabled
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                  }`}
                >
                  {config.is_enabled ? '⏸ Pausar' : '▶ Retomar'}
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">Estado: <span className={config.is_enabled ? 'text-green-400 font-semibold' : 'text-orange-400 font-semibold'}>{config.is_enabled ? 'Ativo' : 'Pausado'}</span></p>
                <p className="text-gray-300">Execuções/dia: <span className="text-accent-cyan font-semibold">{config.max_runs_per_day}</span></p>
              </div>
            </div>

            {/* Config Form */}
            <div className="rounded-2xl border border-surface-border bg-surface p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Configuração</h2>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Estado/Região</label>
                <select
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value || null })}
                  className="w-full rounded-lg border border-surface-border bg-charcoal px-3 py-2 text-white text-sm"
                >
                  <option value="">Brasil Inteiro</option>
                  {states.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade de Cidades: {formData.city_count}</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={formData.city_count}
                  onChange={(e) => setFormData({ ...formData, city_count: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Seleção de Cidades</label>
                <select
                  value={formData.city_selection_mode}
                  onChange={(e) => setFormData({ ...formData, city_selection_mode: e.target.value })}
                  className="w-full rounded-lg border border-surface-border bg-charcoal px-3 py-2 text-white text-sm"
                >
                  <option value="top_populous">Mais Populosas (Automático)</option>
                  <option value="manual">Manual (Escolher)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade de Nichos: {formData.niche_count}</label>
                <input
                  type="range"
                  min="1"
                  max="16"
                  value={formData.niche_count}
                  onChange={(e) => setFormData({ ...formData, niche_count: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Seleção de Nichos</label>
                <select
                  value={formData.niche_selection_mode}
                  onChange={(e) => setFormData({ ...formData, niche_selection_mode: e.target.value })}
                  className="w-full rounded-lg border border-surface-border bg-charcoal px-3 py-2 text-white text-sm"
                >
                  <option value="random">Aleatório</option>
                  <option value="manual">Manual (Escolher)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Horários de Execução (HH:00)</label>
                <input
                  type="text"
                  placeholder="08:00, 14:00, 20:00"
                  value={formData.schedule_times.join(', ')}
                  onChange={(e) => setFormData({ ...formData, schedule_times: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                  className="w-full rounded-lg border border-surface-border bg-charcoal px-3 py-2 text-white text-sm"
                />
                <p className="mt-1 text-xs text-gray-400">Separe com vírgula. Ex: 08:00, 14:00</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Limite de Execuções/Dia: {formData.max_runs_per_day}</label>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={formData.max_runs_per_day}
                  onChange={(e) => setFormData({ ...formData, max_runs_per_day: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="w-full mt-6 bg-accent-purple text-white font-semibold py-3 rounded-lg hover:bg-accent-purple/80 disabled:opacity-60 transition-all"
              >
                {saving ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </div>

            {/* Run Now Button */}
            <button
              onClick={handleTriggerRun}
              disabled={triggering}
              className="w-full bg-gradient-to-r from-accent-purple to-accent-cyan text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-accent-purple/25 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {triggering ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Iniciando...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Executar Agora
                </>
              )}
            </button>
          </div>

          {/* Runs History Sidebar */}
          <div className="rounded-2xl border border-surface-border bg-surface p-6 h-fit">
            <h3 className="text-lg font-bold text-white mb-4">Histórico Recente</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {runs.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhuma execução ainda</p>
              ) : (
                runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => {
                      setSelectedRunId(run.id);
                      handleLoadRunDetail(run.id);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedRunId === run.id
                        ? 'border-accent-purple bg-accent-purple/10'
                        : 'border-surface-border hover:border-accent-purple'
                    }`}
                  >
                    <div className="text-xs text-gray-400">{new Date(run.started_at).toLocaleString('pt-BR')}</div>
                    <div className={`text-sm font-semibold ${
                      run.status === 'completed' ? 'text-green-400' :
                      run.status === 'running' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {run.status === 'completed' ? '✓ Concluído' :
                       run.status === 'running' ? '⚙ Rodando' :
                       run.status === 'completed_with_errors' ? '⚠ Com Erros' :
                       '✕ Falhou'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{run.searches_completed}/{run.searches_total} buscas</div>
                  </button>
                ))
              )}
            </div>

            {selectedRunDetail && (
              <div className="mt-6 pt-6 border-t border-surface-border">
                <h4 className="font-semibold text-white mb-3 text-sm">Detalhes da Execução</h4>
                <div className="space-y-2 text-xs text-gray-300">
                  <p>Cidades: {selectedRunDetail.run.cities.join(', ')}</p>
                  <p>Nichos: {selectedRunDetail.run.niches.join(', ')}</p>
                  <p className="mt-3 font-semibold text-gray-200">Buscas Detalhadas:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedRunDetail.searches.map((search) => (
                      <div key={search.id} className="text-gray-400 p-1 bg-charcoal rounded">
                        <div>{search.query} - {search.location}</div>
                        {search.error_message && <div className="text-red-400 text-xs mt-1">{search.error_message}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
