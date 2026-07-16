/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      colors: {
        // Material 3 Expressive Dark Theme (Seed: Indigo/Purple)
        primary: '#D0BCFF',
        'on-primary': '#381E72',
        'primary-container': '#4F378B',
        'on-primary-container': '#EADDFF',
        secondary: '#CCC2DC',
        'on-secondary': '#332D41',
        'secondary-container': '#4A4458',
        'on-secondary-container': '#E8DEF8',
        tertiary: '#91F0A1', // Neon Mint for highlights
        'on-tertiary': '#003916',
        'tertiary-container': '#005324',
        'on-tertiary-container': '#ADF0B6',
        error: '#FFB4AB',
        'on-error': '#690005',
        'error-container': '#93000A',
        'on-error-container': '#FFDAD6',
        
        // Surfaces
        background: '#141218',
        'on-background': '#E6E0E9',
        surface: '#141218',
        'on-surface': '#E6E0E9',
        'surface-variant': '#49454F',
        'on-surface-variant': '#CAC4D0',
        outline: '#938F99',
        'outline-variant': '#49454F',
        
        // Surface Containers (M3 Elevation)
        'surface-lowest': '#0F0D13',
        'surface-low': '#1D1B20',
        'surface-container': '#211F26',
        'surface-high': '#2B2930',
        'surface-highest': '#36343B',
        
        // Legacy compatibility mappings
        brand: '#D0BCFF',
        'brand-dim': '#4F378B',
        'paid-green': '#91F0A1',
        'paid-green-bg': 'rgba(145, 240, 161, 0.15)',
        'debt-red': '#FFB4AB',
        'debt-red-bg': 'rgba(255, 180, 171, 0.15)',
        'partial-orange': '#FFB870',
        'partial-orange-bg': 'rgba(255, 184, 112, 0.15)',
      },
      borderRadius: {
        'sm': '0.5rem',
        DEFAULT: '1rem',
        'md': '1.5rem',
        'lg': '2rem',
        'xl': '2.5rem',
        '2xl': '3rem',
        '3xl': '4rem',
        'full': '9999px',
        // M3 Extra Large Squircles
        'card': '2rem', // 32px
        'modal': '2.5rem', // 40px
      },
      spacing: {
        'safe': '16px',
        'gutter': '12px',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #D0BCFF 0%, #91F0A1 100%)',
        'card-gradient': 'linear-gradient(180deg, rgba(43, 41, 48, 0.4) 0%, rgba(33, 31, 38, 0.4) 100%)',
        'scrim': 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)',
      },
      boxShadow: {
        'm3-elevation-1': '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'm3-elevation-2': '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
        'm3-elevation-3': '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
        'glow-primary': '0 0 24px rgba(208, 188, 255, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-sm': 'bounceSm 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'orb-pulse': 'orbPulse 3s ease-in-out infinite',
        'border-pulse': 'borderPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(108,99,255,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(108,99,255,0.6)' },
        },
        bounceSm: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        orbPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(196, 80, 220, 0.4), 0 0 40px rgba(108, 99, 255, 0.2)' },
          '50%': { boxShadow: '0 0 35px rgba(196, 80, 220, 0.7), 0 0 70px rgba(108, 99, 255, 0.4)' },
        },
        borderPulse: {
          '0%, 100%': { borderColor: 'rgba(74, 222, 128, 0.35)', boxShadow: '0 0 4px rgba(74, 222, 128, 0.15)' },
          '50%': { borderColor: 'rgba(74, 222, 128, 0.7)', boxShadow: '0 0 12px rgba(74, 222, 128, 0.35)' },
        },
      },
    },
  },
  plugins: [],
}
