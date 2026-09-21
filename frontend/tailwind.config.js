/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#0B0C10',
        surface: '#16181E',
        'surface-alt': '#1E2029',
        'surface-border': '#2A2D3A',
        accent: {
          purple: '#8B5CF6',
          cyan: '#06B6D4',
          orange: '#F59E0B',
          green: '#10B981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
