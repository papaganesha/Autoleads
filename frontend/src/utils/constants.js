export const CATEGORIES = [
  'Academia',
  'Açougue e Peixaria',
  'Advocacia e Assessoria Jurídica',
  'Agência de Marketing e Design',
  'Agência de Viagens e Turismo',
  'Arquitetura e Design de Interiores',
  'Assistência Técnica e Celulares',
  'Bar e Casa Noturna',
  'Barbearia',
  'Cafeteria e Confeitaria',
  'Centro Estético e Spa',
  'Clínica Médica',
  'Clínica Odontológica',
  'Clínica Veterinária',
  'Consultoria Financeira e Contabilidade',
  'Corretora de Seguros',
  'Coworking e Espaço de Eventos',
  'Distribuidora de Bebidas',
  'Escola de Dança e Artes',
  'Escola de Idiomas',
  'Estúdio de Fotografia e Vídeo',
  'Estúdio de Pilates e Yoga',
  'Estúdio de Tatuagem e Piercing',
  'Farmácia e Manipulação',
  'Floricultura e Paisagismo',
  'Gráfica e Comunicação Visual',
  'Hotel e Pousada',
  'Imobiliária',
  'Lava-Rápido e Estética Automotiva',
  'Livraria e Papelaria',
  'Loja de Calçados e Acessórios',
  'Loja de Eletrônicos e Informática',
  'Loja de Roupas e Modas',
  'Oficina Mecânica e Auto Center',
  'Ótica',
  'Padaria e Panificadora',
  'Pet Shop e Banho & Tosa',
  'Pizzaria e Hamburgueria',
  'Reformas e Serviços Gerais',
  'Restaurante e Bistrô',
  'Salão de Beleza',
  'Segurança Eletrônica e Monitoramento',
  'Serviço de Limpeza e Terceirização',
  'Supermercado e Hortifruti',
];

export const TEMPERATURE_CONFIG = {
  cold: { label: 'FRIO', bg: 'bg-accent-cyan/15', text: 'text-accent-cyan', ring: 'ring-accent-cyan/30', dot: 'bg-accent-cyan' },
  warm: { label: 'MORNO', bg: 'bg-accent-orange/15', text: 'text-accent-orange', ring: 'ring-accent-orange/30', dot: 'bg-accent-orange' },
  hot: { label: 'QUENTE', bg: 'bg-rose-500/15', text: 'text-rose-400', ring: 'ring-rose-500/30', dot: 'bg-rose-500' },
};

export const LEAD_STATUS_STYLES = {
  new: { bar: 'bg-accent-purple', text: 'text-accent-purple', ring: 'ring-accent-purple' },
  contacted: { bar: 'bg-accent-cyan', text: 'text-accent-cyan', ring: 'ring-accent-cyan' },
  interested: { bar: 'bg-accent-orange', text: 'text-accent-orange', ring: 'ring-accent-orange' },
  not_interested: { bar: 'bg-rose-500', text: 'text-rose-400', ring: 'ring-rose-500' },
  converted: { bar: 'bg-accent-green', text: 'text-accent-green', ring: 'ring-accent-green' },
  archived: { bar: 'bg-slate-500', text: 'text-slate-400', ring: 'ring-slate-500' },
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
  { value: 'not_interested', label: 'Não interessado' },
  { value: 'converted', label: 'Convertido' },
  { value: 'archived', label: 'Arquivado' },
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
