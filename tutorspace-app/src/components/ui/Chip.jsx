
export function Chip({ children, active, onClick, color, className = '' }) {
  const activeStyle = color
    ? `bg-${color} border-${color} text-white`
    : 'chip-active'
  return (
    <button
      onClick={onClick}
      className={`chip whitespace-nowrap ${active ? activeStyle : ''} ${className}`}
    >
      {children}
    </button>
  )
}
