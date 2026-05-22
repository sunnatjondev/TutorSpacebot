import React, { useState, useEffect } from 'react'
import { CalendarDays, CheckCircle, BookOpen } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

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
  const [baseDate] = useState(() => new Date())
  const today = baseDate
  const [selectedDay, setSelectedDay] = useState(today.getDay() === 0 ? 6 : today.getDay() - 1)
  const [sessions, setSessions] = useState([])
  const days = getDayDates(today)

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) {
      setSessions([])
      return
    }

    async function load() {
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', user.id)
        .maybeSingle()

      if (!userRow) {
        setSessions([])
        return
      }

      const weekStart = days[0]
      const weekEnd = new Date(days[6])
      weekEnd.setHours(23, 59, 59, 999)

      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('student_id', userRow.id)

      const groupIds = (memberships || []).map((membership) => membership.group_id)
      if (!groupIds.length) {
        setSessions([])
        return
      }

      const { data: sessionRows } = await supabase
        .from('sessions')
        .select(`
          id,
          group_id,
          scheduled_at,
          duration_min,
          status,
          group:groups(name, subject, teacher:users!groups_teacher_id_fkey(first_name, last_name)),
          attendance(present, student_id)
        `)
        .in('group_id', groupIds)
        .gte('scheduled_at', weekStart.toISOString())
        .lte('scheduled_at', weekEnd.toISOString())
        .order('scheduled_at')

      setSessions(sessionRows || [])
    }

    load()
  }, [baseDate, user?.id])

  const selectedDate = days[selectedDay]
  const selectedDayKey = selectedDate?.toDateString()

  const daySessions = (sessions || [])
    .filter((session) => new Date(session.scheduled_at).toDateString() === selectedDayKey)
    .map((session) => {
      const attended = session.attendance?.some((item) => item.present)

      return {
        id: session.id,
        subject: session.group?.name || session.group?.subject || '—',
        teacher: session.group?.teacher
          ? `${session.group.teacher.first_name} ${session.group.teacher.last_name || ''}`.trim()
          : '—',
        time: new Date(session.scheduled_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        duration: session.duration_min ? `${session.duration_min} min` : '—',
        status: attended ? 'attended' : (session.status || 'upcoming'),
        hwDue: false,
      }
    })

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        <div className="mb-4">
          <h1 className="text-[28px] font-extrabold text-on-surface">{t('studentSchedule.title')}</h1>
          <p className="text-on-surface-variant text-sm">{t('studentSchedule.subtitle')}</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
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
                className={`flex-shrink-0 w-16 rounded-[20px] flex flex-col items-center py-3 gap-0.5 transition-all duration-200 ${
                  isSelected
                    ? 'bg-brand text-white shadow-glow-sm'
                    : 'bg-surface-container border border-outline-variant text-on-surface-variant'
                }`}
              >
                <span className="text-[10px] font-bold tracking-wide">{t(`days.${dayKey}`)}</span>
                <span className="text-xl font-extrabold">{date.getDate()}</span>
                {isToday && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />}
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          {daySessions.length > 0 ? (
            daySessions.map((lesson, index) => (
              <div
                key={lesson.id}
                className="rounded-card p-4 bg-surface-container stagger-item"
                style={{ ...statusStyle(lesson.status), animationDelay: `${index * 80}ms` }}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className={`font-bold text-base truncate pr-3 flex-1 ${lesson.status === 'attended' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                    {lesson.subject}
                  </h3>
                  <div className="text-right shrink-0">
                    <p className="text-on-surface text-sm font-bold">{lesson.time}</p>
                    <p className="text-on-surface-variant text-xs">{lesson.duration}</p>
                  </div>
                </div>
                <p className="text-on-surface-variant text-xs mb-3 flex items-center gap-1 truncate">
                  👤 {lesson.teacher}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {lesson.status === 'upcoming' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-brand/15 px-3 py-1 rounded-full border border-brand/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      {t('common.upcoming')}
                    </span>
                  )}
                  {lesson.status === 'attended' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-paid-green bg-paid-green/10 px-3 py-1 rounded-full border border-paid-green/20">
                      <CheckCircle size={12} /> {t('common.attended')}
                    </span>
                  )}
                  {lesson.hwDue && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-partial-orange bg-partial-orange/10 px-3 py-1 rounded-full border border-partial-orange/20">
                      <BookOpen size={12} /> {t('studentSchedule.hwDue')}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
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
