/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f1ff',
          100: '#ebe4ff',
          200: '#daceff',
          300: '#c2a9ff',
          400: '#a278ff',
          500: '#8347ff',
          600: '#5d1edd',
          700: '#4e16bb',
          800: '#411298',
          900: '#36107a',
        },
        secondary: {
          50: '#f0fbff',
          100: '#e0f6ff',
          200: '#b8ecff',
          300: '#7dddff',
          400: '#2ac4f7',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        accent: {
          50: '#d4f2fa',
          100: '#b8ecf5',
          200: '#7dd3fc',
          300: '#38bdf8',
          400: '#0ea5e9',
          500: '#0284c7',
        },
        // Dark theme colors
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}