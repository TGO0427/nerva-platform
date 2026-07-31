/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        sm: '0.25rem',   // 4px — inputs, badges, small controls
        DEFAULT: '0.375rem', // 6px — default
        md: '0.375rem',  // 6px — buttons, inputs, cards
        lg: '0.5rem',    // 8px — panels, modals (cap for UI chrome)
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(16 24 40 / 0.04)',
        sm: '0 1px 2px 0 rgb(16 24 40 / 0.06), 0 1px 1px 0 rgb(16 24 40 / 0.04)',
        md: '0 2px 4px -1px rgb(16 24 40 / 0.06), 0 1px 2px -1px rgb(16 24 40 / 0.04)',
      },
      colors: {
        surface: {
          DEFAULT: '#f4f5f7',  // app background — cool light grey
          card: '#ffffff',     // surface/card
          secondary: '#f4f5f7', // secondary surface
          border: '#e2e4e9',    // border
          dark: {
            DEFAULT: '#0b1220',  // dark background
            card: '#141b2d',     // dark surface
            secondary: '#1c2436', // dark secondary surface
            border: '#2a3348',    // dark border
          },
        },
        text: {
          primary: '#101828',    // primary text
          secondary: '#344054',  // secondary text
          muted: '#667085',      // muted text
          dark: {
            primary: '#f0f2f5',  // dark text
            secondary: '#aab2c5', // dark secondary text
            muted: '#8791a8',    // dark muted text
          },
        },
        primary: {
          50: '#eef3f8',
          100: '#dbe6f0',
          200: '#b3c9dd',
          300: '#8aabc9',
          400: '#5d84a8',
          500: '#3d6690',
          600: '#2c5282',     // primary action / accent
          700: '#234166',     // accent hover
          800: '#1e3a5f',     // sidebar hover state
          900: '#16293f',
          950: '#101828',     // sidebar background (near-black navy)
          hover: '#234166',      // accent hover
          tint: '#eef3f8',       // accent tint
          sidebar: '#101828',    // sidebar background
          active: '#5d84a8',     // sidebar active highlight
          subtitle: '#8aabc9',   // sidebar subtitle text
          dark: '#5d84a8',       // dark-mode accent
        },
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#2563eb',
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
