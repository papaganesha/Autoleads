export const CATEGORIES = [
  'Salao de beleza',
  'Restaurante',
  'Academia',
  'Clinica odontologica',
  'Pet shop',
  'Barbearia',
  'Loja de roupas',
  'Padaria',
  'Oficina mecanica',
  'Imobiliaria',
  'Clinica medica',
  'Estudio de tatuagem',
];

export const TEMPERATURE_CONFIG = {
  cold: {
    label: 'FRIO',
    color: 'blue',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    ring: 'ring-blue-400',
    gradient: 'from-blue-400 to-blue-600',
    dot: 'bg-blue-500',
  },
  warm: {
    label: 'MORNO',
    color: 'amber',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    ring: 'ring-amber-400',
    gradient: 'from-amber-400 to-orange-500',
    dot: 'bg-amber-500',
  },
  hot: {
    label: 'QUENTE',
    color: 'red',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    ring: 'ring-red-400',
    gradient: 'from-red-400 to-red-600',
    dot: 'bg-red-500',
  },
};

export const COPY_TYPE_LABELS = {
  pain_point: 'DOR',
  social_proof: 'PROVA SOCIAL',
  urgency: 'URGENCIA',
  value: 'VALOR',
};

export const LEAD_STATUSES = [
  { value: 'new', label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'interested', label: 'Interessado' },
  { value: 'converted', label: 'Convertido' },
  { value: 'lost', label: 'Perdido' },
];

export const SCORE_CRITERIA = [
  { key: 'hasWebsite', label: 'Website', points: 20 },
  { key: 'hasInstagram500', label: 'Instagram 500+', points: 20 },
  { key: 'hasRecentPost', label: 'Post recente', points: 15 },
  { key: 'has50Reviews', label: '50+ avaliacoes', points: 20 },
  { key: 'hasRating4Plus', label: 'Rating 4.0+', points: 15 },
  { key: 'hasWhatsApp', label: 'WhatsApp', points: 10 },
  { key: 'hasCompetitors', label: 'Competitors', points: 10 },
];
