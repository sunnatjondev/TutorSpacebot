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
        // Surface layers (PrepCore ultra-dark theme)
        surface: '#0B0D10',
        'surface-dim': '#0B0D10',
        'surface-bright': '#21242C',
        'surface-lowest': '#050608',
        'surface-low': '#111318',
        'surface-container': '#16181D',
        'surface-high': '#21242C',
        'surface-highest': '#2A2E38',
        // On-surface
        'on-surface': '#E8EAED',
        'on-surface-variant': '#9AA0A6',
        // Outline
        outline: '#5F6368',
        'outline-variant': '#3C4043',
        // Primary (PrepCore Light Blue)
        primary: '#8AB4F8',
        'on-primary': '#0B0D10',
        'primary-container': '#20304C',
        'on-primary-container': '#D2E3FC',
        // Brand (Same as primary for consistency)
        brand: '#8AB4F8',
        'brand-dim': '#669DF6',
        // Exams / Subjects
        'sat-blue': '#4C7AF2',
        'ielts-amber': '#F2A359',
        'academic-green': '#81C995',
        'hard-red': '#F28B82',
        // Background
        background: '#0B0D10',
        'on-background': '#E8EAED',
        // Card/elevation levels
        'level-0': '#0B0D10',
        'level-1': '#16181D',
        'level-2': '#21242C',
        // Status colors (mapped to pastel variants)
        'paid-green': '#81C995',
        'paid-green-bg': 'rgba(129, 201, 149, 0.12)',
        'debt-red': '#F28B82',
        'debt-red-bg': 'rgba(242, 139, 130, 0.12)',
        'partial-orange': '#F2A359',
        'partial-orange-bg': 'rgba(242, 163, 89, 0.12)',
      },
      borderRadius: {
        'sm': '0.5rem',
        DEFAULT: '1rem',
        'md': '1.5rem',
        'lg': '2rem',
        'xl': '3rem',
        'full': '9999px',
        'card': '1.5rem', // 24px, MD3 standard
      },
      spacing: {
        'safe': '16px',
        'gutter': '12px',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #8AB4F8 0%, #4C7AF2 100%)',
        'hero-gradient': 'radial-gradient(ellipse at top, rgba(138, 180, 248, 0.15) 0%, transparent 70%)',
        'card-glow': 'radial-gradient(ellipse at top, rgba(138, 180, 248, 0.08) 0%, transparent 70%)',
        'danger-glow': 'radial-gradient(ellipse at left, rgba(242, 139, 130, 0.08) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(138, 180, 248, 0.25)',
        'glow-sm': '0 0 10px rgba(138, 180, 248, 0.15)',
        'card': '0 8px 32px rgba(0,0,0,0.3)',
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
