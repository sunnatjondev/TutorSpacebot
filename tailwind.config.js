/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        // Surface layers
        surface: '#13121b',
        'surface-dim': '#13121b',
        'surface-bright': '#393842',
        'surface-lowest': '#0e0d16',
        'surface-low': '#1b1b24',
        'surface-container': '#1f1f28',
        'surface-high': '#2a2933',
        'surface-highest': '#35343e',
        // On-surface
        'on-surface': '#e4e1ee',
        'on-surface-variant': '#c7c4d8',
        // Inverse
        'inverse-surface': '#e4e1ee',
        'inverse-on-surface': '#302f39',
        // Outline
        outline: '#918fa1',
        'outline-variant': '#464555',
        // Primary (purple)
        primary: '#c4c0ff',
        'on-primary': '#2000a4',
        'primary-container': '#8781ff',
        'on-primary-container': '#1b0091',
        'primary-fixed': '#e3dfff',
        'primary-fixed-dim': '#c4c0ff',
        'on-primary-fixed': '#100069',
        'on-primary-fixed-variant': '#3622ca',
        'inverse-primary': '#4f44e2',
        // Brand purple (from design components)
        brand: '#6C63FF',
        'brand-dim': '#5a52e0',
        // Secondary (gray)
        secondary: '#c7c6c6',
        'on-secondary': '#2f3131',
        'secondary-container': '#484949',
        'on-secondary-container': '#b8b8b8',
        // Tertiary (orange)
        tertiary: '#ffb785',
        'on-tertiary': '#502500',
        'tertiary-container': '#db761f',
        'on-tertiary-container': '#461f00',
        // Error / Danger (coral red)
        error: '#ffb4ab',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',
        // Background
        background: '#13121b',
        'on-background': '#e4e1ee',
        'surface-variant': '#35343e',
        // Card/elevation levels
        'level-0': '#0F0F0F',
        'level-1': '#1C1C1E',
        'level-2': '#2C2C2E',
        // Status colors
        'paid-green': '#4ade80',
        'paid-green-bg': 'rgba(74,222,128,0.1)',
        'debt-red': '#f87171',
        'debt-red-bg': 'rgba(248,113,113,0.1)',
        'partial-orange': '#fb923c',
        'partial-orange-bg': 'rgba(251,146,60,0.1)',
      },
      borderRadius: {
        'sm': '0.5rem',
        DEFAULT: '1rem',
        'md': '1.5rem',
        'lg': '2rem',
        'xl': '3rem',
        'full': '9999px',
        'card': '20px',
      },
      spacing: {
        'safe': '16px',
        'gutter': '12px',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #6C63FF 0%, #4f44e2 100%)',
        'hero-gradient': 'linear-gradient(135deg, #5a52e0 0%, #7c74ff 50%, #a099ff 100%)',
        'card-glow': 'radial-gradient(ellipse at top, rgba(108,99,255,0.15) 0%, transparent 70%)',
        'danger-glow': 'radial-gradient(ellipse at left, rgba(248,113,113,0.08) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(108,99,255,0.3)',
        'glow-sm': '0 0 10px rgba(108,99,255,0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
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
