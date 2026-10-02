/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0d0d0c',
          900: '#141413',
          800: '#1c1c1a',
          700: '#262624',
          600: '#3a3936',
          500: '#5e5d59',
        },
        cream: {
          50: '#faf9f5',
          100: '#f0eee6',
          200: '#e3dfd2',
          300: '#bfbab0',
          400: '#a09d96',
        },
        clay: {
          300: '#f0a98a',
          400: '#e58a68',
          500: '#d97757',
          600: '#c6613f',
          700: '#a84f31',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4 Variable"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 50px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
