import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, BookOpen, ArrowRight } from 'lucide-react'
import { useTelegram } from '../hooks/useTelegram'
import { useI18n } from '../i18n/index.jsx'
import { saveUserRole } from '../hooks/api/auth'
import { LS_ROLE_KEY, LS_TG_ID_KEY } from '../lib/constants'

export default function RoleSelection() {
  const navigate = useNavigate()
  const { user, haptic, tg } = useTelegram()
  const { t } = useI18n()
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const displayName = user?.first_name || 'User'

  const handleSelect = (role) => {
    setSelected(role)
    haptic?.selection()
  }

  const handleContinue = async () => {
    if (!selected) return
    haptic?.medium()
    setSaving(true)

    let finalRole = selected

    if (user?.id) {
      try {
        const savedUser = await saveUserRole(user, selected)
        finalRole = savedUser?.role || selected
      } catch (error) {
        console.warn('[Auth] Supabase role save:', error)
        haptic?.error()
        const message = error?.message || "Rolni saqlab bo'lmadi. Iltimos, qayta urinib ko'ring."
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
    navigate(finalRole === 'teacher' ? '/teacher/home' : '/student/home', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface-lowest flex flex-col items-center justify-between px-5 py-10 animate-fade-in">
      {/* Top Section */}
      <div className="flex flex-col items-center gap-6 mt-8">
        {/* Logo / Icon Area */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-2">
          <div className="absolute inset-0 bg-brand/10 rounded-full animate-pulse-slow" />
          <div className="absolute inset-2 bg-gradient-to-tr from-brand to-brand-variant rounded-full opacity-20 blur-sm" />
          <div className="relative flex items-center justify-center w-16 h-16 bg-surface rounded-full shadow-glow-sm border border-brand/20">
            <GraduationCap size={32} className="text-brand" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-primary font-semibold text-base mb-1">
            {t('role.greeting', { name: displayName })}
          </p>
          <h1 className="text-[32px] font-extrabold text-on-surface leading-tight tracking-tight">
            {t('role.question')}
          </h1>
          <p className="text-on-surface-variant text-sm mt-2 leading-relaxed max-w-xs">
            {t('role.subtitle')}
          </p>
        </div>
      </div>

      {/* Role Cards */}
      <div className="flex gap-4 w-full mt-8">
          <button
            onClick={() => handleSelect('teacher')}
            className={`flex-1 rounded-[24px] p-5 flex flex-col items-center gap-3 border-2 transition-all duration-300 active:scale-95 ${
              selected === 'teacher'
                ? 'border-brand bg-brand/10'
                : 'border-outline-variant bg-surface-container'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              selected === 'teacher' ? 'bg-brand/20' : 'bg-surface-high'
            }`}>
              <GraduationCap size={24} className={selected === 'teacher' ? 'text-primary' : 'text-on-surface-variant'} />
            </div>
            <div className="text-center">
              <p className="font-bold text-on-surface text-lg">{t('role.teacher')}</p>
              <p className="text-on-surface-variant text-xs mt-1 leading-snug">{t('role.teacherDesc')}</p>
            </div>
          </button>

        <button
          onClick={() => handleSelect('student')}
          className={`flex-1 rounded-[24px] p-5 flex flex-col items-center gap-3 border-2 transition-all duration-300 active:scale-95 ${
            selected === 'student'
              ? 'border-brand bg-brand/10'
              : 'border-outline-variant bg-surface-container'
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            selected === 'student' ? 'bg-brand/20' : 'bg-surface-high'
          }`}>
            <BookOpen size={24} className={selected === 'student' ? 'text-primary' : 'text-on-surface-variant'} />
          </div>
          <div className="text-center">
            <p className="font-bold text-on-surface text-lg">{t('role.student')}</p>
            <p className="text-on-surface-variant text-xs mt-1 leading-snug">{t('role.studentDesc')}</p>
          </div>
        </button>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!selected || saving}
        className={`m3-btn-filled mt-10 transition-all duration-300 ${!selected ? 'opacity-40' : ''}`}
      >
        {saving ? t('common.loading') : t('common.continue')}
        <ArrowRight size={18} />
      </button>
    </div>
  )
}
