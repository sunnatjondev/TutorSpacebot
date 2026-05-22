import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Plus, Play, CheckCircle, Users } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Modal } from '../../components/ui/Modal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { createSession, useTeacherGroups, useTeacherSchedule } from '../../hooks/useSupabaseData'

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

function buildDefaultSessionDate(date) {
  const nextDate = new Date(date)
  nextDate.setHours(9, 0, 0, 0)
  return nextDate
}

function toDateTimeLocalValue(date) {
  const target = new Date(date)
  const timezoneOffset = target.getTimezoneOffset() * 60 * 1000
  return new Date(target.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function CreateLessonModal({ groups, initialDate, onClose, onCreated, haptic, t }) {
  const navigate = useNavigate()
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '')
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocalValue(buildDefaultSessionDate(initialDate)))
  const [durationMin, setDurationMin] = useState('90')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setScheduledAt(toDateTimeLocalValue(buildDefaultSessionDate(initialDate)))
  }, [initialDate])

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId('')
      return
    }

    setSelectedGroupId((currentValue) => {
      if (currentValue && groups.some((group) => group.id === currentValue)) return currentValue
      return groups[0].id
    })
  }, [groups])

  const handleCreate = async () => {
    if (!selectedGroupId || !scheduledAt) {
      setError(t('teacherSchedule.fillRequired'))
      haptic?.warning?.()
      return
    }

    setLoading(true)
    setError(null)
    haptic?.medium()

    const parsedDuration = Number.parseInt(durationMin, 10)
    const result = await createSession({
      groupId: selectedGroupId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMin: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 90,
    })

    setLoading(false)

    if (result.success) {
      haptic?.success?.()
      await onCreated()
      onClose()
      return
    }

    setError(result.error?.message || t('teacherSchedule.createError'))
    haptic?.warning?.()
  }

  if (!groups.length) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-outline-variant bg-level-1 px-4 py-5">
          <p className="text-sm font-semibold text-on-surface">{t('teacherSchedule.createGroupFirst')}</p>
          <p className="mt-2 text-sm text-on-surface-variant">{t('teacherSchedule.noGroups')}</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            haptic?.light?.()
            onClose()
            navigate('/teacher/groups')
          }}
        >
          {t('teacherGroups.createGroup')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-on-surface-variant">
          {t('teacherSchedule.selectGroup')}
        </label>
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => {
            const active = group.id === selectedGroupId

            return (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroupId(group.id)
                  haptic?.selection?.()
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                  active
                    ? 'border-brand bg-brand/15 text-on-surface'
                    : 'border-outline-variant bg-level-1 text-on-surface-variant'
                }`}
              >
                <div className="font-semibold">{group.name}</div>
                <div className="mt-1 text-xs">{group.subject || '-'}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-on-surface-variant">
          {t('teacherSchedule.lessonDate')}
        </label>
        <input
          type="datetime-local"
          className="input-field"
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-on-surface-variant">
          {t('teacherSchedule.duration')}
        </label>
        <input
          type="number"
          min="15"
          step="5"
          className="input-field"
          value={durationMin}
          onChange={(event) => setDurationMin(event.target.value)}
          placeholder="90"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <button className="btn-primary" onClick={handleCreate} disabled={loading}>
        {loading ? t('teacherSchedule.creating') : t('teacherSchedule.create')}
      </button>
    </div>
  )
}

export default function TeacherSchedule() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const today = new Date()
  const [selectedDay, setSelectedDay] = useState(today.getDay() === 0 ? 6 : today.getDay() - 1)
  const [showCreate, setShowCreate] = useState(false)
  const days = getDayDates(today)
  const dayKeys = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const weekLabel = `${days[0].toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })} - ${days[6].toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}`

  const weekStart = days[0]
  const { data: sessions, refetch } = useTeacherSchedule(user?.id, weekStart)
  const { data: groups } = useTeacherGroups(user?.id)

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
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold text-on-surface">{t('teacherSchedule.title')}</h1>
            <p className="text-sm text-on-surface-variant">{weekLabel}</p>
          </div>
          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant bg-surface-container active:scale-90 transition-transform">
            <CalendarDays size={18} className="text-on-surface-variant" />
          </button>
        </div>

        <div className="card mb-5 flex items-center justify-between gap-1 p-3">
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
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-0.5 py-1.5 transition-all duration-200 ${
                  isSelected ? 'bg-brand' : isToday ? 'bg-surface-high' : ''
                }`}
              >
                <span className={`text-[9px] font-bold tracking-wide ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>
                  {t(`days.${dayKey}`)}
                </span>
                <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-on-surface'}`}>
                  {date.getDate()}
                </span>
                {isToday && !isSelected && <span className="mt-0.5 h-1 w-1 rounded-full bg-brand" />}
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          {displaySessions.length > 0 ? (
            displaySessions.map((lesson, index) => {
              const time = formatTime(lesson.scheduled_at)
              const name = lesson.group?.name || '-'
              const subject = lesson.group?.subject || '-'
              const studentCount = lesson.attendance?.[0]?.count ?? 0
              const duration = lesson.duration_min ? `${lesson.duration_min} ${t('teacherSchedule.minutes')}` : ''

              return (
                <div key={lesson.id} className="stagger-item flex gap-3" style={{ animationDelay: `${index * 80}ms` }}>
                  <div className="w-14 flex-shrink-0 pt-3">
                    <p className="text-xs font-semibold text-on-surface-variant">{time}</p>
                  </div>
                  <div
                    className={`flex-1 rounded-card border p-4 transition-all duration-200 ${
                      lesson.status !== 'done' ? 'border-brand/30 bg-surface-container' : 'border-outline-variant bg-surface-container'
                    }`}
                    style={lesson.status !== 'done' ? { boxShadow: '0 0 0 1px rgba(108,99,255,0.2)' } : {}}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span
                        className={`max-w-[150px] truncate rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                          lesson.status !== 'done' ? 'bg-brand/20 text-primary' : 'bg-surface-high text-on-surface-variant'
                        }`}
                      >
                        {subject}
                      </span>
                      {lesson.status === 'done' ? (
                        <CheckCircle size={16} className="shrink-0 text-paid-green" />
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 text-[10px] text-on-surface-variant">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          {t('common.upcoming')}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-2 truncate text-base font-bold text-on-surface">{name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <Users size={12} /> {studentCount} {t('teacherSchedule.students')} {duration ? ` - ${duration}` : ''}
                      </span>
                      {lesson.status !== 'done' && (
                        <button
                          onClick={() => haptic?.medium()}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand active:scale-90 transition-transform"
                        >
                          <Play size={14} className="fill-white text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-10 text-center text-on-surface-variant">
              <CalendarDays size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t('teacherSchedule.noLessons')}</p>
            </div>
          )}

          <div className="flex gap-3">
            <div className="w-14 flex-shrink-0 pt-3"></div>
            <button
              onClick={() => {
                haptic?.light()
                setShowCreate(true)
              }}
              className="flex min-h-[80px] flex-1 flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-outline-variant p-4 text-on-surface-variant transition-colors hover:border-brand/50"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">{t('teacherSchedule.addLesson')}</span>
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t('teacherSchedule.createTitle')}>
        <CreateLessonModal
          groups={groups || []}
          initialDate={days[selectedDay] || today}
          onClose={() => setShowCreate(false)}
          onCreated={refetch}
          haptic={haptic}
          t={t}
        />
      </Modal>

      <BottomNav role="teacher" />
    </div>
  )
}
