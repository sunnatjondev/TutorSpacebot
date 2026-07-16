import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, Globe, Trash2 } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { upsertTelegramUser, updateNotificationPreferences } from '../../hooks/api/auth'
import { deleteUserAccount } from '../../lib/backend'

function NotificationToggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`toggle ${value ? 'bg-primary' : 'bg-surface-highest'}`}
    >
      <span className={`toggle-knob ${value ? 'translate-x-5 bg-on-primary' : 'translate-x-0 bg-outline'}`} />
    </button>
  )
}

export default function TeacherSettings() {
  const { user, haptic } = useTelegram()
  const { t, lang, setLanguage, languages } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: dbUser } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: () => upsertTelegramUser(),
    enabled: !!user?.id,
  })

  const [notificationOverrides, setNotificationOverrides] = useState({})
  const lessonReminders = notificationOverrides.lesson_reminders_enabled ?? dbUser?.lesson_reminders_enabled ?? true
  const paymentAlerts = notificationOverrides.payment_alerts_enabled ?? dbUser?.payment_alerts_enabled ?? true

  const mutation = useMutation({
    mutationFn: (payload) => updateNotificationPreferences(user.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] })
    }
  })

  const handleToggleLessonReminders = (value) => {
    haptic?.selection()
    setNotificationOverrides((current) => ({ ...current, lesson_reminders_enabled: value }))
    mutation.mutate({ lesson_reminders_enabled: value })
  }

  const handleTogglePaymentAlerts = (value) => {
    haptic?.selection()
    setNotificationOverrides((current) => ({ ...current, payment_alerts_enabled: value }))
    mutation.mutate({ payment_alerts_enabled: value })
  }

  const handleDeleteAccount = async () => {
    haptic?.heavy?.()
    const confirmText = lang === 'ru' 
      ? 'Вы уверены, что хотите НАВСЕГДА удалить свой аккаунт? Все ваши группы, студенты, уроки и платежи будут стерты безвозвратно.'
      : 'Hisobingizni BUTUNLAY o\'chirib tashlamoqchimisiz? Barcha guruhlaringiz, talabalaringiz, darslaringiz va to\'lovlaringiz qayta tiklanmaydigan qilib o\'chiriladi.'
      
    if (window.confirm(confirmText)) {
      try {
        await deleteUserAccount()
        localStorage.clear()
        navigate('/', { replace: true })
        haptic?.success?.()
      } catch (err) {
        haptic?.error?.()
        alert('Xatolik yuz berdi: ' + err.message)
      }
    }
  }

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'O\'qituvchi'
  const langLabels = { uz: 'UZ', ru: 'RU' }


  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="m3-display-md">{t('teacherSettings.title')}</h1>
        </div>

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
            <p className="m3-title-lg">{fullName}</p>
            {user?.username && <p className="text-on-surface-variant text-sm">@{user.username}</p>}
            <p className="text-on-surface-variant text-xs mt-0.5">{t('teacherSettings.syncedTelegram')}</p>
          </div>
        </div>





        {/* Subscription */}
        <div 
          className="m3-card space-y-2 active:scale-95 transition-transform cursor-pointer"
          onClick={() => { haptic?.selection(); navigate('/teacher/subscription') }}
        >
          <div className="flex justify-between items-center">
            <p className="font-bold text-on-surface flex items-center gap-2">
              <span className="text-xl">💳</span> {lang === 'ru' ? 'Подписка' : 'Obuna'}
            </p>
            <span className="text-primary font-bold">{lang === 'ru' ? 'Управление' : 'Boshqarish'} &rarr;</span>
          </div>
          <p className="text-sm text-on-surface-variant">
            {lang === 'ru' ? 'Управление тарифом и оплата' : 'Ta\'rifni boshqarish va to\'lov'}
          </p>
        </div>

        {/* Notifications */}
        <div className="m3-card space-y-4">
          <p className="font-bold text-on-surface flex items-center gap-2">
            <Bell size={16} className="text-primary" /> {t('teacherSettings.notifications')}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-on-surface text-sm">{t('teacherSettings.lessonReminders')}</p>
            <NotificationToggle value={lessonReminders} onChange={handleToggleLessonReminders} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-on-surface text-sm">{t('teacherSettings.paymentAlerts')}</p>
            <NotificationToggle value={paymentAlerts} onChange={handleTogglePaymentAlerts} />
          </div>
        </div>

        {/* Language */}
        <div className="m3-card">
          <p className="font-bold text-on-surface mb-3 flex items-center gap-2">
            <Globe size={16} className="text-primary" /> {t('teacherSettings.language')}
          </p>
          <div className="flex gap-2">
            {languages.map(l => (
              <button key={l} onClick={() => { setLanguage(l); haptic?.selection() }}
                className={`chip whitespace-nowrap transition-all duration-200 ${
                  lang === l
                    ? 'bg-brand text-on-primary font-bold shadow-glow-sm scale-105'
                    : 'bg-surface-high text-on-surface-variant'
                }`}>
                {langLabels[l] || l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button 
            className="w-full h-14 rounded-2xl border border-red-500/30 bg-red-500/5 flex items-center justify-center gap-2 text-red-400 font-semibold text-base active:scale-95 transition-transform"
            onClick={handleDeleteAccount}
          >
            <Trash2 size={18} /> {lang === 'ru' ? 'Удалить аккаунт' : 'Hisobni o\'chirish'}
          </button>
        </div>
      </div>
      
      <BottomNav role="teacher" />
    </div>
  )
}
