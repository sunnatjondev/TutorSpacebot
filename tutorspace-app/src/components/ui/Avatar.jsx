
export function Avatar({ name, size = 'md', src, color }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const sizes = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  const colorMap = {
    purple: 'from-brand to-primary',
    orange: 'from-orange-500 to-amber-400',
    teal: 'from-teal-500 to-cyan-400',
    pink: 'from-pink-500 to-rose-400',
    green: 'from-green-500 to-emerald-400',
    blue: 'from-blue-500 to-indigo-400',
  }

  // Generate a consistent color from name
  const colors = Object.values(colorMap)
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0
  const gradientClass = color ? colorMap[color] || colorMap.purple : colors[colorIndex]

  if (src) {
    return (
      <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0`}>
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 bg-gradient-to-br ${gradientClass}`}
    >
      {initials}
    </div>
  )
}
