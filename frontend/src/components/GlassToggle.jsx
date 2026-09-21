import React from 'react';

export default function GlassToggle({ enabled, onChange, label, disabled = false }) {
  const icon = label.split(' ')[0];

  return (
    <div
      className={`relative w-20 h-9 rounded-lg transition-all duration-500 ease-in-out border-2 flex items-center cursor-pointer group ${
        enabled
          ? 'bg-gradient-to-r from-accent-purple to-accent-cyan border-accent-purple'
          : 'bg-surface-alt border-surface-border'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}
      onClick={() => !disabled && onChange(!enabled)}
      title={label}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onChange(!enabled);
        }
      }}
    >
      <div
        className={`absolute w-7 h-7 bg-white rounded-lg transition-all duration-500 ease-in-out flex items-center justify-center text-sm font-bold text-gray-800 ${
          enabled ? 'right-1' : 'left-1'
        }`}
      >
        {icon}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs px-2.5 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 font-medium">
        {label}
      </div>
    </div>
  );
}
