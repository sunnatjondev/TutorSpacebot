import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Bell, Globe } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'

export default function StudentSettings() {
  const { user, haptic, openTelegramLink } = useTelegram()
  const { t, lang, setLanguage, languages } = useI18n()
  const navigate = useNavigate()
  const [lessonReminders, setLessonReminders] = useState(() => {
    const saved = localStorage.getItem('setting_lessonReminders')
    return saved !== null ? saved === 'true' : true
  })
  const [paymentAlerts, setPaymentAlerts] = useState(() => {
    const saved = localStorage.getItem('setting_paymentAlerts')
    return saved !== null ? saved === 'true' : false
  })

  const handleToggleLessonReminders = (value) => {
    setLessonReminders(value)
    localStorage.setItem('setting_lessonReminders', String(value))
  }

  const handleTogglePaymentAlerts = (value) => {
    setPaymentAlerts(value)
    localStorage.setItem('setting_paymentAlerts', String(value))
  }


  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Talaba'
  const langLabels = { uz: 'UZ', ru: 'RU' }

  const Toggle = ({ value, onChange }) => (
    <button onClick={() => { onChange(!value); haptic?.selection() }}
      className={`toggle ${value ? 'bg-brand' : 'bg-surface-highest'}`}>
      <span className={`toggle-knob ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6 space-y-4">
        {/* Profile — Real Telegram data */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="relative">
            <Avatar name={fullName} size="xl" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: '#0088cc' }}>
              <span className="text-white text-[10px] font-bold">TG</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-on-surface">{fullName}</p>
            {user?.username && <p className="text-on-surface-variant text-sm">@{user.username}</p>}
            <p className="text-on-surface-variant text-xs mt-0.5">{t('teacherSettings.syncedTelegram')}</p>
          </div>
        </div>

        {/* Notifications */}
        <div className="card space-y-4">
          <p className="font-bold text-on-surface flex items-center gap-2">
            <Bell size={16} className="text-primary" /> {t('teacherSettings.notifications')}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-on-surface text-sm">{t('teacherSettings.lessonReminders')}</p>
            <Toggle value={lessonReminders} onChange={handleToggleLessonReminders} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-on-surface text-sm">{t('teacherSettings.paymentAlerts')}</p>
            <Toggle value={paymentAlerts} onChange={handleTogglePaymentAlerts} />
          </div>
        </div>

        {/* Language */}
        <div className="card">
          <p className="font-bold text-on-surface mb-3 flex items-center gap-2">
            <Globe size={16} className="text-primary" /> {t('teacherSettings.language')}
          </p>
          <div className="flex gap-2">
            {languages.map(l => (
              <button key={l} onClick={() => { setLanguage(l); haptic?.selection() }}
                className={`chip ${lang === l ? 'chip-active' : ''}`}>
                {langLabels[l] || l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button 
          className="w-full h-14 rounded-2xl border border-red-500/40 bg-red-500/10 flex items-center justify-center gap-2 text-red-400 font-semibold text-base active:scale-95 transition-transform"
          onClick={() => {
            haptic?.warning()
            if (window.confirm("Haqiqatan ham chiqmoqchimisiz? Barcha ma'lumotlaringiz qurilmadan o'chiriladi.")) {
              localStorage.clear()
              navigate('/', { replace: true })
            }
          }}
        >
          <LogOut size={18} /> Chiqish
        </button>
      </div>
      <BottomNav role="student" />
    </div>
  )
}
