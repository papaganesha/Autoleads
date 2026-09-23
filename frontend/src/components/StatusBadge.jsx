export default function StatusBadge({ status = 'idle', label }) {
  const statusConfig = {
    idle: { icon: '◯', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30', text: 'Inativo' },
    running: { icon: '⚙', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30 animate-pulse', text: 'Executando' },
    paused: { icon: '⏸', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', text: 'Pausado' },
    success: { icon: '✓', color: 'text-green-400 bg-green-500/10 border-green-500/30', text: 'Sucesso' },
    error: { icon: '✕', color: 'text-red-400 bg-red-500/10 border-red-500/30', text: 'Erro' },
    'completed_with_errors': { icon: '⚠', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', text: 'Parcial' },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all ${config.color}`}>
      <span className="text-lg">{config.icon}</span>
      <span>{label || config.text}</span>
    </div>
  );
}
