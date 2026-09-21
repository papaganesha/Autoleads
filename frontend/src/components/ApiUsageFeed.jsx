import React, { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

export default function ApiUsageFeed({ searchInProgress = false }) {
  const [feed, setFeed] = useState([]);
  const [totals, setTotals] = useState({ googlePlaces: 0, geminiCompletion: 0 });
  const feedEndRef = useRef(null);

  // Subscribe to SSE stream during search
  useEffect(() => {
    if (!searchInProgress) return;

    const eventSource = new EventSource('/api/search/stream');

    eventSource.addEventListener('api_usage', (event) => {
      try {
        const data = JSON.parse(event.data);
        const timestamp = new Date().toLocaleTimeString('pt-BR');

        setFeed((prev) => [
          ...prev,
          {
            id: Date.now(),
            timestamp,
            api: data.api_name === 'google_places' ? '🗺️ Google Places' : '✨ Gemini Completion',
            amount: data.amount,
            total: data.total,
            remaining: data.remaining,
          },
        ]);

        // Update totals
        if (data.api_name === 'google_places') {
          setTotals((prev) => ({ ...prev, googlePlaces: data.total }));
        } else if (data.api_name === 'gemini_completion') {
          setTotals((prev) => ({ ...prev, geminiCompletion: data.total }));
        }
      } catch (err) {
        console.error('Error parsing API usage event:', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [searchInProgress]);

  // Auto-scroll to bottom
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed]);

  if (!searchInProgress || feed.length === 0) return null;

  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-5 w-5 text-amber-600" />
        <h3 className="font-semibold text-amber-900">Consumo de API em Tempo Real</h3>
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto rounded border border-amber-200 bg-white p-2">
        {feed.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border-b border-amber-100 py-1.5 text-sm last:border-b-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{item.timestamp}</span>
              <span className="text-gray-700">{item.api}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-amber-600">+{item.amount}</span>
              <span className="text-xs text-gray-500">
                Total: {item.total} | Restantes: {item.remaining}
              </span>
            </div>
          </div>
        ))}
        <div ref={feedEndRef} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-amber-100 p-2">
          <span className="font-semibold text-amber-900">Google Places: </span>
          <span className="text-amber-700">{totals.googlePlaces}</span>
        </div>
        <div className="rounded bg-amber-100 p-2">
          <span className="font-semibold text-amber-900">Gemini: </span>
          <span className="text-amber-700">{totals.geminiCompletion}</span>
        </div>
      </div>
    </div>
  );
}
