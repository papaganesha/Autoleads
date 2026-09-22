import { useState } from 'react';

export default function ErrorBanner({ error, onDismiss, onRetry, retryLabel = 'Tentar Novamente' }) {
  const [isVisible, setIsVisible] = useState(!!error);

  if (!isVisible || !error) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleRetry = () => {
    setIsVisible(false);
    onRetry?.();
  };

  return (
    <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-red-400 text-xl flex-shrink-0 mt-0.5">✕</span>
          <div className="flex-1">
            <p className="text-red-400 font-semibold text-sm">Erro na Execução</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-red-400 hover:text-red-300 flex-shrink-0 font-bold"
          title="Descartar"
        >
          ✕
        </button>
      </div>

      {onRetry && (
        <div className="flex gap-2">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-semibold transition-all"
          >
            🔄 {retryLabel}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-lg text-sm font-semibold transition-all"
          >
            Descartar
          </button>
        </div>
      )}
    </div>
  );
}
