export function formatRelativeDate(date) {
  if (!date) return '';

  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) return 'agora mesmo';
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? 'ha 1 minuto' : `ha ${diffMinutes} minutos`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? 'ha 1 hora' : `ha ${diffHours} horas`;
  }
  if (diffDays < 7) {
    return diffDays === 1 ? '1 dia atras' : `${diffDays} dias atras`;
  }
  if (diffWeeks < 5) {
    return diffWeeks === 1 ? '1 semana atras' : `${diffWeeks} semanas atras`;
  }
  if (diffMonths < 12) {
    return diffMonths === 1 ? '1 mes atras' : `${diffMonths} meses atras`;
  }

  return d.toLocaleDateString('pt-BR');
}

export function formatNumber(n) {
  if (n === null || n === undefined) return '-';
  if (n >= 1000000) {
    const val = n / 1000000;
    return val % 1 === 0 ? `${val}M` : `${val.toFixed(1)}M`;
  }
  if (n >= 1000) {
    const val = n / 1000;
    return val % 1 === 0 ? `${val}K` : `${val.toFixed(1)}K`;
  }
  return n.toString();
}
