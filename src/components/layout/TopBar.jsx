import React from 'react'
import { Bell } from 'lucide-react'
import { Avatar } from '../ui/Avatar'

export function TopBar({ title = 'TutorSpace', showUser = true, user, onBell, extra }) {
  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40 flex items-center px-4 h-14 gap-3">
      {showUser && user && (
        <Avatar name={user.first_name + ' ' + (user.last_name || '')} size="sm" />
      )}
      <span
        className="font-bold text-lg text-primary flex-1"
        style={{ fontFamily: 'Plus Jakarta Sans' }}
      >
        {title}
      </span>
      {extra}
      <button
        onClick={onBell}
        className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-high transition-colors active:scale-90"
      >
        <Bell size={20} />
      </button>
    </header>
  )
}
