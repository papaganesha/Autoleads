import React, { useState } from 'react';
import { COPY_TYPE_LABELS } from '../utils/constants';

const TYPE_COLORS = {
  pain_point: 'border-red-200 bg-red-50',
  social_proof: 'border-blue-200 bg-blue-50',
  urgency: 'border-amber-200 bg-amber-50',
  value: 'border-green-200 bg-green-50',
};

const LABEL_COLORS = {
  pain_point: 'bg-red-100 text-red-700',
  social_proof: 'bg-blue-100 text-blue-700',
  urgency: 'bg-amber-100 text-amber-700',
  value: 'bg-green-100 text-green-700',
};

export default function CopyCard({ type, text, selected, onSelect }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const label = COPY_TYPE_LABELS[type] || type;
  const bgColor = TYPE_COLORS[type] || 'border-gray-200 bg-gray-50';
  const labelColor = LABEL_COLORS[type] || 'bg-gray-100 text-gray-700';

  return (
    <div
      onClick={() => onSelect && onSelect(type)}
      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${bgColor} ${
        selected
          ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-400'
          : 'hover:shadow-md'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${labelColor}`}>
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="rounded-md px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-white hover:text-indigo-600"
        >
          {copied ? (
            <span className="flex items-center gap-1 text-green-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copiado!
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar
            </span>
          )}
        </button>
      </div>
      <p className="text-sm leading-relaxed text-gray-700">{text}</p>
    </div>
  );
}
