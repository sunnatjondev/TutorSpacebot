import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, Circle, MoreVertical, Pencil, Plus, Trash2, CalendarDays, Users, Download } from 'lucide-react'
import { downloadCSV } from '../../utils/csv.js'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { CustomDatePickerModal } from '../../components/ui/CustomDatePickerModal'
import { useTelegram, useTelegramBackButton } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { fetchGroupDayAttendance, fetchGroupMonthlyStats } from '../../lib/backend'
import { useGroupDetail, useUpdateGroup, useRemoveStudentFromGroup, useUpdateStudentRate, useSaveAttendance, useCreateHomework, useGroupHomework, useDeleteGroupHomework } from '../../hooks/api/useGroups'
import { useDeleteGroup, useCreateSession, useUpdateSession, useMarkPaymentPaid } from '../../hooks/api/useTeacher'

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

function GroupActionsModal({ isOpen, onClose, onEdit, onManageStudents, onDeleteGroup, onExportCSV, manageStudents, t }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('groupDetail.groupManagement')}>
      <div className="divide-y divide-outline-variant/20 bg-surface-high rounded-2xl overflow-hidden border border-outline-variant/15">
        {/* Edit Group */}
        <button
          onClick={() => { onEdit(); onClose(); }}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-container/50 active:bg-surface-container transition-colors text-left"
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
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-container/50 active:bg-surface-container transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Users size={18} />
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

        {/* Export CSV */}
        <button
          onClick={() => { onExportCSV(); onClose(); }}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-green-500/5 active:bg-green-500/10 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
            <Download size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-600">CSV Export</p>
            <p className="text-xs text-green-600/70 mt-0.5">Talabalar va to'lovlar</p>
          </div>
        </button>
      </div>
    </Modal>
  )
}

function EditGroupModal({ isOpen, onClose, group, onSave, saving, t }) {
  const [name, setName] = useState(group?.name || '')
  const [subject, setSubject] = useState(group?.subject || '')
  const [telegramGroupLink, setTelegramGroupLink] = useState(group?.telegram_group_link || '')
  const [color, setColor] = useState(group?.color || 'purple')

  const [billingDay, setBillingDay] = useState(group?.billing_day || 1)
  const [pricePerMonth, setPricePerMonth] = useState(group?.price_per_month || 0)
  const [scheduleTemplate, setScheduleTemplate] = useState(group?.schedule_template || [])

  const colors = [
    { value: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-500' },
    { value: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500' },
    { value: 'green', bg: 'bg-green-500', ring: 'ring-green-500' },
    { value: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-500' },
    { value: 'rose', bg: 'bg-rose-500', ring: 'ring-rose-500' },
    { value: 'teal', bg: 'bg-teal-500', ring: 'ring-teal-500' },
  ]

  const weekDays = [
    { id: 1, short: 'Du', full: 'Dushanba' },
    { id: 2, short: 'Se', full: 'Seshanba' },
    { id: 3, short: 'Ch', full: 'Chorshanba' },
    { id: 4, short: 'Pa', full: 'Payshanba' },
    { id: 5, short: 'Ju', full: 'Juma' },
    { id: 6, short: 'Sh', full: 'Shanba' },
    { id: 0, short: 'Ya', full: 'Yakshanba' },
  ]

  useEffect(() => {
    if (!isOpen) return

    const frameId = window.requestAnimationFrame(() => {
      setName(group?.name || '')
      setSubject(group?.subject || '')
      setTelegramGroupLink(group?.telegram_group_link || '')
      setColor(group?.color || 'purple')
      setBillingDay(group?.billing_day || 1)
      setPricePerMonth(group?.price_per_month || 0)
      setScheduleTemplate(group?.schedule_template || [])
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [group?.name, group?.subject, group?.telegram_group_link, group?.color, group?.billing_day, group?.price_per_month, group?.schedule_template, isOpen])

  const toggleDay = (dayId) => {
    const exists = scheduleTemplate.some(st => st.dayOfWeek === dayId)
    if (exists) {
      setScheduleTemplate(scheduleTemplate.filter(st => st.dayOfWeek !== dayId))
    } else {
      setScheduleTemplate([...scheduleTemplate, { dayOfWeek: dayId, time: '15:00' }])
    }
  }

  const updateDayTime = (dayId, field, value) => {
    setScheduleTemplate(scheduleTemplate.map(st =>
      st.dayOfWeek === dayId ? { ...st, [field]: value } : st
    ))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('groupDetail.editGroup')} closeOnBackdropClick={false}>
      <div className="space-y-5">
        {/* ── Basic Info Section ── */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block uppercase tracking-wider">{t('groupDetail.groupName')}</label>
            <input
              className="m3-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('groupDetail.groupNamePlaceholder')}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block uppercase tracking-wider">{t('groupDetail.subject')}</label>
            <input
              className="m3-input"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={t('groupDetail.subjectPlaceholder')}
            />
          </div>
        </div>

        {/* ── Payment Section ── */}
        <div className="bg-surface-container/35 rounded-2xl p-4 space-y-3 border border-outline-variant/15">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">💳 To'lov sozlamalari</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-on-surface-variant mb-1 block font-medium">Oylik summa (UZS)</label>
              <input
                className="m3-input !py-3"
                type="number"
                value={pricePerMonth}
                onChange={(event) => setPricePerMonth(parseInt(event.target.value) || 0)}
              />
            </div>
            <div className="w-24">
              <label className="text-xs text-on-surface-variant mb-1 block font-medium">Kuni</label>
              <input
                className="m3-input !py-3 text-center"
                type="number"
                min="1"
                max="31"
                value={billingDay}
                onChange={(event) => setBillingDay(parseInt(event.target.value) || 1)}
              />
            </div>
          </div>
        </div>

        {/* ── Telegram Link ── */}
        <div>
          <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Telegram guruh (ixtiyoriy)</label>
          <input
            className="m3-input"
            value={telegramGroupLink}
            onChange={(event) => setTelegramGroupLink(event.target.value)}
            placeholder="https://t.me/+"
          />
        </div>

        {/* ── Color Picker ── */}
        <div>
          <label className="text-xs font-semibold text-on-surface-variant mb-2 block uppercase tracking-wider">Guruh rangi</label>
          <div className="flex gap-3">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`w-9 h-9 rounded-full ${c.bg} transition-all duration-200 ${color === c.value ? `ring-[3px] ring-offset-2 ${c.ring} dark:ring-offset-[#1a1b1e] scale-110` : 'opacity-60 hover:opacity-90 scale-90'}`}
              />
            ))}
          </div>
        </div>

        {/* ── Schedule Section ── */}
        <div>
          <label className="text-xs font-semibold text-on-surface-variant mb-3 block uppercase tracking-wider">📅 Haftalik dars jadvali</label>
          
          {/* Day Toggle Pills */}
          <div className="flex flex-wrap gap-2 mb-3">
            {weekDays.map(wd => {
              const isActive = scheduleTemplate.some(st => st.dayOfWeek === wd.id)
              return (
                <button
                  key={wd.id}
                  onClick={() => toggleDay(wd.id)}
                  className={`h-10 px-4 rounded-xl text-sm font-bold transition-all duration-200 border ${
                    isActive
                      ? 'bg-primary text-on-primary border-primary shadow-sm'
                      : 'bg-surface-high text-on-surface-variant border-outline-variant/30 hover:border-primary/40'
                  }`}
                >
                  {wd.short}
                </button>
              )
            })}
          </div>

          {/* Selected Days with Time Inputs */}
          {scheduleTemplate.length > 0 && (
            <div className="space-y-2 mt-2">
              {weekDays
                .filter(wd => scheduleTemplate.some(st => st.dayOfWeek === wd.id))
                .map(wd => {
                  const entry = scheduleTemplate.find(st => st.dayOfWeek === wd.id)
                  const [h, m] = (entry?.time || '15:00').split(':')
                  return (
                    <div key={wd.id} className="flex items-center gap-3 bg-surface-high/60 rounded-xl px-3 py-2.5 border border-outline-variant/10">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CheckCircle size={16} className="text-primary shrink-0" />
                        <span className="text-sm font-semibold text-on-surface">{wd.full}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-surface-container rounded-lg px-2.5 py-1.5 border border-outline-variant/20 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={h}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            const hh = isNaN(val) ? '00' : String(Math.min(23, Math.max(0, val))).padStart(2, '0')
                            updateDayTime(wd.id, 'time', `${hh}:${m}`)
                          }}
                          className="w-8 text-center bg-transparent text-on-surface text-sm font-bold outline-none"
                        />
                        <span className="text-on-surface-variant font-bold text-sm">:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={m}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            const mm = isNaN(val) ? '00' : String(Math.min(59, Math.max(0, val))).padStart(2, '0')
                            updateDayTime(wd.id, 'time', `${h}:${mm}`)
                          }}
                          className="w-8 text-center bg-transparent text-on-surface text-sm font-bold outline-none"
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        <button
          className="m3-btn-filled w-full mt-2"
          disabled={!name.trim() || !subject.trim() || saving}
          onClick={() => onSave({ name, subject, telegram_group_link: telegramGroupLink || null, color, billing_day: billingDay, price_per_month: pricePerMonth, schedule_template: scheduleTemplate })}
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
              className="m3-input"
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
              className="m3-input w-full text-left flex items-center justify-between"
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
                <span className="text-sm text-on-surface-variant">{t('teacherSchedule.time')}</span>
                <div className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2">
                  <input
                    type="number"
                    min="0" max="23"
                    value={timeHour}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTimeHour(isNaN(val) ? '00' : String(val % 100).padStart(2, '0'));
                    }}
                    className="w-10 text-center bg-transparent text-on-surface text-sm font-bold outline-none"
                  />
                  <span className="text-on-surface font-bold">:</span>
                  <input
                    type="number"
                    min="0" max="59"
                    value={timeMinute}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTimeMinute(isNaN(val) ? '00' : String(val % 100).padStart(2, '0'));
                    }}
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
              className="w-full rounded-[24px] bg-surface-container border border-outline-variant px-4 py-3 text-on-surface text-sm placeholder-on-surface-variant outline-none focus:border-brand resize-none"
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
            className="m3-btn-filled"
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
  const { t, lang } = useI18n()
  const { data, loading } = useGroupDetail(id)
  const { data: homeworkRows } = useGroupHomework(id)
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'tutorspace_app_bot'

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

  // Create Session states
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false)
  const [sessionDuration, setSessionDuration] = useState(90)
  const [creatingSession, setCreatingSession] = useState(false)
  const [sessionNotes, setSessionNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [lessonDate, setLessonDate] = useState(() => new Date())
  const [lessonHour, setLessonHour] = useState('09')
  const [lessonMinute, setLessonMinute] = useState('00')
  const [showLessonCalendar, setShowLessonCalendar] = useState(false)

  // Mark Payment Paid states
  const [markingPaymentStudent, setMarkingPaymentStudent] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [markingPayment, setMarkingPayment] = useState(false)

  // Statistics state
  const [monthlyStats, setMonthlyStats] = useState({ unpaidCount: 0, absentCount: 0, averageAttendance: 0, totalClasses: 0 })

  const [showActions, setShowActions] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [manageStudents, setManageStudents] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  useTelegramBackButton(() => navigate(-1))

  const openCreateSessionModal = () => {
    setLessonDate(new Date(selectedAttendanceDate || new Date()))
    setLessonHour('09')
    setLessonMinute('00')
    setShowCreateSessionModal(true)
  }

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
        const { sessions } = await fetchGroupDayAttendance({ groupId: id, date: selectedAttendanceDate })

        const session = sessions?.[0]
        if (session) {
          setSessionId(session.id)
          setSessionNotes(session.notes || '')
          const attMap = {}
          students.forEach((s) => {
            const attRow = session.attendance?.find((a) => a.student_id === s.id)
            attMap[s.id] = attRow ? attRow.present : false
          })
          setAttendance(attMap)
        } else {
          setSessionId(null)
          setSessionNotes('')
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

      const unpaidCount = students.filter((s) => s.status !== 'paid').length
      const absentCount = students.filter((s) => !attendance[s.id]).length

      try {
        const statsData = await fetchGroupMonthlyStats(id)

        setMonthlyStats({
          unpaidCount,
          absentCount,
          averageAttendance: statsData.averageAttendance,
          totalClasses: statsData.totalClasses,
        })
      } catch (err) {
        console.error('[Stats] load error:', err)
      }
    }

    loadMonthlyStats()
  }, [id, studentIdsKey, attendance]) // eslint-disable-line react-hooks/exhaustive-deps

  const queryClient = useQueryClient()
  const createSessionMutation = useCreateSession()
  const saveAttendanceMutation = useSaveAttendance()
  const updateStudentRateMutation = useUpdateStudentRate()
  const updateGroupMutation = useUpdateGroup()
  const removeStudentMutation = useRemoveStudentFromGroup()
  const deleteGroupMutation = useDeleteGroup()
  const deleteHomeworkMutation = useDeleteGroupHomework()
  const markPaymentPaidMutation = useMarkPaymentPaid()
  const updateSessionMutation = useUpdateSession()

  const handleSaveNotes = async () => {
    if (!sessionId) return
    setSavingNotes(true)
    
    // Calculate weekStart (Monday of the week for selectedAttendanceDate)
    let weekStartKey = null
    if (selectedAttendanceDate) {
      const day = selectedAttendanceDate.getDay()
      const monday = new Date(selectedAttendanceDate)
      monday.setDate(selectedAttendanceDate.getDate() - ((day === 0 ? 7 : day) - 1))
      weekStartKey = monday.getTime()
    }
    
    try {
      await updateSessionMutation.mutateAsync({
        sessionId,
        notes: sessionNotes,
        telegramId: user?.id,
        weekStart: weekStartKey
      })
      haptic?.success()
    } catch {
      alert(lang === 'ru' ? 'Ошибка при сохранении заметок' : "Qaydlarni saqlashda xatolik yuz berdi")
    } finally {
      setSavingNotes(false)
    }
  }

  const handleConfirmCreateSession = async () => {
    setCreatingSession(true)
    haptic?.medium()
    const scheduledAt = new Date(lessonDate)
    scheduledAt.setHours(Number(lessonHour) || 9, Number(lessonMinute) || 0, 0, 0)
    
    // Calculate weekStart (Monday of the week)
    const day = scheduledAt.getDay()
    const monday = new Date(scheduledAt)
    monday.setDate(scheduledAt.getDate() - ((day === 0 ? 7 : day) - 1))
    const weekStartKey = monday.getTime()
    
    try {
      const data = await createSessionMutation.mutateAsync({
        groupId: id,
        scheduledAt: scheduledAt.toISOString(),
        durationMin: Number(sessionDuration) || 90,
        telegramId: user?.id,
        weekStart: weekStartKey
      })
      setSessionId(data.session.id)
      haptic?.success()
      setAttendanceBaseDate(scheduledAt)
      const day = scheduledAt.getDay()
      setSelectedDayIndex(day === 0 ? 6 : day - 1)
      setShowCreateSessionModal(false)
    } catch {
      alert(lang === 'ru' ? 'Ошибка при создании урока' : "Dars yaratishda xatolik yuz berdi")
    } finally {
      setCreatingSession(false)
    }
  }

  const handleConfirmMarkPaid = async () => {
    if (!markingPaymentStudent?.payment_id) return
    setMarkingPayment(true)
    haptic?.medium()
    try {
      await markPaymentPaidMutation.mutateAsync({
        paymentId: markingPaymentStudent.payment_id,
        method: paymentMethod
      })
      haptic?.success()
      queryClient.invalidateQueries({ queryKey: ['group-detail', id] })
      setMarkingPaymentStudent(null)
    } catch {
      alert("To'lovni tasdiqlashda xatolik")
    } finally {
      setMarkingPayment(false)
    }
  }

  const displayStudentName = (name) => {
    if (!name || name.trim() === '' || name.trim() === '—' || name.trim() === '-') {
      return t('common.noName')
    }
    return name
  }

  const handleMarkAllPresent = async () => {
    haptic?.medium()
    let activeSessionId = sessionId
    if (!activeSessionId) {
      alert(lang === 'ru' ? "Сначала создайте урок для этой даты!" : "Iltimos, avval ushbu sana uchun dars yarating!")
      return
    }

    const unMarkedStudents = students.filter(s => !attendance[s.id])
    if (!unMarkedStudents.length) return

    // Set all to true optimistically
    const prevAttendance = { ...attendance }
    const updated = { ...attendance }
    unMarkedStudents.forEach(s => { updated[s.id] = true })
    setAttendance(updated)

    try {
      await Promise.all(
        unMarkedStudents.map(s =>
          saveAttendanceMutation.mutateAsync({ sessionId: activeSessionId, studentId: s.id, present: true })
        )
      )
      haptic?.success()
    } catch (err) {
      setAttendance(prevAttendance)
      console.error('[Attendance] save all error:', err)
      alert("Yo'qlamalarni saqlab bo'lmadi")
    }
  }

  const toggleAttendance = async (studentId) => {
    haptic?.light()
    
    let activeSessionId = sessionId
    if (!activeSessionId) {
      alert(lang === 'ru' ? "Сначала создайте урок для этой даты!" : "Iltimos, avval ushbu sana uchun dars yarating!")
      return
    }

    const currentVal = !!attendance[studentId]
    const nextVal = !currentVal

    // Update state optimistically
    setAttendance((prev) => ({ ...prev, [studentId]: nextVal }))

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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
          <div className="m3-card text-center py-8 text-on-surface-variant">{t('common.loading')}</div>
        )}

        <div className="flex gap-2 mb-1">
          <span className="chip bg-brand text-on-primary font-bold text-xs h-7 inline-flex items-center px-3">{group?.subject || '-'}</span>
          <span className="chip bg-surface-high text-on-surface-variant text-xs h-7 inline-flex items-center px-3">{t('groupDetail.studentsCount', { count: group?.group_members?.[0]?.count ?? 0 })}</span>
        </div>

        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="m3-card flex flex-col items-center justify-center p-3 text-center">
            <span className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">{t('groupDetail.debtors')}</span>
            <span className="text-lg font-extrabold text-debt-red mt-2">{t('groupDetail.studentsCount', { count: monthlyStats.unpaidCount })}</span>
            <span className="text-[9px] text-on-surface-variant mt-1">{t('common.unpaid').toLowerCase()}</span>
          </div>
          <div className="m3-card flex flex-col items-center justify-center p-3 text-center">
            <span className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">{t('groupDetail.absent')}</span>
            <span className="text-lg font-extrabold text-orange-400 mt-2">{t('groupDetail.studentsCount', { count: monthlyStats.absentCount })}</span>
            <span className="text-[9px] text-on-surface-variant mt-1">{t('groupDetail.absent').toLowerCase()}</span>
          </div>
          <div className="m3-card flex flex-col items-center justify-center p-3 text-center">
            <span className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">{t('groupDetail.attendanceStats')}</span>
            <span className="text-lg font-extrabold text-paid-green mt-2">{monthlyStats.averageAttendance}%</span>
            <span className="text-[9px] text-on-surface-variant mt-1">{t('groupDetail.lessonsCount', { count: monthlyStats.totalClasses })}</span>
          </div>
        </div>

        {/* Invitation Link m3-card */}
        <div className="m3-card bg-brand/10 border border-brand/20 p-4">
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
              className="m3-input py-2.5 text-xs w-full bg-surface-high border-outline-variant text-on-surface-variant font-mono"
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
              className="w-full h-11 rounded-full bg-brand text-on-primary font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all duration-200"
            >
              {t('groupDetail.inviteStudent')}
            </button>
          </div>
        </div>

        {/* Attendance m3-card */}
        <div className="m3-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="m3-title-md !font-sans !text-base">{t('groupDetail.attendance')}</h3>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary">
                {selectedAttendanceDate?.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'short', day: 'numeric' })}
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
          <div className="mb-4 flex items-center justify-between gap-1 bg-surface-high/30 rounded-[20px] p-2">
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
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-[16px] py-2 flex-1 transition-all duration-200 ${
                    isSelected
                      ? 'bg-brand text-on-primary shadow-m3-elevation-1 scale-105 font-bold'
                      : isToday
                        ? 'bg-surface-high text-on-surface'
                        : 'text-on-surface-variant hover:bg-surface-high/20'
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                    {t(`days.${dayKey}`)}
                  </span>
                  <span className={`text-sm font-bold ${isSelected ? 'text-on-primary' : 'text-on-surface'}`}>
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
          ) : !sessionId ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
                <CalendarDays size={28} className="text-primary" />
              </div>
              <p className="m3-body-lg mb-6 text-on-surface-variant">
                {lang === 'ru' ? 'На эту дату урок не создан.' : 'Bu sana uchun dars yaratilmagan.'}
              </p>
              <button 
                className="m3-btn-filled mx-auto"
                onClick={() => {
                  haptic?.medium()
                  openCreateSessionModal()
                }}
              >
                + {lang === 'ru' ? 'Создать урок' : 'Dars yaratish'}
              </button>
            </div>
          ) : (
            <div className="space-y-0">
              {(() => {
                const selectedDateEnd = new Date(selectedAttendanceDate)
                selectedDateEnd.setHours(23, 59, 59, 999)
                
                const visibleStudents = students.filter(student => {
                  if (!student.joined_at) return true
                  return new Date(student.joined_at) <= selectedDateEnd
                })

                if (!visibleStudents.length) {
                  return (
                    <div className="py-6 text-center text-on-surface-variant text-sm">
                      {lang === 'ru' ? 'В этот день в группе не было активных студентов' : 'Bu kunda guruhda faol talabalar bo\'lmagan'}
                    </div>
                  )
                }

                const showMarkAllBtn = visibleStudents.some(s => !attendance[s.id])

                return (
                  <div className="space-y-3">
                    {showMarkAllBtn && (
                      <div className="flex justify-end pr-1">
                        <button
                          onClick={handleMarkAllPresent}
                          className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/15 active:scale-95 px-3 py-1.5 rounded-full transition-all flex items-center gap-1"
                        >
                          ✓ {lang === 'ru' ? 'Отметить всех присутствующими' : 'Hammani bor deb belgilash'}
                        </button>
                      </div>
                    )}

                    {visibleStudents.map((student, index) => (
                      <div key={student.id}>
                        <div className="flex items-center gap-3 py-3">
                          <Avatar name={displayStudentName(student.name)} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-on-surface text-sm truncate">{displayStudentName(student.name)}</p>
                            <p className="text-on-surface-variant text-[10px] truncate">
                              {student.username ? `@${student.username}` : '—'}
                              {student.joined_at && ` • ${lang === 'ru' ? 'Вступил(а)' : "Qo'shilgan"}: ${new Date(student.joined_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'short' })}`}
                            </p>
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
                        {index < visibleStudents.length - 1 && <hr className="w-full h-px bg-outline-variant/20 border-0" />}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
          
          {/* Session Notes */}
          {!loadingAttendance && sessionId && (
            <div className="mt-4 pt-4 border-t border-outline-variant/20">
              <label className="text-xs font-semibold text-on-surface-variant mb-2 block">
                {lang === 'ru' ? 'Заметки к уроку (темы, замечания)' : 'Dars qaydlari (mavzular, izohlar)'}
              </label>
              <textarea
                className="m3-input w-full resize-none h-20 text-sm"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder={lang === 'ru' ? 'Что проходили на уроке...' : 'Darsda nima o\'tildi...'}
              />
              <button
                className="mt-2 text-xs font-bold text-brand hover:text-primary transition-colors disabled:opacity-50"
                onClick={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? (lang === 'ru' ? 'Сохранение...' : 'Saqlanmoqda...') : (lang === 'ru' ? 'Сохранить заметки' : 'Qaydlarni saqlash')}
              </button>
            </div>
          )}
        </div>

        {/* Payments m3-card */}
        <div className="m3-card">
          <div className="flex items-center justify-between mb-3">
            <p className="m3-label">
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
                <div className="flex items-center gap-3 py-3">
                  <Avatar name={displayStudentName(student.name)} size="sm" />
                  <div 
                    className="flex-1 min-w-0 cursor-pointer hover:opacity-80 flex items-center gap-2 group"
                    onClick={() => handleEditRateClick(student)}
                  >
                    <div>
                      <p className="text-on-surface text-sm font-semibold truncate">{displayStudentName(student.name)}</p>
                      <p className="text-on-surface-variant text-xs flex items-center gap-1.5">
                        {formatUZS(student.amount)} 
                        <Pencil size={11} className="text-on-surface-variant/50 group-hover:text-primary transition-colors" />
                      </p>
                    </div>
                  </div>
                  
                  {student.status === 'paid' ? (
                    <span className="badge-paid select-none">✓ {t('common.paid')}</span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (student.payment_id) {
                          setMarkingPaymentStudent(student)
                          setPaymentMethod('cash')
                          haptic?.light()
                        } else {
                          alert(lang === 'ru' ? "Сначала создайте платеж в Финансах" : "Avval moliya bo'limida to'lov yarating")
                        }
                      }}
                      className={`active:scale-95 transition-transform ${
                        student.status === 'unpaid' ? 'badge-unpaid cursor-pointer' : 'badge-partial cursor-pointer'
                      }`}
                    >
                      {student.status === 'unpaid' ? t('common.unpaid') : t('common.partial')}
                    </button>
                  )}
                </div>
                {index < students.length - 1 && <hr className="w-full h-px bg-outline-variant/20 border-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Homeworks m3-card */}
        <div className="m3-card">
          <div className="flex items-center justify-between mb-3">
            <p className="m3-label">
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
            {(() => {
              const todayStart = new Date()
              todayStart.setHours(0, 0, 0, 0)
              const activeHomework = homework.filter(h => !h.due_at || new Date(h.due_at) >= todayStart)

              if (!activeHomework.length) {
                return <p className="py-4 text-center text-sm text-on-surface-variant">{t('homework.noTasks')}</p>
              }

              return activeHomework.map((item) => {
                const dueStr = item.due_at
                  ? new Date(item.due_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'
                return (
                  <div 
                    key={item.id} 
                    className="py-2 border-b border-outline-variant/40 last:border-0 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => {
                      haptic?.selection()
                      setSelectedTask(item)
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                      <span className="text-[10px] text-on-surface-variant bg-surface-high px-2 py-0.5 rounded-full whitespace-nowrap">
                        {t('homework.dueDate')}: {dueStr}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5">{item.description}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <CheckCircle size={12} className={item.doneCount === item.totalCount && item.totalCount > 0 ? "text-paid-green" : "text-on-surface-variant"} />
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {t('homework.completed') || 'Bajarildi'}: <span className="text-on-surface font-bold">{item.doneCount || 0}</span> / {item.totalCount || 0}
                      </span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        <button
          onClick={() => {
            haptic?.medium()
            navigate('/teacher/add-student', { state: { groupId: id } })
          }}
          className="m3-btn-tonal"
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
        onExportCSV={() => {
          const rows = students.map(s => ({
            'ID': s.id,
            'Name': s.name,
            'Username': s.username || '',
            'Phone': s.phone_number || '',
            'Status': s.status,
            'Amount': s.amount
          }))
          downloadCSV(`Group_${group?.name}_Students`, rows)
          haptic?.success()
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
                className="m3-input pr-14"
                value={newRateValue}
                onChange={(event) => setNewRateValue(event.target.value)}
                placeholder="200 000"
                autoFocus
              />
            </div>
          </div>
          <button
            className="m3-btn-filled"
            onClick={handleSaveRate}
            disabled={updatingRate}
          >
            {updatingRate ? t('groupDetail.saving') : t('common.save')}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask?.title || ''}>
        {selectedTask && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-surface-high px-3 py-1 text-xs font-bold tracking-wide text-on-surface-variant">
                {t('homework.dueDate')}
              </span>
              <span className={`text-xs font-medium text-on-surface-variant`}>
                {selectedTask.due_at ? new Date(selectedTask.due_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>
            <div className="rounded-xl bg-surface-high p-4 text-sm text-on-surface">
              {selectedTask.description ? (
                <p className="whitespace-pre-wrap leading-relaxed">{selectedTask.description}</p>
              ) : (
                <p className="italic text-on-surface-variant">{t('studentHome.noDescription') || 'Описание отсутствует'}</p>
              )}
            </div>
            
            <div className="rounded-xl border border-outline-variant/30 p-4 flex items-center justify-between bg-surface-high/50">
              <span className="text-sm font-semibold text-on-surface">{t('homework.completed') || 'Bajarildi'}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-on-surface">{selectedTask.doneCount || 0}</span>
                <span className="text-on-surface-variant">/ {selectedTask.totalCount || 0}</span>
              </div>
            </div>

            <button
              onClick={async () => {
                haptic?.heavy()
                if (confirm(t('homework.deleteConfirm') || 'Rostdan ham bu vazifani o`chirmoqchimisiz?')) {
                  try {
                    await deleteHomeworkMutation.mutateAsync(selectedTask.id)
                    setSelectedTask(null)
                    haptic?.success()
                  } catch {
                    haptic?.error()
                  }
                }
              }}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-[16px] bg-red-500/10 text-red-500 font-bold active:scale-95 transition-transform"
            >
              <Trash2 size={18} /> {t('common.delete') || 'O`chirish'}
            </button>
          </div>
        )}
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

      {/* Create Session Modal */}
      <Modal isOpen={showCreateSessionModal} onClose={() => setShowCreateSessionModal(false)} title={lang === 'ru' ? 'Создать урок' : 'Dars yaratish'} closeOnBackdropClick={false}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-on-surface-variant">
              {lang === 'ru' ? 'Дата урока' : 'Dars sanasi'}
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
                {(() => {
                  const d = lessonDate
                  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
                })()}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-on-surface-variant">
              {lang === 'ru' ? 'Время начала' : 'Boshlanish vaqti'}
            </label>
            <div className="flex items-center gap-2 bg-surface-container rounded-2xl px-4 py-3.5 border border-outline-variant/30">
              <input
                type="number"
                min="0"
                max="23"
                value={lessonHour}
                onChange={(event) => {
                  const val = parseInt(event.target.value, 10);
                  setLessonHour(isNaN(val) ? '00' : String(val % 100).padStart(2, '0'));
                }}
                className="w-10 text-center bg-transparent text-on-surface text-base font-bold outline-none"
              />
              <span className="text-on-surface font-bold">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={lessonMinute}
                onChange={(event) => {
                  const val = parseInt(event.target.value, 10);
                  setLessonMinute(isNaN(val) ? '00' : String(val % 100).padStart(2, '0'));
                }}
                className="w-10 text-center bg-transparent text-on-surface text-base font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-on-surface-variant mb-2 block">
              {lang === 'ru' ? 'Длительность (минут)' : 'Davomiyligi (daqiqa)'}
            </label>
            <input
              type="number"
              value={sessionDuration}
              onChange={(e) => setSessionDuration(e.target.value)}
              className="m3-input"
              placeholder="90"
            />
          </div>
          <button
            className="m3-btn-filled w-full"
            onClick={handleConfirmCreateSession}
            disabled={creatingSession}
          >
            {creatingSession ? t('groupDetail.saving') : (lang === 'ru' ? 'Создать' : 'Yaratish')}
          </button>
        </div>
      </Modal>

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

      {/* Mark Payment Paid Modal */}
      <Modal isOpen={!!markingPaymentStudent} onClose={() => setMarkingPaymentStudent(null)} title={lang === 'ru' ? 'Подтверждение оплаты' : 'To\'lovni tasdiqlash'} closeOnBackdropClick={false}>
        {markingPaymentStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-surface-container rounded-2xl p-4">
              <Avatar name={displayStudentName(markingPaymentStudent.name)} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-on-surface truncate">{displayStudentName(markingPaymentStudent.name)}</p>
                <p className="text-on-surface-variant text-sm truncate">👥 {group?.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-extrabold text-debt-red">{formatUZS(markingPaymentStudent.amount)}</p>
                <p className="text-xs text-debt-red font-bold">{t('common.unpaid').toUpperCase()}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-on-surface-variant mb-2 block">
                {lang === 'ru' ? 'Способ оплаты' : 'To\'lov usuli'}
              </label>
              <div className="flex gap-2">
                {[
                  { key: 'cash', label: lang === 'ru' ? 'Наличные' : 'Naqd' },
                  { key: 'card', label: lang === 'ru' ? 'Карта' : 'Karta' },
                  { key: 'transfer', label: lang === 'ru' ? 'Перевод' : 'O\'tkazma' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setPaymentMethod(item.key)
                      haptic?.selection()
                    }}
                    className={`flex-1 h-11 rounded-full border font-semibold text-sm transition-all duration-200 ${
                      paymentMethod === item.key ? 'bg-brand border-brand text-white' : 'bg-transparent border-outline-variant text-on-surface'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleConfirmMarkPaid}
              disabled={markingPayment}
              className="m3-btn-filled mt-2"
            >
              {markingPayment ? t('groupDetail.saving') : (lang === 'ru' ? 'Подтвердить' : 'Tasdiqlash')}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
