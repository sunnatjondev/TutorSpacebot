
export function Button({ children, variant = 'primary', onClick, className = '', disabled, icon, size = 'md' }) {
  const base = 'flex items-center justify-center gap-2 font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-full'

  const variants = {
    primary: 'bg-brand text-white h-[52px] px-6 shadow-glow-sm hover:brightness-110',
    secondary: 'bg-transparent border border-outline-variant text-on-surface h-[52px] px-6 hover:bg-surface-high',
    ghost: 'bg-surface-high text-on-surface-variant h-9 px-4 text-sm',
    danger: 'bg-error-container text-on-error-container h-[52px] px-6',
    outline: 'bg-transparent border border-brand text-primary h-[52px] px-6',
  }

  const sizes = {
    sm: 'h-9 px-4 text-sm',
    md: '',
    full: 'w-full',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size] ?? sizes.md} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
