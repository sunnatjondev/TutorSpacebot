import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { saveTrustedRole } from '../../lib/backend'
import { LS_ROLE_KEY } from '../../lib/constants'

export function RoleSwitcher({ currentRole = 'teacher' }) {
  const { haptic } = useTelegram()
  const { lang } = useI18n()
  const [switching, setSwitching] = useState(false)

  const roles = [
    { key: 'teacher', label: lang === 'ru' ? 'Учитель' : "O'qituvchi", icon: '👨‍🏫' },
    { key: 'student', label: lang === 'ru' ? 'Ученик' : 'Talaba', icon: '🎓' },
    { key: 'parent', label: lang === 'ru' ? 'Родитель' : 'Ota-ona', icon: '👨‍👩‍👧' },
  ]

  const handleSwitch = async (newRole) => {
    if (newRole === currentRole || switching) return
    haptic?.selection?.()
    setSwitching(true)

    try {
      await saveTrustedRole(newRole)
      localStorage.setItem(LS_ROLE_KEY, newRole)
      haptic?.success?.()
      const target = newRole === 'teacher' ? '/teacher/home' : newRole === 'parent' ? '/parent/home' : '/student/home'
      window.location.href = target
    } catch (err) {
      console.error('Role switch failed:', err)
      setSwitching(false)
      haptic?.error?.()
    }
  }

  return (
    <div className="m3-card border border-primary/20 bg-primary/5 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="font-bold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles size={14} /> {lang === 'ru' ? 'Тест ролей (DEV)' : 'Rolni almashtirish (TEST)'}
        </p>
        <span className="text-[10px] text-on-surface-variant bg-surface-high/60 px-2 py-0.5 rounded-full font-semibold">
          1 аккаунт
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {roles.map((r) => {
          const isActive = r.key === currentRole
          return (
            <button
              key={r.key}
              disabled={switching}
              onClick={() => handleSwitch(r.key)}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs scale-102 font-extrabold'
                  : 'bg-surface-high text-on-surface-variant hover:bg-surface-container active:scale-95'
              } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-base">{r.icon}</span>
              <span className="truncate w-full text-center">{r.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
