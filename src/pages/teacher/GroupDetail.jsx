import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Circle, MoreVertical, Pencil, Plus, Trash2, CalendarDays } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { CustomDatePickerModal } from '../../components/ui/CustomDatePickerModal'
import { useTelegram, useTelegramBackButton } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { supabase } from '../../lib/supabase'
import { useGroupDetail, useUpdateGroup, useRemoveStudentFromGroup, useUpdateStudentRate, useSaveAttendance, useCreateHomework, useGroupHomework } from '../../hooks/api/useGroups'
import { useDeleteGroup, useCreateSession } from '../../hooks/api/useTeacher'

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

function getLocalDateKey(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function GroupActionsModal({ isOpen, onClose, onEdit, onManageStudents, onDeleteGroup, manageStudents, t }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('groupDetail.groupManagement')}>
      <div className="divide-y divide-outline-variant/30 bg-surface-container rounded-3xl overflow-hidden border border-outline-variant/20">
        {/* Edit Group */}
        <button
          onClick={() => { onEdit(); onClose(); }}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-high/50 active:bg-surface-high transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
            <Pencil size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-on-surface">{t('groupDetail.editGroup')}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{t('groupDetail.groupName')}</p>
          </div>
        </button>

        {/* Manage Students */}
        <button
          onClick={() => { onManageStudents(); onClose(); }}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-high/50 active:bg-surface-high transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-sat-blue/10 flex items-center justify-center text-sat-blue shrink-0">
            <Trash2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-on-surface">
              {manageStudents ? t('groupDetail.hideManageStudents') : t('groupDetail.manageStudents')}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">{t('groupDetail.editRateHint')}</p>
          </div>
        </button>

        {/* Delete Group */}
        <button
          onClick={() => { onDeleteGroup(); onClose(); }}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-500/5 active:bg-red-500/10 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
            <Trash2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-400">{t('groupDetail.deleteGroup')}</p>
            <p className="text-xs text-red-500/70 mt-0.5">{t('groupDetail.deleteGroupConfirm')}</p>
          </div>
        </button>
      </div>
    </Modal>
  )
}

function EditGroupModal({ isOpen, onClose, group, onSave, saving, t }) {
  const [name, setName] = useState(group?.name || '')
  const [subject, setSubject] = useState(group?.subject || '')

  useEffect(() => {
    if (isOpen) {
      setName(group?.name || '')
      setSubject(group?.subject || '')
    }
  }, [group?.name, group?.subject, isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('groupDetail.editGroup')} closeOnBackdropClick={false}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-on-surface-variant mb-2 block">{t('groupDetail.groupName')}</label>
          <input
            className="input-field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('groupDetail.groupNamePlaceholder')}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-on-surface-variant mb-2 block">{t('groupDetail.subject')}</label>
          <input
            className="input-field"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder={t('groupDetail.subjectPlaceholder')}
          />
        </div>
        <button
          className="btn-primary"
          disabled={!name.trim() || !subject.trim() || saving}
          onClick={() => onSave({ name, subject })}
        >
          {saving ? t('groupDetail.saving') : t('groupDetail.saveChanges')}
        </button>
      </div>
    </Modal>
  )
}

function CreateHomeworkModal({ isOpen, onClose, groupId, onCreated, haptic, t }) {
  const [title, setTitle] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  const [timeHour, setTimeHour] = useState('23')
  const [timeMinute, setTimeMinute] = useState('59')
  const [showCalendar, setShowCalendar] = useState(false)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const createHomeworkMutation = useCreateHomework()

  const formatDisplayDate = (date) => {
    if (!date) return null
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    haptic?.medium?.()

    let dueDateISO = null
    if (selectedDate) {
      const d = new Date(selectedDate)
      d.setHours(Number(timeHour), Number(timeMinute), 0, 0)
      dueDateISO = d.toISOString()
    }

    try {
      await createHomeworkMutation.mutateAsync({
        groupId,
        title: title.trim(),
        dueDate: dueDateISO,
        description: description.trim(),
      })

      haptic?.success?.()
      onCreated()
      onClose()
      setTitle('')
      setSelectedDate(null)
      setTimeHour('23')
      setTimeMinute('59')
      setDescription('')
    } catch (err) {
      setError(err.message || 'Xatolik yuz berdi')
      haptic?.error?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('homework.createTitle')} closeOnBackdropClick={false}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-on-surface-variant mb-2 block">{t('homework.title')}</label>
            <input
              className="input-field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('homework.titlePlaceholder')}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-on-surface-variant mb-2 block">{t('homework.dueDate')}</label>
            <button
              type="button"
              onClick={() => { haptic?.light(); setShowCalendar(true) }}
              className="input-field w-full text-left flex items-center justify-between"
            >
              <span className={selectedDate ? 'text-on-surface' : 'text-on-surface-variant'}>
                {selectedDate
                  ? `${formatDisplayDate(selectedDate)}, ${timeHour}:${timeMinute}`
                  : t('homework.selectDate')}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            {selectedDate && (
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm text-on-surface-variant">Vaqt:</span>
                <div className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2">
                  <input
                    type="number"
                    min="0" max="23"
                    value={timeHour}
                    onChange={(e) => setTimeHour(String(e.target.value).padStart(2, '0'))}
                    className="w-10 text-center bg-transparent text-on-surface text-sm font-bold outline-none"
                  />
                  <span className="text-on-surface font-bold">:</span>
                  <input
                    type="number"
                    min="0" max="59"
                    value={timeMinute}
                    onChange={(e) => setTimeMinute(String(e.target.value).padStart(2, '0'))}
                    className="w-10 text-center bg-transparent text-on-surface text-sm font-bold outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-red-400 hover:text-red-300 ml-auto"
                >
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-on-surface-variant mb-2 block">{t('homework.description')}</label>
            <textarea
              className="w-full rounded-card bg-surface-container border border-outline-variant px-4 py-3 text-on-surface text-sm placeholder-on-surface-variant outline-none focus:border-brand resize-none"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('homework.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={!title.trim() || loading}
          >
            {loading ? t('common.sending') : t('common.send')}
          </button>
        </div>
      </Modal>

      <CustomDatePickerModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={selectedDate || new Date()}
        onSelectDate={(date) => { setSelectedDate(date); setShowCalendar(false) }}
        haptic={haptic}
      />
    </>
  )
}

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const { t } = useI18n()
  const { data, loading } = useGroupDetail(id)
  const { data: homeworkRows } = useGroupHomework(id)
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'tut0rspacebot'

  const group = data?.group
  const students = data?.students || []
  const homework = homeworkRows || []

  const [showCreateHomework, setShowCreateHomework] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Stable string key from student IDs — prevents re-running effects
  // when the array reference changes but contents are the same (happens every 20s staleMs refetch)
  const studentIdsKey = students.map((s) => s.id).join(',')

  // Date and Session state for Attendance
  const [attendanceBaseDate, setAttendanceBaseDate] = useState(() => new Date())
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })
  const attendanceDays = useMemo(() => getDayDates(attendanceBaseDate), [attendanceBaseDate])
  const selectedAttendanceDate = attendanceDays[selectedDayIndex]
  const selectedAttendanceDateKey = getLocalDateKey(selectedAttendanceDate)

  const [sessionId, setSessionId] = useState(null)
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [attendance, setAttendance] = useState({})

  // Rate Editing state
  const [editingStudent, setEditingStudent] = useState(null)
  const [updatingRate, setUpdatingRate] = useState(false)
  const [newRateValue, setNewRateValue] = useState('')

  // Statistics state
  const [monthlyStats, setMonthlyStats] = useState({ unpaidCount: 0, absentCount: 0, averageAttendance: 0, totalClasses: 0 })

  const [showActions, setShowActions] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [manageStudents, setManageStudents] = useState(false)
  const [saving, setSaving] = useState(false)

  useTelegramBackButton(() => navigate(-1))

  // Fetch Attendance for the Selected Date
  useEffect(() => {
    async function loadDayAttendance() {
      if (!id || !selectedAttendanceDate) return
      setLoadingAttendance(true)

      const startOfDay = new Date(selectedAttendanceDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedAttendanceDate)
      endOfDay.setHours(23, 59, 59, 999)

      try {
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('id, attendance(student_id, present)')
          .eq('group_id', id)
          .gte('scheduled_at', startOfDay.toISOString())
          .lte('scheduled_at', endOfDay.toISOString())
          .order('scheduled_at', { ascending: true })

        if (error) throw error

        const session = sessions?.[0]
        if (session) {
          setSessionId(session.id)
          const attMap = {}
          students.forEach((s) => {
            const attRow = session.attendance?.find((a) => a.student_id === s.id)
            attMap[s.id] = attRow ? attRow.present : false
          })
          setAttendance(attMap)
        } else {
          setSessionId(null)
          // Default all to false if no session exists yet
          const attMap = {}
          students.forEach((s) => {
            attMap[s.id] = false
          })
          setAttendance(attMap)
        }
      } catch (err) {
        console.error('[Attendance] load error:', err)
      } finally {
        setLoadingAttendance(false)
      }
    }

    loadDayAttendance()
  }, [id, selectedAttendanceDateKey, studentIdsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Monthly Stats & Selected Date Absences
  useEffect(() => {
    async function loadMonthlyStats() {
      if (!id) return
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      const unpaidCount = students.filter((s) => s.status !== 'paid').length
      const absentCount = students.filter((s) => !attendance[s.id]).length

      try {
        const { data: monthSessions, error } = await supabase
          .from('sessions')
          .select('id, attendance(present)')
          .eq('group_id', id)
          .gte('scheduled_at', startOfMonth.toISOString())
          .lte('scheduled_at', endOfMonth.toISOString())

        if (error) throw error

        let totalAttendanceMarks = 0
        let presentAttendanceMarks = 0
        const totalClasses = monthSessions?.length || 0

        monthSessions?.forEach((session) => {
          session.attendance?.forEach((att) => {
            totalAttendanceMarks++
            if (att.present) presentAttendanceMarks++
          })
        })

        const averageAttendance = totalAttendanceMarks > 0
          ? Math.round((presentAttendanceMarks / totalAttendanceMarks) * 100)
          : 0

        setMonthlyStats({
          unpaidCount,
          absentCount,
          averageAttendance,
          totalClasses,
        })
      } catch (err) {
        console.error('[Stats] load error:', err)
      }
    }

    loadMonthlyStats()
  }, [id, studentIdsKey, attendance]) // eslint-disable-line react-hooks/exhaustive-deps

  const createSessionMutation = useCreateSession()
  const saveAttendanceMutation = useSaveAttendance()
  const updateStudentRateMutation = useUpdateStudentRate()
  const updateGroupMutation = useUpdateGroup()
  const removeStudentMutation = useRemoveStudentFromGroup()
  const deleteGroupMutation = useDeleteGroup()

  const toggleAttendance = async (studentId) => {
    haptic?.light()
    const currentVal = !!attendance[studentId]
    const nextVal = !currentVal

    // Update state optimistically
    setAttendance((prev) => ({ ...prev, [studentId]: nextVal }))

    let activeSessionId = sessionId
    if (!activeSessionId) {
      // Create session on-demand for this date
      const scheduledAt = new Date(selectedAttendanceDate)
      scheduledAt.setHours(9, 0, 0, 0)
      try {
        const data = await createSessionMutation.mutateAsync({ groupId: id, scheduledAt: scheduledAt.toISOString() })
        activeSessionId = data.id
        setSessionId(activeSessionId)
      } catch (err) {
        // Revert state
        setAttendance((prev) => ({ ...prev, [studentId]: currentVal }))
        alert("Sessiya yaratib bo'lmadi")
        return
      }
    }

    try {
      await saveAttendanceMutation.mutateAsync({ sessionId: activeSessionId, studentId, present: nextVal })
      haptic?.success()
    } catch (err) {
      // Revert state
      setAttendance((prev) => ({ ...prev, [studentId]: currentVal }))
      console.error('[Attendance] save error:', err)
      alert("Yo'qlamani saqlab bo'lmadi: " + (err.message || err))
    }
  }

  const handleEditRateClick = (student) => {
    setEditingStudent(student)
    setNewRateValue(String(student.amount || ''))
    haptic?.light()
  }

  const handleSaveRate = async () => {
    if (!editingStudent) return
    setUpdatingRate(true)
    haptic?.medium()

    try {
      await updateStudentRateMutation.mutateAsync({ groupId: id, studentId: editingStudent.id, amount: Number(newRateValue) })
      haptic?.success()
      setEditingStudent(null)
    } catch (err) {
      haptic?.error()
      alert("O'quv haqini yangilab bo'lmadi")
    } finally {
      setUpdatingRate(false)
    }
  }

  const handleSaveGroup = async (updates) => {
    setSaving(true)
    try {
      await updateGroupMutation.mutateAsync({ groupId: id, updates })
      haptic?.success?.()
      setShowEdit(false)
    } catch (err) {
      haptic?.error?.()
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveStudent = async (studentId) => {
    haptic?.heavy?.()
    if (!confirm(t('groupDetail.removeStudentConfirm'))) return

    try {
      await removeStudentMutation.mutateAsync({ groupId: id, studentId })
      haptic?.success?.()
    } catch (err) {
      haptic?.error?.()
    }
  }

  const handleDeleteGroup = async () => {
    haptic?.heavy?.()
    if (!confirm(t('groupDetail.deleteGroupConfirm'))) return

    try {
      await deleteGroupMutation.mutateAsync(id)
      haptic?.success?.()
      navigate('/teacher/groups', { replace: true })
    } catch (err) {
      haptic?.error?.()
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-outline-variant/40 sticky top-0 z-30 bg-surface-lowest/80 backdrop-blur-xl">
        <button
          onClick={() => {
            haptic?.light()
            navigate(-1)
          }}
          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft size={18} className="text-on-surface" />
        </button>
        <h1 className="font-bold text-on-surface flex-1 truncate">{group?.name || 'Guruh'}</h1>
        <button
          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center"
          onClick={() => {
            haptic?.light()
            setShowActions(true)
          }}
        >
          <MoreVertical size={18} className="text-on-surface-variant" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-4">
        {loading && !group && (
          <div className="card text-center py-8 text-on-surface-variant">Yuklanmoqda...</div>
        )}

        <div className="flex gap-2 mb-1">
          <span className="chip bg-brand text-on-primary font-bold text-xs">{group?.subject || '-'}</span>
          <span className="chip bg-surface-high text-on-surface-variant text-xs">{t('groupDetail.studentsCount', { count: group?.group_members?.[0]?.count ?? 0 })}</span>
        </div>

        {/* Statistics Card */}
        <div className="card grid grid-cols-3 gap-2 text-center p-3">
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-surface-high/30">
            <span className="text-[10px] text-on-surface-variant font-medium">{t('groupDetail.debtors')}</span>
            <span className="text-lg font-extrabold text-debt-red mt-1">{t('groupDetail.studentsCount', { count: monthlyStats.unpaidCount })}</span>
            <span className="text-[9px] text-on-surface-variant mt-0.5">{t('common.unpaid').toLowerCase()}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-surface-high/30">
            <span className="text-[10px] text-on-surface-variant font-medium">{t('groupDetail.absent')}</span>
            <span className="text-lg font-extrabold text-orange-400 mt-1">{t('groupDetail.studentsCount', { count: monthlyStats.absentCount })}</span>
            <span className="text-[9px] text-on-surface-variant mt-0.5">{t('groupDetail.absent').toLowerCase()}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-surface-high/30">
            <span className="text-[10px] text-on-surface-variant font-medium">{t('groupDetail.attendanceStats')}</span>
            <span className="text-lg font-extrabold text-paid-green mt-1">{monthlyStats.averageAttendance}%</span>
            <span className="text-[9px] text-on-surface-variant mt-0.5">{t('groupDetail.lessonsCount', { count: monthlyStats.totalClasses })}</span>
          </div>
        </div>

        {/* Invitation Link Card */}
        <div className="card bg-brand/10 border border-brand/20 p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-bold text-on-surface">{t('groupDetail.inviteLink')}</h3>
            <span className="text-[10px] bg-brand/20 text-primary px-2 py-0.5 rounded-full font-bold">{t('groupDetail.inviteLinkBadge')}</span>
          </div>
          <p className="text-xs text-on-surface-variant mb-3">
            {t('groupDetail.inviteLinkDesc')}
          </p>
          <div className="space-y-3">
            <input
              readOnly
              value={`https://t.me/${botUsername}?start=invite_${group?.invite_token}`}
              className="input-field py-2.5 text-xs w-full bg-surface-high border-outline-variant text-on-surface-variant font-mono"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`https://t.me/${botUsername}?start=invite_${group?.invite_token}`)
                haptic?.success()
                if (window.Telegram?.WebApp?.showAlert) {
                  window.Telegram.WebApp.showAlert(t('groupDetail.inviteLinkCopied'))
                } else {
                  alert(t('groupDetail.inviteLinkCopied'))
                }
              }}
              className="w-full h-11 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all duration-200"
            >
              {t('groupDetail.inviteStudent')}
            </button>
          </div>
        </div>

        {/* Attendance Card */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold tracking-widest text-on-surface-variant">
              {t('groupDetail.attendance')}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">
                {selectedAttendanceDate?.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
              </span>
              <button
                onClick={() => {
                  haptic?.medium()
                  setShowDatePicker(true)
                }}
                className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform shrink-0"
              >
                <CalendarDays size={14} />
              </button>
            </div>
          </div>

          {/* Horizontal Week Strip */}
          <div className="mb-3 flex items-center justify-between gap-1 bg-surface-high/20 rounded-2xl p-2">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((dayKey, idx) => {
              const date = attendanceDays[idx]
              const isSelected = idx === selectedDayIndex
              const isToday = date.toDateString() === new Date().toDateString()

              return (
                <button
                  key={dayKey}
                  onClick={() => {
                    setSelectedDayIndex(idx)
                    haptic?.selection()
                  }}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-1 flex-1 transition-all duration-200 ${
                    isSelected ? 'bg-brand text-white' : isToday ? 'bg-surface-high' : ''
                  }`}
                >
                  <span className={`text-[8px] font-bold ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>
                    {t(`days.${dayKey}`)}
                  </span>
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-on-surface'}`}>
                    {date.getDate()}
                  </span>
                </button>
              )
            })}
          </div>

          {manageStudents && <div className="text-red-400 text-xs font-semibold mb-3">{t('groupDetail.manageMode')}</div>}

          {loadingAttendance ? (
            <div className="py-8 text-center text-on-surface-variant text-xs animate-pulse">
              {t('groupDetail.loadingAttendance')}
            </div>
          ) : (
            <div className="space-y-0">
              {students.map((student, index) => (
                <div key={student.id}>
                  <div className="flex items-center gap-3 py-3">
                    <Avatar name={student.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface text-sm truncate">{student.name}</p>
                      <p className="text-on-surface-variant text-xs truncate">{student.username ? `@${student.username}` : '—'}</p>
                    </div>
                    {manageStudents && (
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 active:scale-90 transition-transform shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button onClick={() => toggleAttendance(student.id)} className="transition-all duration-200 active:scale-90 shrink-0">
                      {attendance[student.id] ? (
                        <CheckCircle size={24} className="text-paid-green" />
                      ) : (
                        <Circle size={24} className="text-outline" />
                      )}
                    </button>
                  </div>
                  {index < students.length - 1 && <hr className="divider" />}
                </div>
              ))}

              {!students.length && (
                <div className="py-6 text-center text-on-surface-variant text-sm">
                  {t('groupDetail.noStudents')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payments Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold tracking-widest text-on-surface-variant">
              {t('groupDetail.paymentStatus')}
            </p>
            <span className="text-[10px] bg-surface-high text-on-surface-variant px-2 py-0.5 rounded-full">{t('common.edit')}</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mb-2">
            {t('groupDetail.editRateHint')}
          </p>
          <div className="space-y-0">
            {students.map((student, index) => (
              <div key={student.id}>
                <div
                  className="flex items-center gap-3 py-3 cursor-pointer active:opacity-75 transition-opacity"
                  onClick={() => handleEditRateClick(student)}
                >
                  <Avatar name={student.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface text-sm font-semibold truncate">{student.name}</p>
                    <p className="text-on-surface-variant text-xs">{formatUZS(student.amount)}</p>
                  </div>
                  {student.status === 'paid' && <span className="badge-paid">✓ {t('common.paid')}</span>}
                  {student.status === 'unpaid' && <span className="badge-unpaid">{t('common.unpaid')}</span>}
                  {student.status === 'partial' && <span className="badge-partial">{t('common.partial')}</span>}
                </div>
                {index < students.length - 1 && <hr className="divider" />}
              </div>
            ))}
          </div>
        </div>

        {/* Homeworks Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold tracking-widest text-on-surface-variant">
              {t('groupDetail.homeworkTitle')}
            </p>
            <button
              onClick={() => {
                haptic?.medium()
                setShowCreateHomework(true)
              }}
              className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-primary active:scale-90 transition-transform shrink-0"
              title={t('homework.createTitle')}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {homework.map((item, index) => {
              const dueStr = item.due_date
                ? new Date(item.due_date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—'
              return (
                <div key={item.id} className="py-2 border-b border-outline-variant/40 last:border-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                    <span className="text-[10px] text-on-surface-variant bg-surface-high px-2 py-0.5 rounded-full whitespace-nowrap">
                      {t('homework.dueDate')}: {dueStr}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5">{item.description}</p>
                  )}
                </div>
              )
            })}
            {!homework.length && (
              <p className="py-4 text-center text-sm text-on-surface-variant">{t('homework.noTasks')}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            haptic?.medium()
            navigate('/teacher/add-student', { state: { groupId: id } })
          }}
          className="btn-secondary"
        >
          <Plus size={18} /> {t('groupDetail.addStudent')}
        </button>
      </div>

      <GroupActionsModal
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        manageStudents={manageStudents}
        t={t}
        onEdit={() => {
          setShowActions(false)
          setShowEdit(true)
        }}
        onManageStudents={() => {
          setShowActions(false)
          setManageStudents((prev) => !prev)
        }}
        onDeleteGroup={() => {
          setShowActions(false)
          handleDeleteGroup()
        }}
      />

      <EditGroupModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        group={group}
        onSave={handleSaveGroup}
        saving={saving}
        t={t}
      />

      {/* Edit Student Rate Modal */}
      <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} title={t('groupDetail.editRateTitle')} closeOnBackdropClick={false}>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-on-surface mb-1">{editingStudent?.name}</p>
            <p className="text-xs text-on-surface-variant mb-3">{t('groupDetail.editRateDesc')}</p>
            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs font-semibold">so'm</span>
              <input
                type="number"
                className="input-field pr-14"
                value={newRateValue}
                onChange={(event) => setNewRateValue(event.target.value)}
                placeholder="200 000"
                autoFocus
              />
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={handleSaveRate}
            disabled={updatingRate}
          >
            {updatingRate ? t('groupDetail.saving') : t('common.save')}
          </button>
        </div>
      </Modal>

      <CreateHomeworkModal
        isOpen={showCreateHomework}
        onClose={() => setShowCreateHomework(false)}
        groupId={id}
        onCreated={() => {}}
        haptic={haptic}
        t={t}
      />

      <CustomDatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={attendanceBaseDate}
        haptic={haptic}
        onSelectDate={(selected) => {
          setAttendanceBaseDate(selected)
          const day = selected.getDay()
          setSelectedDayIndex(day === 0 ? 6 : day - 1)
        }}
      />
    </div>
  )
}
