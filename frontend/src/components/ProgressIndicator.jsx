export default function ProgressIndicator({ completed = 0, total = 100, failed = 0, estimatedMinutes = 0, isRunning = false }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;
  const etaMinutes = isRunning && remaining > 0
    ? Math.ceil((remaining / total) * estimatedMinutes)
    : 0;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300 font-medium">Progresso da Execução</span>
          <span className="text-accent-purple font-semibold">{percentage}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-charcoal rounded-full h-3 border border-surface-border overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              failed > 0 ? 'bg-red-500' : 'bg-accent-purple'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="px-3 py-2 bg-charcoal rounded-lg border border-surface-border text-center">
          <p className="text-gray-400 text-xs">Completas</p>
          <p className="text-green-400 font-bold text-lg">{completed}</p>
        </div>
        <div className="px-3 py-2 bg-charcoal rounded-lg border border-surface-border text-center">
          <p className="text-gray-400 text-xs">Falhadas</p>
          <p className={`font-bold text-lg ${failed > 0 ? 'text-red-400' : 'text-gray-400'}`}>{failed}</p>
        </div>
        <div className="px-3 py-2 bg-charcoal rounded-lg border border-surface-border text-center">
          <p className="text-gray-400 text-xs">ETA</p>
          <p className="text-accent-cyan font-bold text-lg">{etaMinutes}m</p>
        </div>
      </div>

      {/* Progress Text */}
      <p className="text-xs text-gray-400 text-center">
        {completed}/{total} buscas
        {failed > 0 && <span className="text-red-400"> · {failed} falhadas</span>}
      </p>
    </div>
  );
}
