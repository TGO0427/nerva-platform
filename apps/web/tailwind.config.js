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
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#38bdf8',     // brand accent light blue
          600: '#0ea5e9',     // primary action
          700: '#0284c7',     // accent hover
          800: '#0369a1',
          900: '#075985',
          950: '#082f49',
          hover: '#0284c7',      // accent hover
          tint: '#f0f9ff',       // accent tint
          sidebar: '#075985',    // sidebar background
          active: '#7dd3fc',     // sidebar active highlight
          subtitle: '#bae6fd',   // sidebar subtitle light blue
          dark: '#38bdf8',       // dark accent
        },
        success: '#38bdf8',
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
