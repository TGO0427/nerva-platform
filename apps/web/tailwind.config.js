/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#f5f7fb',  // app background
          card: '#ffffff',     // surface/card
          secondary: '#f0f3f9', // secondary surface
          border: '#e5e9f2',    // border
          dark: {
            DEFAULT: '#0f172a',  // dark background
            card: '#1e293b',     // dark surface
            secondary: '#334155', // dark secondary surface
            border: '#475569',    // dark border
          },
        },
        text: {
          primary: '#0f172a',    // primary text
          secondary: '#334155',  // secondary text
          muted: '#64748b',      // muted text
          dark: {
            primary: '#f1f5f9',  // dark text
            secondary: '#94a3b8', // dark secondary text
            muted: '#94a3b8',    // dark muted text
          },
        },
        primary: {
          50: '#E8F5E9',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#66BB6A',
          500: '#4FB84F',     // brand accent green
          600: '#4FB84F',     // primary action
          700: '#3E9B3E',     // accent hover
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
          hover: '#3E9B3E',      // accent hover
          tint: '#E8F5E9',       // accent tint
          sidebar: '#064e3b',    // sidebar background
          active: '#34d399',     // sidebar active highlight
          subtitle: '#6ee7b7',   // sidebar subtitle green
          dark: '#66BB6A',       // dark accent
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-out': 'slide-out 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'pulse-subtle': 'pulse-subtle 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
