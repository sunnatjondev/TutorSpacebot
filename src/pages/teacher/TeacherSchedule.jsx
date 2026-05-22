import React, { useState } from 'react'
import { CalendarDays, Plus, Play, CheckCircle, Users } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { useTeacherSchedule } from '../../hooks/useSupabaseData'

function getDayDates(baseDate = new Date()) {
  const day = baseDate.getDay()
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - ((day === 0 ? 7 : day) - 1))

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date
  })
}

export default function TeacherSchedule() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const today = new Date()
  const [selectedDay, setSelectedDay] = useState(today.getDay() === 0 ? 6 : today.getDay() - 1)
  const days = getDayDates(today)
  const dayKeys = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const weekLabel = `${days[0].toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })} - ${days[6].toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}`

  const weekStart = days[0]
  const { data: sessions } = useTeacherSchedule(user?.id, weekStart)

  const selectedDayKey = days[selectedDay]?.toDateString()
  const displaySessions = (sessions || []).filter(
    (session) => session.scheduled_at && new Date(session.scheduled_at).toDateString() === selectedDayKey
  )

  const formatTime = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[28px] font-extrabold text-on-surface">{t('teacherSchedule.title')}</h1>
            <p className="text-on-surface-variant text-sm">{weekLabel}</p>
          </div>
          <button className="w-11 h-11 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center active:scale-90 transition-transform">
            <CalendarDays size={18} className="text-on-surface-variant" />
          </button>
        </div>

        <div className="card flex items-center justify-between gap-1 p-3 mb-5">
          {dayKeys.map((dayKey, index) => {
            const date = days[index]
            const isToday = date.toDateString() === today.toDateString()
            const isSelected = index === selectedDay

            return (
              <button
                key={dayKey}
                onClick={() => {
                  setSelectedDay(index)
                  haptic?.selection()
                }}
                className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 px-0.5 rounded-2xl transition-all duration-200 ${
                  isSelected ? 'bg-brand' : isToday ? 'bg-surface-high' : ''
                }`}
              >
                <span className={`text-[9px] font-bold tracking-wide ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>
                  {t(`days.${dayKey}`)}
                </span>
                <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-on-surface'}`}>
                  {date.getDate()}
                </span>
                {isToday && !isSelected && <span className="w-1 h-1 rounded-full bg-brand mt-0.5" />}
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          {displaySessions.length > 0 ? (
            displaySessions.map((lesson, index) => {
              const time = formatTime(lesson.scheduled_at)
              const name = lesson.group?.name || '—'
              const subject = lesson.group?.subject || '—'
              const studentCount = lesson.attendance?.[0]?.count ?? 0
              const duration = lesson.duration_min ? `${lesson.duration_min} min` : ''

              return (
                <div key={lesson.id} className="flex gap-3 stagger-item" style={{ animationDelay: `${index * 80}ms` }}>
                  <div className="w-14 pt-3 flex-shrink-0">
                    <p className="text-on-surface-variant text-xs font-semibold">{time}</p>
                  </div>
                  <div
                    className={`flex-1 rounded-card p-4 border transition-all duration-200 ${
                      lesson.status !== 'done' ? 'bg-surface-container border-brand/30' : 'bg-surface-container border-outline-variant'
                    }`}
                    style={lesson.status !== 'done' ? { boxShadow: '0 0 0 1px rgba(108,99,255,0.2)' } : {}}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full max-w-[150px] truncate ${
                          lesson.status !== 'done' ? 'bg-brand/20 text-primary' : 'bg-surface-high text-on-surface-variant'
                        }`}
                      >
                        {subject}
                      </span>
                      {lesson.status === 'done' ? (
                        <CheckCircle size={16} className="text-paid-green shrink-0" />
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-on-surface-variant shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          {t('common.upcoming')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-on-surface text-base mb-2 truncate">{name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                        <Users size={12} /> {studentCount} {t('teacherSchedule.students')} {duration ? `• ${duration}` : ''}
                      </span>
                      {lesson.status !== 'done' && (
                        <button
                          onClick={() => haptic?.medium()}
                          className="w-9 h-9 rounded-full bg-brand flex items-center justify-center active:scale-90 transition-transform shrink-0"
                        >
                          <Play size={14} className="text-white fill-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-10 text-on-surface-variant">
              <CalendarDays size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Bu kun uchun darslar yo'q</p>
            </div>
          )}

          <div className="flex gap-3">
            <div className="w-14 pt-3 flex-shrink-0"></div>
            <button
              onClick={() => haptic?.light()}
              className="flex-1 rounded-card p-4 flex flex-col items-center justify-center gap-1 text-on-surface-variant border-2 border-dashed border-outline-variant hover:border-brand/50 transition-colors min-h-[80px]"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">{t('teacherSchedule.addLesson')}</span>
            </button>
          </div>
        </div>
      </div>
      <BottomNav role="teacher" />
    </div>
  )
}
