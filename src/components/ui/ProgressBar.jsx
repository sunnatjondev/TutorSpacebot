import React from 'react'

export function ProgressBar({ value = 0, max = 100, className = '' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={`progress-bar ${className}`}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
