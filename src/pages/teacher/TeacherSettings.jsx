import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share2, LogOut, Plus, X, Bell, Globe, Star } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'

export default function TeacherSettings() {
  const { user, haptic } = useTelegram()
  const { t, lang, setLanguage, languages } = useI18n()
  const navigate = useNavigate()
  const [lessonReminders, setLessonReminders] = useState(true)
  const [paymentAlerts, setPaymentAlerts] = useState(true)
  const [coTeachers, setCoTeachers] = useState([])

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'O\'qituvchi'
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

        {/* Plan */}
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-brand/20 flex items-center justify-center">
            <Star size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-on-surface truncate">{t('teacherSettings.currentPlan', { plan: 'Basic' })}</p>
            <p className="text-on-surface-variant text-xs">{t('teacherSettings.freeTier')}</p>
          </div>
          <button onClick={() => haptic?.medium()}
            className="bg-brand/20 text-primary text-xs font-bold px-3 py-2 rounded-full border border-brand/30 active:scale-95 transition-transform shrink-0">
            {t('common.upgrade')}
          </button>
        </div>

        {/* Co-teachers */}
        <div className="card space-y-3">
          <p className="font-bold text-on-surface">{t('teacherSettings.coTeachers')}</p>
          {coTeachers.map((tt, i) => (
            <div key={i} className="flex items-center gap-3">
              <Avatar name={tt.name} size="sm" />
              <p className="flex-1 text-on-surface text-sm font-medium truncate">{tt.name}</p>
              <button onClick={() => setCoTeachers(prev => prev.filter((_, j) => j !== i))}
                className="w-7 h-7 rounded-full bg-surface-high flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform">
                <X size={14} />
              </button>
            </div>
          ))}
          {coTeachers.length > 0 && <hr className="divider" />}
          <button className="w-full flex items-center justify-center gap-2 h-11 rounded-full border border-outline-variant text-on-surface-variant text-sm font-medium active:scale-95 transition-transform">
            <Plus size={16} /> {t('teacherSettings.addTeacher')}
          </button>
        </div>

        {/* Notifications */}
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

        <button onClick={() => haptic?.light()} className="btn-primary"
          style={{ background: 'rgba(108,99,255,0.15)', boxShadow: 'none' }}>
          <Share2 size={18} className="text-primary" />
          <span className="text-primary">{t('teacherSettings.shareProfile')}</span>
        </button>

        <button 
          className="w-full h-14 rounded-2xl border border-red-500/40 bg-red-500/10 flex items-center justify-center gap-2 text-red-400 font-semibold text-base active:scale-95 transition-transform"
          onClick={() => {
            haptic?.warning()
            localStorage.clear()
            navigate('/', { replace: true })
          }}
        >
          <LogOut size={18} /> Chiqish
        </button>
      </div>
      
      <BottomNav role="teacher" />
    </div>
  )
}
