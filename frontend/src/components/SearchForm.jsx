import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES } from '../utils/constants';
import GlassToggle from './GlassToggle';
import api from '../api/client';

export default function SearchForm({ onSubmit, loading }) {
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [leadLimit, setLeadLimit] = useState('10');
  const [filterNoWebsite, setFilterNoWebsite] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (location.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const res = await api.get('/search/autocomplete', {
            params: { input: location.trim() },
          });
          setSuggestions(res.data.suggestions || []);
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [location]);

  const handleSelectSuggestion = (description) => {
    setLocation(description);
    setShowSuggestions(false);
  };

  const handleLocationBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!location.trim() || !category) return;
    onSubmit({
      location: location.trim(),
      category,
      limit: parseInt(leadLimit, 10),
      websiteFilter: filterNoWebsite ? 'without' : 'any',
      whatsappFilter: 'any',
    });
  };

  const isValid = location.trim() && category;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Location Input */}
      <div>
        <label
          htmlFor="location"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Localizacao
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <input
            id="location"
            type="text"
            placeholder="Ex: Moema, Sao Paulo"
            autoComplete="off"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={handleLocationBlur}
            disabled={loading}
            className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:text-gray-500"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(s.description)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                >
                  <div className="font-medium text-gray-900">{s.main_text}</div>
                  {s.secondary_text && (
                    <div className="text-sm text-gray-500">{s.secondary_text}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lead Limit Selector */}
      <div>
        <label
          htmlFor="leadLimit"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Quantidade de Leads
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 6a3 3 0 11-6 0 3 3 0 016 0zM16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <select
            id="leadLimit"
            value={leadLimit}
            onChange={(e) => setLeadLimit(e.target.value)}
            disabled={loading}
            className="block w-full appearance-none rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-10 text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="5">5 leads</option>
            <option value="10">10 leads</option>
            <option value="15">15 leads</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Category Dropdown */}
      <div>
        <label
          htmlFor="category"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Categoria
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
            className="block w-full appearance-none rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-10 text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">Selecione uma categoria</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex flex-col justify-start gap-2">
        <GlassToggle
          enabled={filterNoWebsite}
          onChange={setFilterNoWebsite}
          label="🌐 Sem Site (Score Alto)"
          disabled={loading}
        />
        <p className="text-xs text-gray-500">
          ⚠️ Negócios sem site tem score mais alto, mas menos dados de Instagram/Facebook para descobrir
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-amber-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Buscando...
          </>
        ) : (
          <>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Buscar Leads
          </>
        )}
      </button>
    </form>
  );
}
