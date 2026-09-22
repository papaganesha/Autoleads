import { useMemo, useState } from 'react';
import StatusBadge from './StatusBadge';
import ProgressIndicator from './ProgressIndicator';

export default function ScheduleStatusPanel({ config, runs = [], onSelectRun, onTogglePause, selectedRunDetail, onStopRun, stopRequesting }) {
  const [tab, setTab] = useState('schedule'); // 'schedule' or 'recent'
  const [expandedRunId, setExpandedRunId] = useState(null);

  if (!config) return null;

  const nextScheduledTime = useMemo(() => {
    if (!config.schedule_times || config.schedule_times.length === 0) return null;

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    const sorted = [...config.schedule_times].sort();
    for (const time of sorted) {
      if (time > currentTime) return time;
    }
    return sorted[0];
  }, [config.schedule_times]);

  const minutesUntil = useMemo(() => {
    if (!nextScheduledTime) return null;
    const now = new Date();
    const [nextHour, nextMinute] = nextScheduledTime.split(':').map(Number);
    let nextRunTime = new Date(now);
    nextRunTime.setHours(nextHour, nextMinute, 0, 0);
    if (nextRunTime <= now) nextRunTime.setDate(nextRunTime.getDate() + 1);
    const diffMinutes = Math.ceil((nextRunTime - now) / 60000);
    return diffMinutes;
  }, [nextScheduledTime]);

  const today = new Date().toISOString().split('T')[0];
  const runsTodayCount = runs.filter(run => run.started_at?.startsWith(today)).length;
  const estimatedRunDuration = Math.ceil((config.city_count || 1) * (config.niche_count || 1) * 1.5);
  const recentRuns = runs.slice(0, 5);

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-6 space-y-4">
      {/* Header + Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold text-white">Busca Automática</h2>
        <div className="flex items-center gap-2">
          {runs.length > 0 && tab === 'recent' && (
            <button
              onClick={() => onSelectRun?.('clear')}
              className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
              title="Limpar todo o histórico"
            >
              🗑️ Limpar
            </button>
          )}
          <button
            onClick={() => onTogglePause?.()}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              config.is_enabled
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
            }`}
          >
            {config.is_enabled ? '⏸ Pausar' : '▶ Retomar'}
          </button>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-surface-border">
        <button
          onClick={() => setTab('schedule')}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'schedule'
              ? 'text-accent-purple border-b-2 border-accent-purple -mb-1'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ⏰ Programação
        </button>
        <button
          onClick={() => setTab('recent')}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'recent'
              ? 'text-accent-cyan border-b-2 border-accent-cyan -mb-1'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📋 Histórico ({runs.length})
        </button>
      </div>

      {/* Schedule Tab */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          {/* Status Header */}
          <div className="p-4 bg-charcoal rounded-lg border border-surface-border">
            <p className="text-xs text-gray-400 mb-1">Estado Atual</p>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                config.is_enabled ? 'bg-green-500' : 'bg-orange-500'
              }`}></div>
              <p className="text-lg font-semibold text-white">{config.is_enabled ? '🟢 Ativo' : '🟡 Pausado'}</p>
            </div>
          </div>

          {/* Próxima Execução */}
          {nextScheduledTime && config.is_enabled && (
            <div className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Próxima Execução</p>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-bold text-accent-purple">{nextScheduledTime}</p>
                {minutesUntil !== null && (
                  <p className="text-sm text-gray-300">em <span className="text-accent-cyan font-semibold">{minutesUntil}min</span></p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">⏱ ~{estimatedRunDuration}min por execução</p>
            </div>
          )}

          {/* Config Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
              <p className="text-xs text-gray-400">Estado</p>
              <p className="text-sm font-semibold text-white mt-1">{config.state ? config.state.toUpperCase() : 'Brasil'}</p>
            </div>
            <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
              <p className="text-xs text-gray-400">Cidades</p>
              <p className="text-sm font-semibold text-white mt-1">{config.city_count}</p>
            </div>
            <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
              <p className="text-xs text-gray-400">Nichos</p>
              <p className="text-sm font-semibold text-white mt-1">{config.niche_count}</p>
            </div>
            <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
              <p className="text-xs text-gray-400">Hoje</p>
              <p className="text-sm font-semibold text-white mt-1">{runsTodayCount}/{config.max_runs_per_day}</p>
            </div>
          </div>

          {/* Horários Agendados */}
          {config.schedule_times?.length > 0 && (
            <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
              <p className="text-xs text-gray-400 mb-2">Horários</p>
              <div className="flex flex-wrap gap-2">
                {config.schedule_times.map((time) => (
                  <span key={time} className={`px-2 py-1 rounded text-xs font-semibold ${
                    time === nextScheduledTime ? 'bg-accent-purple text-white' : 'bg-surface-border text-gray-300'
                  }`}>
                    🕐 {time}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!config.is_enabled && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm text-orange-400">
              ⏸ Scheduler pausado. Clique em "▶ Retomar" para ativar.
            </div>
          )}
        </div>
      )}

      {/* Recent Runs Tab */}
      {tab === 'recent' && (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {recentRuns.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">📭 Nenhuma execução ainda</p>
          ) : (
            recentRuns.map((run, idx) => {
              const isExpanded = expandedRunId === run.id;
              return (
                <div
                  key={run.id}
                  className="rounded-lg border border-surface-border overflow-hidden"
                >
                  {/* Header - Click to expand */}
                  <button
                    onClick={() => {
                      setExpandedRunId(isExpanded ? null : run.id);
                      onSelectRun?.(run.id);
                    }}
                    className={`w-full text-left p-3 transition-all ${
                      isExpanded
                        ? 'bg-accent-cyan/10 border-accent-cyan'
                        : 'hover:bg-accent-cyan/5 hover:border-accent-cyan'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Status Icon & Time */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`text-lg flex-shrink-0 ${
                          run.status === 'completed' ? 'text-green-400' :
                          run.status === 'completed_with_errors' ? 'text-amber-400' :
                          run.status === 'running' ? 'text-yellow-400 animate-pulse' :
                          run.status === 'error' || run.status === 'failed' ? 'text-red-400' :
                          run.status === 'cancelled' ? 'text-orange-400' :
                          'text-gray-400'
                        }`}>
                          {run.status === 'completed' ? '✓' :
                           run.status === 'completed_with_errors' ? '⚠' :
                           run.status === 'running' ? '⚙' :
                           run.status === 'error' || run.status === 'failed' ? '✕' :
                           run.status === 'cancelled' ? '⊘' : '◯'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500">{new Date(run.started_at).toLocaleString('pt-BR')}</div>
                          <div className="text-xs text-gray-400 capitalize">{run.status === 'completed_with_errors' ? 'concluído com erros' : run.status}</div>
                        </div>
                      </div>
                      {/* Stats + Expand Icon */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{run.searches_completed || 0}/{run.searches_total}</span>
                        <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && selectedRunDetail?.run?.id === run.id && (
                    <div className="border-t border-surface-border p-3 space-y-3 bg-charcoal/50">
                      {/* Status & Stop Button */}
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={run.status} />
                        {run.status === 'running' && (
                          <button
                            onClick={() => onStopRun?.()}
                            disabled={stopRequesting}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-semibold transition-all disabled:opacity-60"
                          >
                            {stopRequesting ? '⏳' : '⊘'} Parar
                          </button>
                        )}
                      </div>

                      {/* Progress */}
                      <ProgressIndicator
                        completed={selectedRunDetail.run.searches_completed || 0}
                        total={selectedRunDetail.run.searches_total}
                        failed={selectedRunDetail.run.searches_failed || 0}
                        estimatedMinutes={Math.ceil(((selectedRunDetail.run.searches_total || 1) - (selectedRunDetail.run.searches_completed || 0)) * 1.5)}
                        isRunning={selectedRunDetail.run.status === 'running'}
                      />

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 bg-surface rounded border border-surface-border text-xs">
                          <p className="text-gray-500 text-[0.65rem]">CIDADES</p>
                          <p className="text-white font-semibold">{Array.isArray(selectedRunDetail.run.cities) ? selectedRunDetail.run.cities.length : 0}</p>
                        </div>
                        <div className="p-2 bg-surface rounded border border-surface-border text-xs">
                          <p className="text-gray-500 text-[0.65rem]">NICHOS</p>
                          <p className="text-white font-semibold">{Array.isArray(selectedRunDetail.run.niches) ? selectedRunDetail.run.niches.length : 0}</p>
                        </div>
                        <div className="p-2 bg-surface rounded border border-surface-border text-xs">
                          <p className="text-gray-500 text-[0.65rem]">BUSCAS</p>
                          <p className="text-white font-semibold">{selectedRunDetail.run.searches_total || 0}</p>
                        </div>
                      </div>

                      {/* Results Summary */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 bg-green-500/10 rounded border border-green-500/30 text-xs">
                          <p className="text-green-400 text-[0.65rem]">✓ COMPLETADAS</p>
                          <p className="text-green-300 font-semibold">{selectedRunDetail.run.searches_completed || 0}</p>
                        </div>
                        <div className="p-2 bg-red-500/10 rounded border border-red-500/30 text-xs">
                          <p className="text-red-400 text-[0.65rem]">✕ FALHADAS</p>
                          <p className="text-red-300 font-semibold">{selectedRunDetail.run.searches_failed || 0}</p>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded border border-blue-500/30 text-xs">
                          <p className="text-blue-400 text-[0.65rem]">📊 LEADS</p>
                          <p className="text-blue-300 font-semibold">{selectedRunDetail.run.total_leads_found || 0}</p>
                        </div>
                      </div>

                      {/* Error Banner */}
                      {selectedRunDetail.run.error_message && (
                        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                          ⚠️ {selectedRunDetail.run.error_message}
                        </div>
                      )}

                      {/* Buscas Preview */}
                      {selectedRunDetail.searches && selectedRunDetail.searches.length > 0 && (
                        <div className="text-xs space-y-1">
                          <p className="text-gray-500 font-semibold">Buscas: {selectedRunDetail.searches.length}</p>
                          <div className="max-h-24 overflow-y-auto space-y-1">
                            {selectedRunDetail.searches.slice(0, 3).map((search) => (
                              <div key={search.id} className="flex items-start gap-1 text-[0.7rem] text-gray-400">
                                <span className={search.status === 'completed' ? 'text-green-400' : search.status === 'error' ? 'text-red-400' : 'text-gray-500'}>
                                  {search.status === 'completed' ? '✓' : search.status === 'error' ? '✕' : '◯'}
                                </span>
                                <span>{search.query} em {search.location}</span>
                              </div>
                            ))}
                            {selectedRunDetail.searches.length > 3 && (
                              <p className="text-gray-500 text-[0.7rem]">... +{selectedRunDetail.searches.length - 3} mais</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
