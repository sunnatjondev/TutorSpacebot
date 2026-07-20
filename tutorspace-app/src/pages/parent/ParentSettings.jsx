import { useNavigate } from 'react-router-dom'
import { Globe, Trash2, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.jsx'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { deleteUserAccount } from '../../lib/backend'

export default function ParentSettings() {
  const { user, haptic, tg } = useTelegram()
  const { t, lang, setLanguage, languages } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleDeleteAccount = async () => {
    haptic?.heavy?.()
    const confirmText = lang === 'ru' 
      ? 'Вы уверены, что хотите НАВСЕГДА удалить свой родительский аккаунт? Связи с вашими детьми будут стерты.'
      : 'Hisobingizni o\'chirib tashlamoqchimisiz? Farzandlaringiz bilan aloqalar o\'chirib yuboriladi.'
      
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

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Ata-ona / Родитель'
  const langLabels = { uz: 'UZ', ru: 'RU' }

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
            <p className="m3-title-lg">{fullName}</p>
            {user?.username && <p className="text-on-surface-variant text-sm">@{user.username}</p>}
            <p className="text-on-surface-variant text-[10px] mt-1 bg-surface-high/60 px-2 py-0.5 rounded-full inline-block font-bold">
              👨‍👩‍👦 {lang === 'ru' ? 'Родитель' : 'Ota-ona'}
            </p>
            <p className="text-on-surface-variant text-xs mt-2">{t('teacherSettings.syncedTelegram')}</p>
          </div>
        </div>

        {/* Appearance (Theme) */}
        <div className="m3-card">
          <p className="font-bold text-on-surface mb-3 flex items-center gap-2">
            {theme === 'dark' ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />} 
            {lang === 'ru' ? 'Тема (Внешний вид)' : 'Mavzu (Tashqi ko\'rinish)'}
          </p>
          <div className="flex gap-2">
            <button onClick={() => { if (theme !== 'light') { toggleTheme(); haptic?.selection() } }}
              className={`chip flex-1 flex justify-center items-center gap-2 transition-all duration-200 ${
                theme === 'light'
                  ? 'bg-brand text-on-primary font-bold shadow-glow-sm scale-105'
                  : 'bg-surface-high text-on-surface-variant'
              }`}>
              <Sun size={14} /> {lang === 'ru' ? 'Светлая' : 'Yorug\''}
            </button>
            <button onClick={() => { if (theme !== 'dark') { toggleTheme(); haptic?.selection() } }}
              className={`chip flex-1 flex justify-center items-center gap-2 transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-brand text-on-primary font-bold shadow-glow-sm scale-105'
                  : 'bg-surface-high text-on-surface-variant'
              }`}>
              <Moon size={14} /> {lang === 'ru' ? 'Тёмная' : 'Qorong\'u'}
            </button>
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

        {/* Delete Account */}
        <div className="pt-2">
          <button 
            className="w-full h-14 rounded-2xl border border-red-500/30 bg-red-500/5 flex items-center justify-center gap-2 text-red-400 font-semibold text-base active:scale-95 transition-transform"
            onClick={handleDeleteAccount}
          >
            <Trash2 size={18} /> {lang === 'ru' ? 'Удалить аккаунт' : 'Hisobni o\'chirish'}
          </button>
        </div>
      </div>
      <BottomNav role="parent" />
    </div>
  )
}
