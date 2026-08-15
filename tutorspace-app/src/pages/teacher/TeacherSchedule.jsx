import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle, Play, Plus, Square, Trash2, Users } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Modal } from '../../components/ui/Modal'
import { CustomDatePickerModal } from '../../components/ui/CustomDatePickerModal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { useCreateSession, useDeleteSession, useTeacherGroups, useTeacherSchedule, useUpdateSession } from '../../hooks/api/useTeacher'

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

function CreateLessonModal({ groups, initialDate, onClose, onCreated, haptic, t, weekStartKey }) {
  const navigate = useNavigate()
  const { user } = useTelegram()
  const { lang } = useI18n()
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
    const frameId = window.requestAnimationFrame(() => {
      setLessonDate(new Date(initialDate || new Date()))
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [initialDate])

  const formatDisplayDate = (date) => {
    if (!date) return ''
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
  }

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      if (!groups.length) {
        setSelectedGroupId('')
        return
      }

      setSelectedGroupId((currentValue) => {
        if (currentValue && groups.some((group) => group.id === currentValue)) return currentValue
        return groups[0].id
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [groups])

  const createSessionMutation = useCreateSession()

  const isCreating = useRef(false)

  const handleCreate = async () => {
    if (isCreating.current) return
    if (!selectedGroupId || !lessonDate) {
      setError(t('teacherSchedule.fillRequired'))
      haptic?.warning?.()
      return
    }

    isCreating.current = true
    setLoading(true)
    setError(null)
    haptic?.medium()

    const parsedDuration = Number.parseInt(durationMin, 10)
    const duration = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 90

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

      // Create sessions for the current week and the next 3 weeks (4 weeks total)
      for (let week = 0; week < 4; week++) {
        for (const offset of targetDays) {
          const newDate = new Date(monday)
          newDate.setDate(monday.getDate() + offset + (week * 7))
          newDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0)
          datesToCreate.push(newDate)
        }
      }
    }

    let allSuccess = true
    for (const date of datesToCreate) {
      try {
        await createSessionMutation.mutateAsync({
          groupId: selectedGroupId,
          scheduledAt: date.toISOString(),
          durationMin: duration,
          telegramId: user?.id,
          weekStart: weekStartKey,
        })
      } catch (err) {
        allSuccess = false
        let displayError = err.message || t('teacherSchedule.createError')
        if (err.message === 'subscription_expired') {
          displayError = lang === 'ru' 
            ? 'Срок подписки истек! Продлите подписку для создания урока.' 
            : "Obuna muddati tugagan! Dars yaratish uchun obunangizni uzaytiring."
        }
        setError(displayError)
      }
    }

    setLoading(false)
    isCreating.current = false

    if (allSuccess) {
      haptic?.success?.()
      await onCreated()
      onClose()
      return
    }

    haptic?.warning?.()
  }

  if (!groups.length) {
    return (
      <div className="space-y-4">
        <div className="rounded-[24px] border border-outline-variant bg-level-1 px-4 py-5">
          <p className="text-sm font-semibold text-on-surface">{t('teacherSchedule.createGroupFirst')}</p>
          <p className="mt-2 text-sm text-on-surface-variant">{t('teacherSchedule.noGroups')}</p>
        </div>
        <button
          className="m3-btn-filled"
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
                  type="button"
                  onClick={() => {
                    setSelectedGroupId(group.id)
                    haptic?.selection?.()
                  }}
                  className={`rounded-2xl border px-4 py-2.5 text-left transition-all duration-200 ${
                    active
                      ? 'border-brand bg-brand text-white shadow-md shadow-brand/25'
                      : 'border-outline-variant/30 bg-surface-high text-on-surface-variant hover:border-brand/40'
                  }`}
                >
                  <div className={`font-bold text-sm ${active ? 'text-white' : 'text-on-surface'}`}>{group.name}</div>
                  <div className={`text-xs ${active ? 'text-white/80' : 'text-on-surface-variant'}`}>{group.subject || '-'}</div>
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
            onClick={() => {
              haptic?.light()
              setShowLessonCalendar(true)
            }}
            className="m3-input w-full text-left flex items-center justify-between"
          >
            <span className="text-on-surface">
              {formatDisplayDate(lessonDate)}, {lessonHour}:{lessonMinute}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm text-on-surface-variant">{t('teacherSchedule.time')}</span>
            <div className="flex items-center gap-2 bg-surface-container border border-outline-variant/40 dark:border-white/15 rounded-xl px-3 py-1.5 shadow-sm">
              <input
                type="number"
                min="0"
                max="23"
                value={lessonHour}
                onChange={(event) => {
                  const val = parseInt(event.target.value, 10);
                  setLessonHour(isNaN(val) ? '00' : String(val % 100).padStart(2, '0'));
                }}
                className="w-10 text-center bg-transparent text-on-surface text-sm font-bold outline-none"
              />
              <span className="text-on-surface-variant font-bold">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={lessonMinute}
                onChange={(event) => {
                  const val = parseInt(event.target.value, 10);
                  setLessonMinute(isNaN(val) ? '00' : String(val % 100).padStart(2, '0'));
                }}
                className="w-10 text-center bg-transparent text-on-surface text-sm font-bold outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-on-surface-variant">{t('teacherSchedule.repeat')}</label>
          <div className="flex flex-wrap gap-2">
            <button 
              type="button"
              onClick={() => { setRepeat('none'); haptic?.selection?.() }} 
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                repeat === 'none' 
                  ? 'bg-brand border-brand text-white shadow-md shadow-brand/25' 
                  : 'bg-surface-high border-outline-variant/30 text-on-surface-variant hover:border-brand/40'
              }`}
            >
              {t('teacherSchedule.repeatNone')}
            </button>
            <button 
              type="button"
              onClick={() => { setRepeat('odd'); haptic?.selection?.() }} 
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                repeat === 'odd' 
                  ? 'bg-brand border-brand text-white shadow-md shadow-brand/25' 
                  : 'bg-surface-high border-outline-variant/30 text-on-surface-variant hover:border-brand/40'
              }`}
            >
              {t('teacherSchedule.repeatOdd')}
            </button>
            <button 
              type="button"
              onClick={() => { setRepeat('even'); haptic?.selection?.() }} 
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                repeat === 'even' 
                  ? 'bg-brand border-brand text-white shadow-md shadow-brand/25' 
                  : 'bg-surface-high border-outline-variant/30 text-on-surface-variant hover:border-brand/40'
              }`}
            >
              {t('teacherSchedule.repeatEven')}
            </button>
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
            className="m3-input"
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

        <button className="m3-btn-filled w-full py-3.5 flex items-center justify-center gap-2 mt-2 font-bold" onClick={handleCreate} disabled={loading}>
          {loading ? t('teacherSchedule.creating') : t('teacherSchedule.create')}
        </button>
      </div>

      <CustomDatePickerModal
        isOpen={showLessonCalendar}
        onClose={() => setShowLessonCalendar(false)}
        selectedDate={lessonDate}
        onSelectDate={(date) => {
          setLessonDate(date)
          setShowLessonCalendar(false)
        }}
        haptic={haptic}
        t={t}
      />
    </>
  )
}

function formatStudentCount(count, lang) {
  const c = Number(count) || 0
  if (lang === 'uz') {
    return `${c} ta talaba`
  }
  const mod10 = c % 10
  const mod100 = c % 100
  if (mod10 === 1 && mod100 !== 11) {
    return `${c} ученик`
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${c} ученика`
  }
  return `${c} учеников`
}

export default function TeacherSchedule() {
  const { user, haptic } = useTelegram()
  const { lang, t } = useI18n()
  const [baseDate, setBaseDate] = useState(() => new Date())
  const today = new Date()
  const [selectedDay, setSelectedDay] = useState(() => {
    const day = new Date().getDay()
    return day === 0 ? 6 : day - 1
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

  const updateSessionMutation = useUpdateSession()
  const deleteSessionMutation = useDeleteSession()

  const handleStartLesson = async (sessionId) => {
    setProcessingSessionId(sessionId)
    haptic?.medium()

    try {
      await updateSessionMutation.mutateAsync({ 
        sessionId, 
        status: 'ongoing',
        telegramId: user?.id,
        weekStart: weekStartKey
      })
      haptic?.success?.()
      refetch()
    } catch {
      haptic?.error?.()
    } finally {
      setProcessingSessionId(null)
    }
  }

  const handleFinishLesson = async (sessionId) => {
    setProcessingSessionId(sessionId)
    haptic?.medium()

    try {
      await updateSessionMutation.mutateAsync({ 
        sessionId, 
        status: 'done',
        telegramId: user?.id,
        weekStart: weekStartKey
      })
      haptic?.success?.()
      refetch()
    } catch {
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
      await deleteSessionMutation.mutateAsync({ 
        sessionId,
        telegramId: user?.id,
        weekStart: weekStartKey
      })
      haptic?.success?.()
      refetch()
    } catch {
      haptic?.error?.()
    } finally {
      setProcessingSessionId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-12 pb-24">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="m3-display-md">{t('teacherSchedule.title')}</h1>
            <p className="text-sm text-on-surface-variant">{weekLabel}</p>
          </div>
          <button
            onClick={() => {
              haptic?.medium()
              setShowDatePicker(true)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container active:scale-90 transition-transform shrink-0 shadow-sm"
          >
            <CalendarDays size={18} className="text-on-surface-variant" />
          </button>
        </div>

        <div className="m3-card mb-5 flex items-center justify-between gap-1 p-2.5">
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
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 transition-all duration-200 ${
                  isSelected ? 'bg-brand shadow-md shadow-brand/20' : isToday ? 'bg-surface-high' : ''
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
              const studentCount = lesson.group?.group_members?.[0]?.count ?? 0
              const duration = lesson.duration_min ? `${lesson.duration_min} ${t('teacherSchedule.minutes')}` : ''
              const isDone = lesson.status === 'done'
              const isInProgress = lesson.status === 'ongoing'
              const isProcessing = processingSessionId === lesson.id

              const colorsMap = {
                purple: '#a855f7',
                blue: '#3b82f6',
                green: '#22c55e',
                orange: '#f97316',
                rose: '#f43f5e',
                teal: '#14b8a6',
              }
              const groupColor = colorsMap[lesson.group?.color] || '#a855f7'

              return (
                <div key={lesson.id} className="stagger-item w-full" style={{ animationDelay: `${index * 80}ms` }}>
                  <div
                    className={`w-full rounded-[24px] border p-4 transition-all duration-200 ${
                      isDone
                        ? 'border-outline-variant/30 bg-surface-container'
                        : isInProgress
                          ? 'card-in-progress border-paid-green/40 bg-surface-container'
                          : 'border-brand/30 bg-surface-container'
                    }`}
                    style={{
                      borderLeft: `5px solid ${groupColor}`,
                      boxShadow: isDone
                        ? undefined
                        : isInProgress
                          ? '0 0 0 1px rgba(74,222,128,0.18)'
                          : '0 0 0 1px rgba(108,99,255,0.2)'
                    }}
                  >
                    {/* Top Header inside card: Time + Subject on left, Status + Safe Delete on right */}
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 rounded-lg bg-surface-highest/80 px-2.5 py-0.5 text-xs font-bold text-on-surface border border-outline-variant/20">
                          {time}
                        </span>
                        <span
                          className={`truncate rounded-lg px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${
                            isDone
                              ? 'bg-surface-high text-on-surface-variant'
                              : isInProgress
                                ? 'bg-paid-green/15 text-paid-green'
                                : 'bg-brand/15 text-primary'
                          }`}
                        >
                          {subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-paid-green bg-paid-green/10 px-2 py-0.5 rounded-full">
                            <CheckCircle size={13} /> {getStatusLabel(lesson.status)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant bg-surface-high/60 px-2 py-0.5 rounded-full">
                            <span className={`h-1.5 w-1.5 rounded-full ${isInProgress ? 'bg-paid-green animate-ping' : 'bg-primary animate-pulse'}`} />
                            {getStatusLabel(lesson.status)}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          disabled={isProcessing}
                          title={t('teacherSchedule.deleteConfirm')}
                          className="ml-1 p-1 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Middle: Group Name & Student count */}
                    <div className="flex items-baseline justify-between gap-2 mb-3">
                      <h3 className="truncate text-base font-bold text-on-surface">{name}</h3>
                      <span className="shrink-0 flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                        <Users size={13} /> {formatStudentCount(studentCount, lang)} {duration ? `• ${duration}` : ''}
                      </span>
                    </div>

                    {/* Bottom Action / Status Bar */}
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-outline-variant/10">
                      <div className="text-[11px] font-medium text-on-surface-variant flex items-center gap-1.5 min-w-0">
                        {isInProgress ? (
                          <>
                            <span className="flex h-2 w-2 relative shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-paid-green opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-paid-green"></span>
                            </span>
                            <span className="text-paid-green font-bold truncate">{t('teacherSchedule.lessonInProgress')}</span>
                          </>
                        ) : isDone ? (
                          <span className="text-paid-green font-medium truncate">{t('teacherSchedule.lessonFinished')}</span>
                        ) : (
                          <span className="text-on-surface-variant/70 truncate">{t('teacherSchedule.startHint')}</span>
                        )}
                      </div>

                      {!isDone && (
                        <button
                          onClick={() => (isInProgress ? handleFinishLesson(lesson.id) : handleStartLesson(lesson.id))}
                          disabled={isProcessing}
                          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all disabled:opacity-50 ${
                            isInProgress 
                              ? 'bg-paid-green text-white shadow-paid-green/20' 
                              : 'bg-brand text-white shadow-brand/25'
                          }`}
                        >
                          {isProcessing ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : isInProgress ? (
                            <>
                              <Square size={12} className="fill-white text-white" />
                              <span>{t('teacherSchedule.finishLesson')}</span>
                            </>
                          ) : (
                            <>
                              <Play size={12} className="fill-white text-white" />
                              <span>{t('teacherSchedule.startLesson')}</span>
                            </>
                          )}
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
        </div>
      </div>

      <button
        className="m3-fab bottom-[88px] right-4"
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
          weekStartKey={weekStartKey}
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
