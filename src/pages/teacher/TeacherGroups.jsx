import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, CalendarDays } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { BottomNav } from '../../components/layout/BottomNav'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { mockGroups } from '../../data/mockData'

export default function TeacherGroups() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <TopBar user={user} />

      <div className="page-wrapper px-4 pt-5">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[28px] font-extrabold text-on-surface">{t('teacherGroups.title')}</h1>
          <button
            className="w-11 h-11 rounded-full flex items-center justify-center text-white"
            style={{
              background: 'linear-gradient(135deg, #6C63FF, #4f44e2)',
              boxShadow: '0 4px 16px rgba(108,99,255,0.4)',
            }}
            onClick={() => haptic?.medium()}
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {mockGroups.map((group, i) => (
            <button
              key={group.id}
              className="card w-full text-left stagger-item transition-all duration-200 active:scale-[0.98] hover:border-brand/40"
              style={{ animationDelay: `${i * 70}ms` }}
              onClick={() => {
                haptic?.light()
                navigate(`/teacher/groups/${group.id}`)
              }}
            >
              {/* Subject + student count chips */}
              <div className="flex items-center gap-2 mb-3">
                <span className="chip chip-active text-[11px] font-bold py-1 px-3">
                  {group.subject}
                </span>
                <span className="chip text-xs">
                  <Users size={12} /> {group.students} {t('teacherGroups.students')}
                </span>
              </div>

              {/* Name */}
              <h2 className="text-xl font-bold text-on-surface mb-3">{group.name}</h2>

              {/* Next lesson */}
              <div className="flex items-center gap-3 bg-surface-high rounded-2xl p-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
                  <CalendarDays size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-on-surface-variant text-xs font-medium">
                    {t('teacherGroups.nextLesson')}
                  </p>
                  <p className={`font-semibold text-sm ${
                    group.nextLesson.startsWith('Bugun') ? 'text-primary' : 'text-on-surface'
                  }`}>
                    {group.nextLesson}
                  </p>
                </div>
              </div>

              {/* Payment progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-on-surface-variant">
                    {t('teacherGroups.paymentProgress')}
                  </span>
                  <span className="text-xs font-bold text-on-surface">
                    {group.paidPercent}{t('teacherGroups.paidPercent')}
                  </span>
                </div>
                <ProgressBar value={group.paidPercent} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav role="teacher" />
    </div>
  )
}
