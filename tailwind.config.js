/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: {
          950: '#05090f',
          900: '#080e17',
          800: '#0d1622',
          700: '#13202f',
          600: '#1b2c3f',
        },
        flow: {
          50: '#eafaff',
          200: '#a5e8fb',
          300: '#67d6f5',
          400: '#22bde8',
          500: '#0a9ec9',
          600: '#077ea3',
        },
        loss: {
          300: '#ffb4a0',
          400: '#ff7a5c',
          500: '#ef5230',
        },
        silt: {
          200: '#c6d4e1',
          300: '#9fb3c8',
          400: '#7c93ab',
          500: '#5b7086',
          600: '#43596e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
