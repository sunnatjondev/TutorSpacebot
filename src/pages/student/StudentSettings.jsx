import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share2, LogOut, Bell, Globe } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'

export default function StudentSettings() {
  const { user, haptic } = useTelegram()
  const { t, lang, setLanguage, languages } = useI18n()
  const navigate = useNavigate()
  const [lessonReminders, setLessonReminders] = useState(true)
  const [paymentAlerts, setPaymentAlerts] = useState(false)

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={() => { onChange(!value); haptic?.selection() }}
      className={`toggle ${value ? 'bg-brand' : 'bg-surface-highest'}`}
    >
      <span className={`toggle-knob ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )

  const langLabels = { uz: 'UZ', ru: 'RU' }
  const displayName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Alex Johnson'

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <TopBar user={user} />
      <div className="page-wrapper px-4 pt-6 space-y-4">
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="relative">
            <Avatar name={displayName} size="xl" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#0088cc' }}>
              <span className="text-white text-[10px] font-bold">TG</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-on-surface">{displayName}</p>
            <p className="text-on-surface-variant text-sm">{t('teacherSettings.syncedTelegram')}</p>
          </div>
        </div>

        <div className="card space-y-4">
          <p className="font-bold text-on-surface flex items-center gap-2">
            <Bell size={16} className="text-primary" /> {t('teacherSettings.notifications')}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-on-surface text-sm">{t('teacherSettings.lessonReminders')}</p>
            <Toggle value={lessonReminders} onChange={setLessonReminders} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-on-surface text-sm">{t('teacherSettings.paymentAlerts')}</p>
            <Toggle value={paymentAlerts} onChange={setPaymentAlerts} />
          </div>
        </div>

        {/* Language switcher — REAL */}
        <div className="card">
          <p className="font-bold text-on-surface mb-3 flex items-center gap-2">
            <Globe size={16} className="text-primary" /> {t('teacherSettings.language')}
          </p>
          <div className="flex gap-2">
            {languages.map(l => (
              <button
                key={l}
                onClick={() => { setLanguage(l); haptic?.selection() }}
                className={`chip ${lang === l ? 'chip-active' : ''}`}
              >
                {langLabels[l] || l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => haptic?.light()} className="btn-primary" style={{ background: 'rgba(108,99,255,0.15)', boxShadow: 'none' }}>
          <Share2 size={18} className="text-primary" />
          <span className="text-primary">{t('teacherSettings.shareProfile')}</span>
        </button>
        <button onClick={() => { haptic?.warning(); navigate('/') }} className="btn-secondary border-error-container/50 text-error">
          <LogOut size={18} /> {t('teacherSettings.logout')}
        </button>
      </div>
      <BottomNav role="student" />
    </div>
  )
}
