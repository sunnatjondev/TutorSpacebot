import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, BookOpen, ArrowRight } from 'lucide-react'
import { useTelegram } from '../hooks/useTelegram'
import { useI18n } from '../i18n/index.jsx'
import { saveUserRole } from '../hooks/useSupabaseData'

const LS_ROLE_KEY = 'ts_user_role'
const LS_TG_ID_KEY = 'ts_tg_id'

export default function RoleSelection() {
  const navigate = useNavigate()
  const { user, haptic } = useTelegram()
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

    // 1. Save to localStorage FIRST (always works, instant)
    if (user?.id) {
      localStorage.setItem(LS_ROLE_KEY, selected)
      localStorage.setItem(LS_TG_ID_KEY, String(user.id))
    }

    // 2. Also save to Supabase in background (best-effort)
    if (user?.id) {
      saveUserRole(user.id, selected).catch(e => console.warn('[Auth] Supabase role save:', e))
    }

    setSaving(false)
    navigate(selected === 'teacher' ? '/teacher/home' : '/student/home')
  }

  return (
    <div className="min-h-screen bg-surface-lowest flex flex-col items-center justify-between px-5 py-10 animate-fade-in">
      {/* Top Section */}
      <div className="flex flex-col items-center gap-6 mt-8">
        {/* Glowing Orb */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center orb-ring"
          style={{
            background: 'radial-gradient(circle at 40% 35%, #6C63FF, #2a0080)',
            border: '2px solid rgba(196, 80, 220, 0.5)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15), transparent)',
              border: '2px solid rgba(196, 80, 220, 0.6)',
            }}
          />
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
          className={`flex-1 rounded-card p-5 flex flex-col items-center gap-3 border-2 transition-all duration-300 active:scale-95 ${
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
          className={`flex-1 rounded-card p-5 flex flex-col items-center gap-3 border-2 transition-all duration-300 active:scale-95 ${
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
        className={`btn-primary mt-10 transition-all duration-300 ${!selected ? 'opacity-40' : ''}`}
      >
        {saving ? t('common.loading') : t('common.continue')}
        <ArrowRight size={18} />
      </button>
    </div>
  )
}
