/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Rokkitt"', 'Georgia', 'serif'],
        sans: ['"Archivo"', 'system-ui', 'sans-serif'],
        serif: ['"Newsreader"', 'Georgia', 'serif'],
        mono: ['"Martian Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        saloon: {
          mahogany: '#120b08',
          walnut: '#221610',
          brass: '#d4a24c',
          brassLight: '#f3cf7a',
          baize: '#163829',
          rust: '#9f2a1d',
          sage: '#2a7b5f',
        },
      },
      keyframes: {
        'brass-glint': {
          '0%': { transform: 'translateX(-150%) skewX(-24deg)', opacity: '0' },
          '35%': { opacity: '0.95' },
          '100%': { transform: 'translateX(260%) skewX(-24deg)', opacity: '0' },
        },
        'pawn-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 162, 76, 0.7)' },
          '50%': { boxShadow: '0 0 0 8px rgba(212, 162, 76, 0)' },
        },
      },
      animation: {
        'brass-glint': 'brass-glint 620ms ease-in-out forwards',
        'pawn-pulse': 'pawn-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
