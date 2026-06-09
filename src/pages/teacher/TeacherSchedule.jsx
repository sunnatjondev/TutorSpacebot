import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Plus, Play, CheckCircle, Users, Trash2, Square } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Modal } from '../../components/ui/Modal'
import { CustomDatePickerModal } from '../../components/ui/CustomDatePickerModal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { useCreateSession, useDeleteSession, useUpdateSessionStatus, useTeacherGroups, useTeacherSchedule } from '../../hooks/api/useTeacher'

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

function CreateLessonModal({ groups, initialDate, onClose, onCreated, haptic, t }) {
  const navigate = useNavigate()
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '')
  const [lessonDate, setLessonDate] = useState(() => new Date(initialDate || new Date()))
  const [lessonHour, setLessonHour] = useState('09')
  const [lessonMinute, setLessonMinute] = useState('00')
  const [showLessonCalendar, setShowLessonCalendar] = useState(false)
  const [durationMin, setDurationMin] = useState('90')
  const [repeat, setRepeat] = useState('none')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLessonDate(new Date(initialDate || new Date()))
  }, [initialDate])

  const formatDisplayDate = (date) => {
    if (!date) return ''
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
  }

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

  const createSessionMutation = useCreateSession()

  const handleCreate = async () => {
    if (!selectedGroupId || !lessonDate) {
      setError(t('teacherSchedule.fillRequired'))
      haptic?.warning?.()
      return
    }

    setLoading(true)
    setError(null)
    haptic?.medium()

    const parsedDuration = Number.parseInt(durationMin, 10)
    const dur = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 90

    const datesToCreate = []
    const baseDate = new Date(lessonDate)
    baseDate.setHours(Number(lessonHour), Number(lessonMinute), 0, 0)
    
    if (repeat === 'none') {
      datesToCreate.push(baseDate)
    } else {
      const day = baseDate.getDay()
      const monday = new Date(baseDate)
      monday.setDate(baseDate.getDate() - ((day === 0 ? 7 : day) - 1))
      
      const targetDays = repeat === 'odd' ? [0, 2, 4] : [1, 3, 5]
      
      for (const offset of targetDays) {
        const newDate = new Date(monday)
        newDate.setDate(monday.getDate() + offset)
        newDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0)
        datesToCreate.push(newDate)
      }
    }

    let allSuccess = true
    for (const d of datesToCreate) {
      try {
        await createSessionMutation.mutateAsync({
          groupId: selectedGroupId,
          scheduledAt: d.toISOString(),
          durationMin: dur,
        })
      } catch (err) {
        allSuccess = false
      }
    }

    setLoading(false)

    if (allSuccess) {
      haptic?.success?.()
      await onCreated()
      onClose()
      return
    }

    setError(t('teacherSchedule.createError'))
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
    <>
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
          <button
            type="button"
            onClick={() => { haptic?.light(); setShowLessonCalendar(true) }}
            className="input-field w-full text-left flex items-center justify-between"
          >
            <span className="text-on-surface">
              {formatDisplayDate(lessonDate)}, {lessonHour}:{lessonMinute}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm text-on-surface-variant">Vaqt:</span>
            <div className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2">
              <input
                type="number"
                min="0" max="23"
                value={lessonHour}
                onChange={(e) => setLessonHour(String(e.target.value).padStart(2, '0'))}
                className="w-10 text-center bg-transparent text-on-surface text-sm font-bold outline-none"
              />
              <span className="text-on-surface font-bold">:</span>
              <input
                type="number"
                min="0" max="59"
                value={lessonMinute}
                onChange={(e) => setLessonMinute(String(e.target.value).padStart(2, '0'))}
                className="w-10 text-center bg-transparent text-on-surface text-sm font-bold outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-on-surface-variant">Takrorlash</label>
          <div className="flex gap-2">
            <button onClick={() => { setRepeat('none'); haptic?.selection() }} className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${repeat === 'none' ? 'bg-brand/20 border-brand text-primary' : 'bg-surface-high border-outline-variant text-on-surface-variant'}`}>Faqat shu kun</button>
            <button onClick={() => { setRepeat('odd'); haptic?.selection() }} className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${repeat === 'odd' ? 'bg-brand/20 border-brand text-primary' : 'bg-surface-high border-outline-variant text-on-surface-variant'}`}>Toq kunlar</button>
            <button onClick={() => { setRepeat('even'); haptic?.selection() }} className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${repeat === 'even' ? 'bg-brand/20 border-brand text-primary' : 'bg-surface-high border-outline-variant text-on-surface-variant'}`}>Juft kunlar</button>
          </div>
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

      <CustomDatePickerModal
        isOpen={showLessonCalendar}
        onClose={() => setShowLessonCalendar(false)}
        selectedDate={lessonDate}
        onSelectDate={(date) => { setLessonDate(date); setShowLessonCalendar(false) }}
        haptic={haptic}
        t={t}
      />
    </>
  )
}

export default function TeacherSchedule() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const [baseDate, setBaseDate] = useState(() => new Date())
  const today = new Date()
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })
  const [showCreate, setShowCreate] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [processingSessionId, setProcessingSessionId] = useState(null)
  const days = getDayDates(baseDate)
  const dayKeys = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const weekLabel = `${days[0].toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })} - ${days[6].toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}`

  const weekStart = days[0]
  const weekStartKey = weekStart.getTime()
  const { data: sessions, refetch } = useTeacherSchedule(user?.id, weekStartKey)
  const { data: groups } = useTeacherGroups(user?.id)

  const selectedDayKey = days[selectedDay]?.toDateString()
  const displaySessions = (sessions || []).filter(
    (session) => session.scheduled_at && new Date(session.scheduled_at).toDateString() === selectedDayKey
  )

  const formatTime = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusLabel = (status) => {
    if (status === 'done') return t('common.done')
    if (status === 'ongoing') return t('common.inProgress')
    return t('common.upcoming')
  }

  const updateSessionStatusMutation = useUpdateSessionStatus()
  const deleteSessionMutation = useDeleteSession()

  const handleStartLesson = async (sessionId) => {
    setProcessingSessionId(sessionId)
    haptic?.medium()
    try {
      await updateSessionStatusMutation.mutateAsync({ sessionId, status: 'ongoing' })
      haptic?.success?.()
      refetch()
    } catch (err) {
      haptic?.error?.()
    } finally {
      setProcessingSessionId(null)
    }
  }

  const handleFinishLesson = async (sessionId) => {
    setProcessingSessionId(sessionId)
    haptic?.medium()
    try {
      await updateSessionStatusMutation.mutateAsync({ sessionId, status: 'done' })
      haptic?.success?.()
      refetch()
    } catch (err) {
      haptic?.error?.()
    } finally {
      setProcessingSessionId(null)
    }
  }

  const handleDeleteLesson = async (sessionId) => {
    haptic?.heavy?.()
    if (!confirm(t('teacherSchedule.deleteConfirm'))) return

    setProcessingSessionId(sessionId)
    try {
      await deleteSessionMutation.mutateAsync(sessionId)
      haptic?.success?.()
      refetch()
    } catch (err) {
      haptic?.error?.()
    } finally {
      setProcessingSessionId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold text-on-surface">{t('teacherSchedule.title')}</h1>
            <p className="text-sm text-on-surface-variant">{weekLabel}</p>
          </div>
          <button
            onClick={() => {
              haptic?.medium()
              setShowDatePicker(true)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant bg-surface-container active:scale-90 transition-transform shrink-0"
          >
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
              const isDone = lesson.status === 'done'
              const isInProgress = lesson.status === 'ongoing'
              const isProcessing = processingSessionId === lesson.id

              return (
                <div key={lesson.id} className="stagger-item flex gap-3" style={{ animationDelay: `${index * 80}ms` }}>
                  <div className="w-14 flex-shrink-0 pt-3">
                    <p className="text-xs font-semibold text-on-surface-variant">{time}</p>
                  </div>
                  <div
                    className={`flex-1 rounded-card border p-4 transition-all duration-200 ${
                      isDone
                        ? 'border-outline-variant bg-surface-container'
                        : isInProgress
                          ? 'card-in-progress border-paid-green/30 bg-surface-container'
                          : 'border-brand/30 bg-surface-container'
                    }`}
                    style={
                      isDone
                        ? {}
                        : isInProgress
                          ? { boxShadow: '0 0 0 1px rgba(74,222,128,0.18)' }
                          : { boxShadow: '0 0 0 1px rgba(108,99,255,0.2)' }
                    }
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span
                        className={`max-w-[150px] truncate rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                          isDone
                            ? 'bg-surface-high text-on-surface-variant'
                            : isInProgress
                              ? 'bg-paid-green/15 text-paid-green'
                              : 'bg-brand/20 text-primary'
                        }`}
                      >
                        {subject}
                      </span>
                      {isDone ? (
                        <CheckCircle size={16} className="shrink-0 text-paid-green" />
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 text-[10px] text-on-surface-variant">
                          <span className={`h-1.5 w-1.5 rounded-full ${isInProgress ? 'bg-paid-green animate-ping' : 'bg-primary'} ${isInProgress ? '' : 'animate-pulse'}`} />
                          {getStatusLabel(lesson.status)}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-2 truncate text-base font-bold text-on-surface">{name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <Users size={12} /> {studentCount} {t('teacherSchedule.students')} {duration ? ` - ${duration}` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          disabled={isProcessing}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-300 active:scale-90 transition-transform disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                        {!isDone && (
                          <button
                            onClick={() => (isInProgress ? handleFinishLesson(lesson.id) : handleStartLesson(lesson.id))}
                            disabled={isProcessing}
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-90 transition-transform disabled:opacity-50 ${
                              isInProgress ? 'bg-paid-green text-white' : 'bg-brand text-white'
                            }`}
                            title={isInProgress ? t('teacherSchedule.finishLesson') : t('teacherSchedule.startLesson')}
                          >
                            {isProcessing ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : isInProgress ? (
                              <Square size={13} className="fill-white text-white" />
                            ) : (
                              <Play size={14} className="fill-white text-white" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {!isDone && (
                      <div className="mt-3 text-[11px] font-medium text-on-surface-variant flex items-center gap-1.5">
                        {isInProgress ? (
                          <>
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-paid-green opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-paid-green"></span>
                            </span>
                            <span className="text-paid-green font-bold animate-pulse">Dars ketmoqda... (Урок идет...)</span>
                          </>
                        ) : (
                          <>
                            <span className="inline-block">⏱️</span>
                            <span>{t('teacherSchedule.startHint')}</span>
                          </>
                        )}
                      </div>
                    )}
                    {isDone && (
                      <div className="mt-3 text-[11px] font-medium text-paid-green flex items-center gap-1">
                        <span>✅</span>
                        <span>Dars yakunlandi (Урок завершен)</span>
                      </div>
                    )}
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

          {/* Floating Action Button (FAB) moved to the bottom right */}
        </div>
      </div>

      <button
        className="fab bottom-[88px] right-4"
        onClick={() => {
          haptic?.medium()
          setShowCreate(true)
        }}
      >
        <Plus size={24} className="text-white" />
      </button>

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

      <CustomDatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={baseDate}
        haptic={haptic}
        t={t}
        onSelectDate={(selected) => {
          setBaseDate(selected)
          const day = selected.getDay()
          setSelectedDay(day === 0 ? 6 : day - 1)
        }}
      />
    </div>
  )
}
