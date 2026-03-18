/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#b9cdff',
          300: '#7fa5ff',
          400: '#4c7bff',
          500: '#1e4fff',
          600: '#0a35e0',
          700: '#0c2db4',
          800: '#102692',
          900: '#0e1f6b',
          950: '#070f3d',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        modal: '0 4px 6px rgba(0,0,0,0.07), 0 12px 32px rgba(0,0,0,0.10)',
        'card-hover': '0 2px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
