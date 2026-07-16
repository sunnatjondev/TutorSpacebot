import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, ArrowRight } from 'lucide-react'
import { useTelegram } from '../hooks/useTelegram'
import { useI18n } from '../i18n/index.jsx'
import { saveUserRole } from '../hooks/api/auth'
import { LS_ROLE_KEY, LS_TG_ID_KEY } from '../lib/constants'

export default function RoleSelection() {
  const navigate = useNavigate()
  const { user, haptic, tg } = useTelegram()
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)

  const displayName = user?.first_name || 'User'

  const handleContinue = async () => {
    haptic?.medium()
    setSaving(true)

    const selectedRole = 'teacher'
    let finalRole = selectedRole

    if (user?.id) {
      try {
        const savedUser = await saveUserRole(user, selectedRole)
        finalRole = savedUser?.role || selectedRole
      } catch (error) {
        console.warn('[Auth] Supabase role save:', error)
        haptic?.error()
        const message = error?.message || "Tizimga kirib bo'lmadi. Iltimos, qayta urinib ko'ring."
        if (tg?.showAlert) {
          tg.showAlert(message)
        } else {
          alert(message)
        }
        setSaving(false)
        return
      }

      localStorage.setItem(LS_ROLE_KEY, finalRole)
      localStorage.setItem(LS_TG_ID_KEY, String(user.id))
    }

    setSaving(false)
    navigate('/teacher/home', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface-lowest flex flex-col items-center justify-between px-5 py-12 animate-fade-in">
      {/* Top Welcome Section */}
      <div className="flex flex-col items-center gap-6 mt-16 flex-1 justify-center">
        {/* Logo Icon Area */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-4">
          <div className="absolute inset-0 bg-brand/10 rounded-full animate-pulse-slow" />
          <div className="absolute inset-2 bg-gradient-to-tr from-brand to-brand-variant rounded-full opacity-20 blur-sm" />
          <div className="relative flex items-center justify-center w-16 h-16 bg-surface rounded-full shadow-glow-sm border border-brand/20">
            <GraduationCap size={36} className="text-brand" />
          </div>
        </div>

        <div className="text-center space-y-4 max-w-sm">
          <p className="text-primary font-bold text-sm tracking-wide uppercase">
            {t('role.greeting', { name: displayName })}
          </p>
          <h1 className="text-3xl font-extrabold text-on-surface leading-tight tracking-tight">
            {t('role.welcomeTitle')}
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {t('role.welcomeSubtitle')}
          </p>
        </div>
      </div>

      {/* Action Button Section */}
      <div className="w-full max-w-sm mt-8">
        <button
          onClick={handleContinue}
          disabled={saving}
          className="m3-btn-filled w-full py-4 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all duration-200"
        >
          <span>{saving ? t('common.loading') : t('role.getStarted')}</span>
          {!saving && <ArrowRight size={18} />}
        </button>
      </div>
    </div>
  )
}
