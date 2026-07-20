/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      colors: {
        primary: 'var(--primary)',
        'on-primary': 'var(--on-primary)',
        'primary-container': 'var(--primary-container)',
        'on-primary-container': 'var(--on-primary-container)',
        secondary: 'var(--secondary)',
        'on-secondary': 'var(--on-secondary)',
        'secondary-container': 'var(--secondary-container)',
        'on-secondary-container': 'var(--on-secondary-container)',
        tertiary: 'var(--tertiary)',
        'on-tertiary': 'var(--on-tertiary)',
        'tertiary-container': 'var(--tertiary-container)',
        'on-tertiary-container': 'var(--on-tertiary-container)',
        error: 'var(--error)',
        'on-error': 'var(--on-error)',
        'error-container': 'var(--error-container)',
        'on-error-container': 'var(--on-error-container)',
        
        // Surfaces
        background: 'var(--background)',
        'on-background': 'var(--on-background)',
        surface: 'var(--surface)',
        'on-surface': 'var(--on-surface)',
        'surface-variant': 'var(--surface-variant)',
        'on-surface-variant': 'var(--on-surface-variant)',
        outline: 'var(--outline)',
        'outline-variant': 'var(--outline-variant)',
        
        // Surface Containers
        'surface-lowest': 'var(--surface-lowest)',
        'surface-low': 'var(--surface-low)',
        'surface-container': 'var(--surface-container)',
        'surface-high': 'var(--surface-high)',
        'surface-highest': 'var(--surface-highest)',
        
        // Legacy compatibility mappings
        brand: 'var(--primary)',
        'brand-dim': 'var(--primary-container)',
        'paid-green': 'var(--paid-green)',
        'paid-green-bg': 'var(--paid-green-bg)',
        'debt-red': 'var(--debt-red)',
        'debt-red-bg': 'var(--debt-red-bg)',
        'partial-orange': 'var(--partial-orange)',
        'partial-orange-bg': 'var(--partial-orange-bg)',
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
        'primary-gradient': 'linear-gradient(135deg, var(--primary) 0%, var(--tertiary) 100%)',
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
