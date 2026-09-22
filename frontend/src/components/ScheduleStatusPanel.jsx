import { useMemo } from 'react';

export default function ScheduleStatusPanel({ config, runs = [] }) {
  if (!config) return null;

  const nextScheduledTime = useMemo(() => {
    if (!config.schedule_times || config.schedule_times.length === 0) return null;

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    // Find next scheduled time
    const sorted = [...config.schedule_times].sort();
    for (const time of sorted) {
      if (time > currentTime) {
        return time;
      }
    }

    // If no time today, return first time tomorrow
    return sorted[0];
  }, [config.schedule_times]);

  const getMinutesUntilNextRun = () => {
    if (!nextScheduledTime) return null;

    const now = new Date();
    const [nextHour, nextMinute] = nextScheduledTime.split(':').map(Number);

    let nextRunTime = new Date(now);
    nextRunTime.setHours(nextHour, nextMinute, 0, 0);

    // If time has passed today, calculate for tomorrow
    if (nextRunTime <= now) {
      nextRunTime.setDate(nextRunTime.getDate() + 1);
    }

    const diffMs = nextRunTime - now;
    const diffMinutes = Math.ceil(diffMs / 60000);

    return diffMinutes;
  };

  const minutesUntil = getMinutesUntilNextRun();

  // Count today's runs
  const today = new Date().toISOString().split('T')[0];
  const runsTodayCount = runs.filter(run =>
    run.started_at && run.started_at.startsWith(today)
  ).length;

  const estimatedRunDuration = Math.ceil(
    (config.city_count || 1) * (config.niche_count || 1) * 1.5
  );

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Programação Ativa</h2>
        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
          config.is_enabled
            ? 'bg-green-500/20 text-green-400'
            : 'bg-orange-500/20 text-orange-400'
        }`}>
          {config.is_enabled ? '🟢 Ativo' : '🟡 Pausado'}
        </div>
      </div>

      {/* Próxima Execução */}
      {nextScheduledTime && config.is_enabled && (
        <div className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-lg">
          <p className="text-sm text-gray-400 mb-2">Próxima Execução Programada</p>
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-bold text-accent-purple">{nextScheduledTime}</p>
            {minutesUntil !== null && (
              <p className="text-sm text-gray-300">
                em <span className="text-accent-cyan font-semibold">{minutesUntil}min</span>
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ⏱ ~{estimatedRunDuration}min por execução
          </p>
        </div>
      )}

      {/* Grid de Informações */}
      <div className="grid grid-cols-2 gap-3">
        {/* Estado/Região */}
        <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
          <p className="text-xs text-gray-400">Estado</p>
          <p className="text-sm font-semibold text-white mt-1">
            {config.state ? config.state.toUpperCase() : 'Brasil Inteiro'}
          </p>
        </div>

        {/* Cidades */}
        <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
          <p className="text-xs text-gray-400">Cidades</p>
          <p className="text-sm font-semibold text-white mt-1">{config.city_count}</p>
          <p className="text-xs text-gray-500 mt-1">
            {config.city_selection_mode === 'manual' ? 'Manual' : 'Top populosas'}
          </p>
        </div>

        {/* Nichos */}
        <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
          <p className="text-xs text-gray-400">Nichos</p>
          <p className="text-sm font-semibold text-white mt-1">{config.niche_count}</p>
          <p className="text-xs text-gray-500 mt-1">
            {config.niche_selection_mode === 'manual' ? 'Manual' : 'Aleatório'}
          </p>
        </div>

        {/* Execuções Hoje */}
        <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
          <p className="text-xs text-gray-400">Hoje</p>
          <p className="text-sm font-semibold text-white mt-1">
            {runsTodayCount}/{config.max_runs_per_day}
          </p>
          <p className="text-xs text-gray-500 mt-1">execuções</p>
        </div>
      </div>

      {/* Schedule Times */}
      {config.schedule_times && config.schedule_times.length > 0 && (
        <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
          <p className="text-xs text-gray-400 mb-2">Horários Agendados</p>
          <div className="flex flex-wrap gap-2">
            {config.schedule_times.map((time) => (
              <span
                key={time}
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  time === nextScheduledTime
                    ? 'bg-accent-purple text-white'
                    : 'bg-surface-border text-gray-300'
                }`}
              >
                🕐 {time}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resultados por Busca */}
      <div className="p-3 bg-charcoal rounded-lg border border-surface-border">
        <p className="text-xs text-gray-400 mb-2">Configurações de Busca</p>
        <div className="space-y-1 text-sm text-gray-300">
          <p>📊 Resultados/busca: <span className="text-white font-semibold">{config.results_per_search || 10}</span></p>
          <p>🔄 Total/execução: <span className="text-white font-semibold">
            {(config.city_count || 1) * (config.niche_count || 1)} buscas
          </span></p>
        </div>
      </div>

      {/* Status Warning */}
      {!config.is_enabled && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm text-orange-400">
          ⏸ Scheduler está pausado. Clique em "▶ Retomar" para ativar execuções automáticas.
        </div>
      )}

      {!config.schedule_times || config.schedule_times.length === 0 && config.is_enabled && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
          ⚠ Nenhum horário agendado. Configure os horários para ativar o scheduler.
        </div>
      )}
    </div>
  );
}
