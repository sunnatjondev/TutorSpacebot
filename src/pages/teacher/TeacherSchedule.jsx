import React, { useState } from 'react'
import { CalendarDays, Plus, Play, CheckCircle, Users } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { BottomNav } from '../../components/layout/BottomNav'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { mockSchedule } from '../../data/mockData'

function getDayDates(baseDate = new Date()) {
  const day = baseDate.getDay()
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - ((day === 0 ? 7 : day) - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function TeacherSchedule() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const today = new Date()
  const [selectedDay, setSelectedDay] = useState(today.getDay() === 0 ? 6 : today.getDay() - 1)
  const days = getDayDates(today)

  const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

  const weekLabel = `${days[0].toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}`

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <TopBar user={user} />

      <div className="page-wrapper px-4 pt-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[28px] font-extrabold text-on-surface">{t('teacherSchedule.title')}</h1>
            <p className="text-on-surface-variant text-sm">{weekLabel}</p>
          </div>
          <button className="w-11 h-11 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center active:scale-90 transition-transform">
            <CalendarDays size={18} className="text-on-surface-variant" />
          </button>
        </div>

        {/* Week Strip */}
        <div className="card flex items-center justify-between gap-1 p-3 mb-5">
          {DAY_KEYS.map((dk, i) => {
            const date = days[i]
            const isToday = date.toDateString() === today.toDateString()
            const isSelected = i === selectedDay
            return (
              <button
                key={dk}
                onClick={() => { setSelectedDay(i); haptic?.selection() }}
                className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 px-1 rounded-2xl transition-all duration-200 ${
                  isSelected ? 'bg-brand' : isToday ? 'bg-surface-high' : ''
                }`}
              >
                <span className={`text-[10px] font-bold tracking-wide ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>
                  {t(`days.${dk}`)}
                </span>
                <span className={`text-base font-bold ${isSelected ? 'text-white' : 'text-on-surface'}`}>
                  {date.getDate()}
                </span>
                {isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-brand mt-0.5" />
                )}
              </button>
            )
          })}
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {mockSchedule.map((lesson, i) => (
            <div key={lesson.id} className="flex gap-3 stagger-item" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-14 pt-3 flex-shrink-0">
                <p className="text-on-surface-variant text-xs font-semibold">{lesson.time}</p>
              </div>
              <div
                className={`flex-1 rounded-card p-4 border transition-all duration-200 ${
                  lesson.status === 'upcoming'
                    ? 'bg-surface-container border-brand/30'
                    : 'bg-surface-container border-outline-variant'
                }`}
                style={lesson.status === 'upcoming' ? { boxShadow: '0 0 0 1px rgba(108,99,255,0.2)' } : {}}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${
                    lesson.status === 'upcoming' ? 'bg-brand/20 text-primary' : 'bg-surface-high text-on-surface-variant'
                  }`}>
                    {lesson.subject}
                  </span>
                  {lesson.status === 'done' ? (
                    <CheckCircle size={16} className="text-paid-green" />
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      {t('common.upcoming')}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-on-surface text-base mb-2">{lesson.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                    <Users size={12} /> {lesson.students} {t('teacherSchedule.students')} • {lesson.duration}
                  </span>
                  {lesson.status === 'upcoming' && (
                    <button
                      onClick={() => haptic?.medium()}
                      className="w-9 h-9 rounded-full bg-brand flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Play size={14} className="text-white fill-white" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add Lesson */}
          <div className="flex gap-3">
            <div className="w-14 pt-3 flex-shrink-0">
              <p className="text-on-surface-variant text-xs font-semibold">11:00</p>
            </div>
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
