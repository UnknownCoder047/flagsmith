/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        saloon: {
          mahogany: '#120d0a',
          walnut: '#1f1611',
          brass: '#d4a24c',
          brassLight: '#f3cf7a',
          rust: '#9f2a1d',
          sage: '#2a7b5f',
        },
      },
      keyframes: {
        'dice-roll': {
          '0%': { transform: 'translateY(0) rotate(0deg) scale(1)' },
          '25%': { transform: 'translateY(-8px) rotate(-14deg) scale(1.05)' },
          '55%': { transform: 'translateY(3px) rotate(11deg) scale(0.97)' },
          '80%': { transform: 'translateY(-2px) rotate(-4deg) scale(1.01)' },
          '100%': { transform: 'translateY(0) rotate(0deg) scale(1)' },
        },
        'dice-hesitate': {
          '0%': { transform: 'translateY(0) rotate(0deg)' },
          '20%': { transform: 'translateY(-8px) rotate(-14deg)' },
          '50%': { transform: 'translateY(2px) rotate(10deg)' },
          '74%': { transform: 'translateY(-1px) rotate(3deg)' },
          '88%': { transform: 'translateY(0) rotate(-1.5deg)' },
          '100%': { transform: 'translateY(0) rotate(0deg)' },
        },
        'brass-glint': {
          '0%': { transform: 'translateX(-140%) skewX(-22deg)', opacity: '0' },
          '40%': { opacity: '0.55' },
          '100%': { transform: 'translateX(240%) skewX(-22deg)', opacity: '0' },
        },
        'pawn-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 162, 76, 0.55)' },
          '50%': { boxShadow: '0 0 0 7px rgba(212, 162, 76, 0)' },
        },
      },
      animation: {
        'dice-roll': 'dice-roll 460ms cubic-bezier(0.22, 1, 0.36, 1)',
        'dice-hesitate': 'dice-hesitate 660ms cubic-bezier(0.22, 1, 0.36, 1)',
        'brass-glint': 'brass-glint 520ms ease-in-out forwards',
        'pawn-pulse': 'pawn-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
