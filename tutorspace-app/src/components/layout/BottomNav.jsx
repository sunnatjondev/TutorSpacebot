import { useState, useEffect } from 'react'
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

const parentPaths = [
  { icon: LayoutDashboard, path: '/parent/home', key: 'nav.home' },
  { icon: Settings, path: '/parent/settings', key: 'nav.settings' },
]

export function BottomNav({ role = 'teacher' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const { haptic, tg } = useTelegram()
  const tabs = role === 'teacher' ? teacherPaths : (role === 'parent' ? parentPaths : studentPaths)


  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (tg && tg.viewportStableHeight > 0) {
        setIsKeyboardOpen(tg.viewportStableHeight - tg.viewportHeight > 50)
      } else {
        setIsKeyboardOpen(window.innerHeight < window.outerHeight * 0.75)
      }
    }
    if (tg) tg.onEvent('viewportChanged', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)
    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      if (tg) tg.offEvent('viewportChanged', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
      window.removeEventListener('resize', handleResize)
    }
  }, [tg])

  if (isKeyboardOpen) return null

  return (
    <nav className="m3-bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = location.pathname.startsWith(tab.path)

        return (
          <button
            key={tab.path}
            className={`m3-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              haptic?.selection()
              navigate(tab.path)
            }}
          >
            <div className="m3-nav-indicator" />
            <Icon
              size={24}
              strokeWidth={isActive ? 2.5 : 2}
              className="z-10 transition-transform active:scale-90"
            />
            <span className={`text-[10px] font-medium tracking-wide z-10 ${isActive ? 'text-on-secondary-container' : 'text-on-surface-variant'}`}>
              {t(tab.key)}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
