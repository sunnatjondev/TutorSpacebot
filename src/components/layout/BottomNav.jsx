import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  Settings,
} from 'lucide-react'
import { useI18n } from '../../i18n/index.jsx'
import { useTelegram } from '../../hooks/useTelegram'

const teacherPaths = [
  { icon: LayoutDashboard, path: '/teacher/home', key: 'nav.home' },
  { icon: Users, path: '/teacher/groups', key: 'nav.groups' },
  { icon: CalendarDays, path: '/teacher/schedule', key: 'nav.schedule' },
  { icon: Wallet, path: '/teacher/finance', key: 'nav.finance' },
  { icon: Settings, path: '/teacher/settings', key: 'nav.settings' },
]

const studentPaths = [
  { icon: LayoutDashboard, path: '/student/home', key: 'nav.home' },
  { icon: Users, path: '/student/groups', key: 'nav.groups' },
  { icon: CalendarDays, path: '/student/schedule', key: 'nav.schedule' },
  { icon: Wallet, path: '/student/finance', key: 'nav.finance' },
  { icon: Settings, path: '/student/settings', key: 'nav.settings' },
]

export function BottomNav({ role = 'teacher' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const { haptic } = useTelegram()
  const tabs = role === 'teacher' ? teacherPaths : studentPaths

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = location.pathname.startsWith(tab.path)

        return (
          <button
            key={tab.path}
            className="nav-item"
            onClick={() => {
              haptic?.selection()
              navigate(tab.path)
            }}
          >
            <div
              className={`w-10 h-7 flex items-center justify-center rounded-full transition-all duration-200 ${
                isActive ? 'bg-brand/20' : ''
              }`}
            >
              <Icon
                size={20}
                className={`transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                }`}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
            </div>
            <span
              className={`nav-item-label ${
                isActive ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              {t(tab.key)}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
