import React, { useState, useEffect } from 'react';
import api from '../api/client';
import HourlySchedulePicker from '../components/HourlySchedulePicker';
import StatusBadge from '../components/StatusBadge';
import ProgressIndicator from '../components/ProgressIndicator';
import ErrorBanner from '../components/ErrorBanner';
import ScheduleStatusPanel from '../components/ScheduleStatusPanel';

export default function AutoSearchPage() {
  const [config, setConfig] = useState(null);
  const [states, setStates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedRunDetail, setSelectedRunDetail] = useState(null);

  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Live SSE state
  const [liveEventSource, setLiveEventSource] = useState(null);
  const [stopRequesting, setStopRequesting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Load cities when state changes
    if (formData?.state) {
      loadCitiesForState(formData.state);
    } else {
      setCities([]);
    }
  }, [formData?.state]);

  useEffect(() => {
    // Auto-refresh runs list every 3 seconds if not watching a live run
    if (!selectedRunDetail || selectedRunDetail.run.status !== 'running') {
      const timer = setInterval(loadRuns, 3000);
      return () => clearInterval(timer);
    }
  }, [selectedRunDetail]);

  useEffect(() => {
    // Watch live run via SSE if it's running
    if (selectedRunDetail?.run?.status === 'running' && selectedRunDetail.run.id) {
      connectLiveRun(selectedRunDetail.run.id);
    } else {
      disconnectLiveRun();
    }

    return () => disconnectLiveRun();
  }, [selectedRunDetail?.run?.id, selectedRunDetail?.run?.status]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, statesRes, categoriesRes] = await Promise.all([
        api.get('/auto-search/config'),
        api.get('/meta/states'),
        api.get('/meta/categories'),
      ]);
      setConfig(configRes.data);
      setFormData(configRes.data);
      setStates(statesRes.data.states || []);
      setCategories(categoriesRes.data.categories || []);
      await loadRuns();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadRuns = async () => {
    try {
      const res = await api.get('/auto-search/runs?limit=10');
      setRuns(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  const loadCitiesForState = async (state) => {
    try {
      const res = await api.get(`/meta/cities?state=${state}`);
      setCities(res.data.cities || []);
    } catch (err) {
      console.error('Erro ao carregar cidades:', err);
      setCities([]);
    }
  };

  const validateConfig = () => {
    if (!formData.schedule_times || formData.schedule_times.length === 0) {
      setError('Defina pelo menos um horário agendado');
      return false;
    }

    const totalSearches = formData.city_count * formData.niche_count;
    const estimatedMinutes = Math.ceil(totalSearches * 1.5);

    // Verifica sobreposição de horários
    const sorted = [...formData.schedule_times].sort();
    for (let i = 0; i < sorted.length - 1; i++) {
      const [hour1, min1] = sorted[i].split(':').map(Number);
      const [hour2, min2] = sorted[i + 1].split(':').map(Number);
      const minutesBetween = (hour2 - hour1) * 60 + (min2 - min1);

      if (minutesBetween < estimatedMinutes + 5) {
        setError(`Horários muito próximos: ${sorted[i]} e ${sorted[i + 1]} têm apenas ${minutesBetween}min entre eles (necessário ~${estimatedMinutes}min)`);
        return false;
      }
    }

    return true;
  };

  const handleSaveConfig = async () => {
    if (!validateConfig()) return;

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

  const handleTriggerRunClick = async () => {
    try {
      setConfirmLoading(true);
      const res = await api.get('/auto-search/preview');
      setConfirmModal(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar preview');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleConfirmRun = async () => {
    setConfirmLoading(true);
    setError(null);
    try {
      const res = await api.post('/auto-search/run');
      setConfirmModal(null);
      setSuccess(`Execução iniciada com ${res.data.totalSearches} buscas`);

      // Select the new run and load its details
      await loadRuns();
      setSelectedRunId(res.data.runId);
      const detailRes = await api.get(`/auto-search/runs/${res.data.runId}`);
      setSelectedRunDetail(detailRes.data);

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao iniciar execução');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleLoadRunDetail = async (runId) => {
    try {
      const res = await api.get(`/auto-search/runs/${runId}`);
      setSelectedRunDetail(res.data);
      setSelectedRunId(runId);
    } catch (err) {
      setError('Erro ao carregar detalhes da execução');
    }
  };

  const connectLiveRun = (runId) => {
    disconnectLiveRun();

    const eventSource = new EventSource(`${api.defaults.baseURL}/auto-search/runs/${runId}/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setSelectedRunDetail(data);
      } catch (err) {
        console.error('Erro ao parsear SSE:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      disconnectLiveRun();
    };

    setLiveEventSource(eventSource);
  };

  const disconnectLiveRun = () => {
    if (liveEventSource) {
      liveEventSource.close();
      setLiveEventSource(null);
    }
  };

  const handleStopRun = async () => {
    if (!selectedRunDetail) return;

    setStopRequesting(true);
    try {
      await api.post(`/auto-search/runs/${selectedRunDetail.run.id}/stop`);
      setSuccess('Parada solicitada — finalizando a busca atual antes de parar.');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao parar execução');
    } finally {
      setStopRequesting(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Limpar TODO o histórico? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      await api.delete('/auto-search/cleanup');
      setRuns([]);
      setSelectedRunDetail(null);
      setSelectedRunId(null);
      setSuccess('Histórico limpo com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao limpar histórico');
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

        {/* Schedule Status Overview */}
        <div className="mb-8">
          <ScheduleStatusPanel config={config} runs={runs} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Seleção de Cidades</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setFormData({ ...formData, city_selection_mode: 'top_populous', manual_cities: [] })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.city_selection_mode === 'top_populous'
                        ? 'border-accent-purple bg-accent-purple/20 text-accent-purple'
                        : 'border-surface-border text-gray-400 hover:border-accent-purple'
                    }`}
                  >
                    Top Populosas
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, city_selection_mode: 'manual' })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.city_selection_mode === 'manual'
                        ? 'border-accent-purple bg-accent-purple/20 text-accent-purple'
                        : 'border-surface-border text-gray-400 hover:border-accent-purple'
                    }`}
                  >
                    Manual
                  </button>
                </div>
                {formData.city_selection_mode === 'manual' && cities.length > 0 && (
                  <div className="bg-charcoal rounded-lg border border-surface-border p-3 max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {cities.map((city) => (
                        <label key={city} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                          <input
                            type="checkbox"
                            checked={(formData.manual_cities || []).includes(city)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, manual_cities: [...(formData.manual_cities || []), city] });
                              } else {
                                setFormData({ ...formData, manual_cities: (formData.manual_cities || []).filter(c => c !== city) });
                              }
                            }}
                            className="rounded"
                          />
                          {city}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Seleção de Nichos</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setFormData({ ...formData, niche_selection_mode: 'random', manual_niches: [] })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.niche_selection_mode === 'random'
                        ? 'border-accent-cyan bg-accent-cyan/20 text-accent-cyan'
                        : 'border-surface-border text-gray-400 hover:border-accent-cyan'
                    }`}
                  >
                    Aleatório
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, niche_selection_mode: 'manual' })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.niche_selection_mode === 'manual'
                        ? 'border-accent-cyan bg-accent-cyan/20 text-accent-cyan'
                        : 'border-surface-border text-gray-400 hover:border-accent-cyan'
                    }`}
                  >
                    Manual
                  </button>
                </div>
                {formData.niche_selection_mode === 'manual' && categories.length > 0 && (
                  <div className="bg-charcoal rounded-lg border border-surface-border p-3 max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <label key={cat} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                          <input
                            type="checkbox"
                            checked={(formData.manual_niches || []).includes(cat)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, manual_niches: [...(formData.manual_niches || []), cat] });
                              } else {
                                setFormData({ ...formData, manual_niches: (formData.manual_niches || []).filter(n => n !== cat) });
                              }
                            }}
                            className="rounded"
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Resultados por Busca: {formData.results_per_search}</label>
                <input
                  type="range"
                  min="5"
                  max="15"
                  value={formData.results_per_search || 10}
                  onChange={(e) => setFormData({ ...formData, results_per_search: parseInt(e.target.value) })}
                  className="w-full"
                />
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

              <HourlySchedulePicker
                scheduleTimes={formData.schedule_times || []}
                onChange={(times) => setFormData({ ...formData, schedule_times: times })}
                maxRunsPerDay={formData.max_runs_per_day}
                estimatedRunDurationMinutes={Math.ceil((formData.city_count * formData.niche_count) * 1.5)}
              />

              {formData.schedule_times && formData.schedule_times.length > 0 && (
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-xs text-purple-300">Requisições por Execução</p>
                    <p className="text-lg font-bold text-purple-400">📊 {formData.city_count * formData.niche_count * 2}</p>
                  </div>
                  <div className="flex-1 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-300">Requisições por Dia</p>
                    <p className="text-lg font-bold text-blue-400">📅 {(formData.city_count * formData.niche_count * 2) * (formData.schedule_times?.length || 0)}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="w-full mt-6 bg-accent-purple text-white font-semibold py-3 rounded-lg hover:bg-accent-purple/80 disabled:opacity-60 transition-all"
              >
                {saving ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </div>

            <button
              onClick={handleTriggerRunClick}
              disabled={confirmLoading}
              className="w-full bg-gradient-to-r from-accent-purple to-accent-cyan text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-accent-purple/25 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {confirmLoading ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Carregando preview...
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

          <div className="rounded-2xl border border-surface-border bg-surface p-6 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Histórico Recente</h3>
              {runs.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                  title="Limpar histórico"
                >
                  🗑️ Limpar
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {runs.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhuma execução ainda</p>
              ) : (
                runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => handleLoadRunDetail(run.id)}
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
                      run.status === 'cancelled' ? 'text-orange-400' :
                      run.status === 'interrupted' ? 'text-red-400' :
                      'text-red-400'
                    }`}>
                      {run.status === 'completed' ? '✓ Concluído' :
                       run.status === 'running' ? '⚙ Rodando' :
                       run.status === 'cancelled' ? '⊘ Cancelado' :
                       run.status === 'interrupted' ? '⚠ Interrompido' :
                       run.status === 'completed_with_errors' ? '⚠ Com Erros' :
                       '✕ Falhou'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{run.searches_completed || 0}/{run.searches_total} buscas</div>
                  </button>
                ))
              )}
            </div>

            {selectedRunDetail && (
              <div className="mt-6 pt-6 border-t border-surface-border space-y-4">
                {/* Header com Status e Ações */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-sm mb-2">Execução em Andamento</h4>
                    <StatusBadge status={selectedRunDetail.run.status} />
                  </div>
                  <div className="flex gap-2">
                    {selectedRunDetail.run.status === 'running' && (
                      <button
                        onClick={handleStopRun}
                        disabled={stopRequesting}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                      >
                        {stopRequesting ? '⏳ Parando...' : '⊘ Parar'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Update Indicator */}
                {selectedRunDetail.run.status === 'running' && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-yellow-400 text-sm">
                    <span className="animate-pulse">🟡</span>
                    <span>Recebendo atualizações ao vivo...</span>
                  </div>
                )}

                {/* Progress */}
                <ProgressIndicator
                  completed={selectedRunDetail.run.searches_completed || 0}
                  total={selectedRunDetail.run.searches_total}
                  failed={selectedRunDetail.run.searches_failed || 0}
                  estimatedMinutes={Math.ceil(((selectedRunDetail.run.searches_total || 1) - (selectedRunDetail.run.searches_completed || 0)) * 1.5)}
                  isRunning={selectedRunDetail.run.status === 'running'}
                />

                {/* Configs */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
                    <p className="text-gray-400 text-xs">Cidades</p>
                    <p className="text-gray-200 font-semibold mt-1">{Array.isArray(selectedRunDetail.run.cities) ? selectedRunDetail.run.cities.length : 0}</p>
                    <p className="text-gray-500 text-xs mt-1">{Array.isArray(selectedRunDetail.run.cities) ? selectedRunDetail.run.cities.join(', ') : 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
                    <p className="text-gray-400 text-xs">Nichos</p>
                    <p className="text-gray-200 font-semibold mt-1">{Array.isArray(selectedRunDetail.run.niches) ? selectedRunDetail.run.niches.length : 0}</p>
                    <p className="text-gray-500 text-xs mt-1">{Array.isArray(selectedRunDetail.run.niches) ? selectedRunDetail.run.niches.slice(0, 2).join(', ') : 'N/A'}...</p>
                  </div>
                </div>

                {/* Error Banner */}
                {selectedRunDetail.run.error_message && (
                  <ErrorBanner error={selectedRunDetail.run.error_message} />
                )}

                {/* Buscas Detalhadas */}
                {selectedRunDetail.searches && selectedRunDetail.searches.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-gray-400 text-xs font-semibold">📋 Buscas Detalhadas ({selectedRunDetail.searches.length})</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto bg-charcoal rounded-lg border border-surface-border p-3">
                      {selectedRunDetail.searches.map((search) => (
                        <div key={search.id} className="flex items-start gap-2 text-xs pb-1 border-b border-surface-border/50 last:border-b-0">
                          <span className={search.status === 'completed' ? '✓ text-green-400' : search.status === 'error' ? '✕ text-red-400' : '◯ text-gray-400'}>
                            {search.status === 'completed' ? '✓' : search.status === 'error' ? '✕' : '◯'}
                          </span>
                          <div className="flex-1">
                            <p className="text-gray-300">{search.query} <span className="text-gray-500">em {search.location}</span></p>
                            {search.error_message && <p className="text-red-400 text-xs mt-0.5">⚠ {search.error_message}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-surface-border rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-white">Confirmar Execução</h3>

            <div className="space-y-2 text-sm text-gray-300 bg-charcoal p-3 rounded-lg">
              <p><strong>Cidades:</strong> {confirmModal.cities.length}</p>
              <p className="text-xs text-gray-400">{confirmModal.cities.join(', ')}</p>

              <p className="mt-2"><strong>Nichos:</strong> {confirmModal.niches.length}</p>
              <p className="text-xs text-gray-400">{confirmModal.niches.join(', ')}</p>

              <p className="mt-2"><strong>Total de buscas:</strong> {confirmModal.totalSearches}</p>
              <p className="text-xs text-gray-400">⏱ Tempo estimado: ~{confirmModal.estimatedMinutes} minutos</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={confirmLoading}
                className="flex-1 px-4 py-2 rounded-lg border border-surface-border text-gray-300 hover:border-accent-purple hover:text-white transition-all disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRun}
                disabled={confirmLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-accent-purple text-white font-semibold hover:bg-accent-purple/80 transition-all disabled:opacity-60"
              >
                {confirmLoading ? 'Iniciando...' : 'Confirmar e Executar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
