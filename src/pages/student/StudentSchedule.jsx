import React, { useState } from 'react'
import { CalendarDays, CheckCircle, BookOpen } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { useStudentSchedule } from '../../hooks/api/useStudent'

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

function statusStyle(status) {
  switch (status) {
    case 'attended':
      return { border: '2px solid rgba(74,222,128,0.4)', borderLeft: '4px solid #4ade80' }
    case 'in_progress':
      return { border: '2px solid rgba(74,222,128,0.3)', borderLeft: '4px solid #4ade80' }
    case 'upcoming':
      return { border: '2px solid rgba(108,99,255,0.3)', borderLeft: '4px solid #6C63FF' }
    default:
      return { border: '1px solid rgba(70,69,85,0.6)' }
  }
}

const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export default function StudentSchedule() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const [baseDate, setBaseDate] = useState(() => new Date())
  const today = new Date()
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })
  const days = getDayDates(baseDate)
  const weekStartKey = days[0].getTime()
  const { data: sessions } = useStudentSchedule(user?.id, weekStartKey)

  const selectedDate = days[selectedDay]
  const selectedDayKey = selectedDate?.toDateString()

  const daySessions = (sessions || [])
    .filter((session) => new Date(session.scheduled_at).toDateString() === selectedDayKey)
    .map((session) => {
      const attended = session.attendance?.some((item) => item.present)

      return {
        id: session.id,
        subject: session.group?.name || session.group?.subject || '-',
        teacher: session.group?.teacher
          ? `${session.group.teacher.first_name} ${session.group.teacher.last_name || ''}`.trim()
          : '-',
        time: new Date(session.scheduled_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        duration: session.duration_min ? `${session.duration_min} min` : '-',
        status: attended ? 'attended' : (session.status || 'upcoming'),
        hwDue: false,
      }
    })

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold text-on-surface">{t('studentSchedule.title')}</h1>
            <p className="text-on-surface-variant text-sm">{t('studentSchedule.subtitle')}</p>
          </div>
          <button
            onClick={() => document.getElementById('student-schedule-date-picker')?.showPicker?.() || document.getElementById('student-schedule-date-picker')?.click()}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant bg-surface-container active:scale-90 transition-transform shrink-0"
          >
            <CalendarDays size={18} className="text-on-surface-variant" />
          </button>
          <input
            type="date"
            id="student-schedule-date-picker"
            className="hidden"
            onChange={(event) => {
              if (event.target.value) {
                const selected = new Date(event.target.value)
                setBaseDate(selected)
                const day = selected.getDay()
                setSelectedDay(day === 0 ? 6 : day - 1)
              }
            }}
          />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {DAY_KEYS.map((dayKey, index) => {
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
                className={`flex w-16 flex-shrink-0 flex-col items-center gap-0.5 rounded-[20px] py-3 transition-all duration-200 ${
                  isSelected
                    ? 'bg-brand text-white shadow-glow-sm'
                    : 'border border-outline-variant bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="text-[10px] font-bold tracking-wide">{t(`days.${dayKey}`)}</span>
                <span className="text-xl font-extrabold">{date.getDate()}</span>
                {isToday && !isSelected && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          {daySessions.length > 0 ? (
            daySessions.map((lesson, index) => (
              <div
                key={lesson.id}
                className="stagger-item rounded-card bg-surface-container p-4"
                style={{ ...statusStyle(lesson.status), animationDelay: `${index * 80}ms` }}
              >
                <div className="mb-1 flex items-start justify-between">
                  <h3 className={`flex-1 truncate pr-3 text-base font-bold ${lesson.status === 'attended' ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                    {lesson.subject}
                  </h3>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-on-surface">{lesson.time}</p>
                    <p className="text-xs text-on-surface-variant">{lesson.duration}</p>
                  </div>
                </div>
                <p className="mb-3 truncate text-xs text-on-surface-variant">
                  O'qituvchi: {lesson.teacher}
                </p>
                <div className="flex flex-wrap gap-2">
                  {lesson.status === 'upcoming' && (
                    <span className="flex items-center gap-1 rounded-full border border-brand/25 bg-brand/15 px-3 py-1 text-xs font-semibold text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      {t('common.upcoming')}
                    </span>
                  )}
                  {lesson.status === 'in_progress' && (
                    <span className="flex items-center gap-1 rounded-full border border-paid-green/20 bg-paid-green/10 px-3 py-1 text-xs font-semibold text-paid-green">
                      <span className="h-1.5 w-1.5 rounded-full bg-paid-green" />
                      {t('common.inProgress')}
                    </span>
                  )}
                  {lesson.status === 'attended' && (
                    <span className="flex items-center gap-1 rounded-full border border-paid-green/20 bg-paid-green/10 px-3 py-1 text-xs font-semibold text-paid-green">
                      <CheckCircle size={12} /> {t('common.attended')}
                    </span>
                  )}
                  {lesson.hwDue && (
                    <span className="flex items-center gap-1 rounded-full border border-partial-orange/20 bg-partial-orange/10 px-3 py-1 text-xs font-semibold text-partial-orange">
                      <BookOpen size={12} /> {t('studentSchedule.hwDue')}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
              <CalendarDays size={44} className="opacity-25" />
              <p className="text-sm font-medium">{t('studentSchedule.noClasses')}</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav role="student" />
    </div>
  )
}
