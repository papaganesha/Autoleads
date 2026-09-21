import React, { useState, useEffect } from 'react';
import { Star, Globe, MessageCircle, Instagram, Facebook, MapPin, X } from 'lucide-react';
import { generateWhatsAppLink } from '../utils/helpers';

export default function LeadDetailModal({ lead, isOpen, onClose }) {
  const [instagramSuggestions, setInstagramSuggestions] = useState([]);
  const [facebookSuggestions, setFacebookSuggestions] = useState([]);
  const [selectedInstagram, setSelectedInstagram] = useState(null);
  const [selectedFacebook, setSelectedFacebook] = useState(null);
  const [loadingInstagram, setLoadingInstagram] = useState(false);
  const [loadingFacebook, setLoadingFacebook] = useState(false);

  // Generate Instagram/Facebook name suggestions based on business name
  useEffect(() => {
    if (isOpen && lead) {
      const igData = Array.isArray(lead.instagram_data) ? lead.instagram_data[0] : lead.instagram_data;
      if (!igData?.handle) {
        generateInstagramSuggestions(lead.name);
      }
      if (!lead.facebook_url) {
        generateFacebookSuggestions(lead.name);
      }
    }
  }, [isOpen, lead]);

  const generateInstagramSuggestions = (businessName) => {
    setLoadingInstagram(true);
    // Remove special chars and split
    const cleanName = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);

    const suggestions = [];

    // Suggestion 1: full name with underscores
    if (words.length > 1) {
      suggestions.push({
        handle: words.join('_'),
        url: `https://instagram.com/${words.join('_')}`,
        confidence: 'Alta'
      });
    }

    // Suggestion 2: first two words with underscore
    if (words.length >= 2 && suggestions.length < 3) {
      suggestions.push({
        handle: words.slice(0, 2).join('_'),
        url: `https://instagram.com/${words.slice(0, 2).join('_')}`,
        confidence: 'Média'
      });
    }

    // Suggestion 3: single word (first word)
    if (words[0] && suggestions.length < 3) {
      suggestions.push({
        handle: words[0],
        url: `https://instagram.com/${words[0]}`,
        confidence: 'Baixa'
      });
    }

    setInstagramSuggestions(suggestions.slice(0, 3));
    setLoadingInstagram(false);
  };

  const generateFacebookSuggestions = (businessName) => {
    setLoadingFacebook(true);
    const cleanName = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);

    const suggestions = [];

    // Suggestion 1: full name with underscores
    if (words.length > 1) {
      suggestions.push({
        slug: words.join('_'),
        url: `https://facebook.com/${words.join('_')}`,
        confidence: 'Alta'
      });
    }

    // Suggestion 2: first two words with underscore (max 2 suggestions total)
    if (words.length >= 2 && suggestions.length < 2) {
      suggestions.push({
        slug: words.slice(0, 2).join('_'),
        url: `https://facebook.com/${words.slice(0, 2).join('_')}`,
        confidence: 'Média'
      });
    }

    setFacebookSuggestions(suggestions.slice(0, 2));
    setLoadingFacebook(false);
  };

  if (!isOpen || !lead) return null;

  const igData = Array.isArray(lead.instagram_data) ? lead.instagram_data[0] : lead.instagram_data;
  const scoreData = Array.isArray(lead.lead_scores) ? lead.lead_scores[0] : lead.lead_scores;
  const hasWebsite = !!lead.website;
  const hasPhone = !!lead.phone;
  const hasInstagram = igData?.handle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-h-[90vh] max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6 sm:p-8">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{lead.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{lead.address}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6 sm:p-8">
          {/* Contact Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            {hasPhone && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Telefone/WhatsApp</label>
                <a
                  href={generateWhatsAppLink(lead.phone, `Olá ${lead.name}, tudo bem?`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-sm font-medium text-indigo-600 hover:text-indigo-700 break-all"
                >
                  {lead.phone}
                </a>
              </div>
            )}

            {hasWebsite && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Website</label>
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-sm font-medium text-indigo-600 hover:text-indigo-700 truncate"
                >
                  {lead.website}
                </a>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Rating</label>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.round(lead.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">{lead.rating?.toFixed(1) || '-'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Score</label>
              <div className="mt-1">
                <div className="text-2xl font-bold text-gray-900">{scoreData?.total_score || 0}</div>
                <div className={`text-xs font-medium ${
                  scoreData?.temperature === 'hot' ? 'text-red-600' :
                  scoreData?.temperature === 'warm' ? 'text-amber-600' :
                  'text-blue-600'
                }`}>
                  {scoreData?.temperature?.toUpperCase() || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Instagram */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 uppercase">Instagram</h3>
            {hasInstagram ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm">
                  <strong>@{igData.handle}</strong> ({igData.followers_count?.toLocaleString() || 0} seguidores)
                </p>

                {igData.bio && (
                  <p className="text-sm text-gray-700 whitespace-pre-line">{igData.bio}</p>
                )}

                {igData.bio_links && Array.isArray(igData.bio_links) && igData.bio_links.length > 0 && (
                  <div className="space-y-1">
                    {igData.bio_links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-indigo-600 hover:text-indigo-700 truncate"
                      >
                        🔗 {link.title || link.url}
                      </a>
                    ))}
                  </div>
                )}

                {igData.bio_phone && (
                  <p className="text-sm text-gray-700">
                    📞 Telefone na bio: <span className="font-medium">{igData.bio_phone}</span>
                  </p>
                )}

                {!igData.bio && (!igData.bio_links || igData.bio_links.length === 0) && !igData.bio_phone && (
                  <p className="text-xs text-gray-400">Sem link ou contato na bio</p>
                )}

                <a
                  href={`https://instagram.com/${igData.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Abrir Instagram →
                </a>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-gray-600">Nenhuma conta encontrada. Sugestões baseadas no nome:</p>
                {loadingInstagram ? (
                  <div className="text-sm text-gray-500">Procurando...</div>
                ) : (
                  <div className="space-y-2">
                    {instagramSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedInstagram(sug.handle)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          selectedInstagram === sug.handle
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">@{sug.handle}</div>
                            <div className="text-xs text-gray-500">Confiança: {sug.confidence}</div>
                          </div>
                          <a
                            href={sug.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            <Instagram className="h-4 w-4" />
                          </a>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Facebook */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 uppercase">Facebook</h3>
            {lead.facebook_url ? (
              <div className="mt-3">
                <a
                  href={lead.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Abrir Facebook →
                </a>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-gray-600">Nenhuma página encontrada. Sugestões baseadas no nome:</p>
                {loadingFacebook ? (
                  <div className="text-sm text-gray-500">Procurando...</div>
                ) : (
                  <div className="space-y-2">
                    {facebookSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedFacebook(sug.slug)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          selectedFacebook === sug.slug
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{sug.slug}</div>
                            <div className="text-xs text-gray-500">Confiança: {sug.confidence}</div>
                          </div>
                          <a
                            href={sug.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            <Facebook className="h-4 w-4" />
                          </a>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Score Breakdown */}
          {scoreData?.score_breakdown && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 uppercase">Breakdown do Score</h3>
              <div className="mt-3 space-y-2">
                {Object.entries(scoreData.score_breakdown).map(([key, points]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className={`font-medium ${points > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      +{points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Google Maps Link */}
          <div className="border-t border-gray-200 pt-6">
            <a
              href={lead.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100"
            >
              <MapPin className="h-4 w-4" />
              Ver no Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
