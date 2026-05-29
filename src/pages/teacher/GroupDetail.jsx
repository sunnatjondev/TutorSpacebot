import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Circle, MoreVertical, Pencil, Plus, Trash2, CalendarDays } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useTelegram, useTelegramBackButton } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { supabase } from '../../lib/supabase'
import { deleteGroup, removeStudentFromGroup, updateGroup, useGroupDetail, saveAttendance, createSession, updateStudentRate } from '../../hooks/useSupabaseData'

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

function GroupActionsModal({ isOpen, onClose, onEdit, onManageStudents, onDeleteGroup, manageStudents, t }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Guruh boshqaruvi">
      <div className="space-y-3">
        <button className="btn-secondary" onClick={onEdit}>
          <Pencil size={18} /> Guruhni tahrirlash
        </button>
        <button className="btn-secondary" onClick={onManageStudents}>
          <Trash2 size={18} /> {manageStudents ? t('groupDetail.hideManageStudents') : t('groupDetail.manageStudents')}
        </button>
        <button
          className="w-full h-[52px] rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
          onClick={onDeleteGroup}
        >
          <Trash2 size={18} /> Guruhni o'chirish
        </button>
      </div>
    </Modal>
  )
}

function EditGroupModal({ isOpen, onClose, group, onSave, saving }) {
  const [name, setName] = useState(group?.name || '')
  const [subject, setSubject] = useState(group?.subject || '')

  useEffect(() => {
    if (isOpen) {
      setName(group?.name || '')
      setSubject(group?.subject || '')
    }
  }, [group?.name, group?.subject, isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Guruhni tahrirlash">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Guruh nomi</label>
          <input
            className="input-field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Masalan: Fizika 101"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Fan</label>
          <input
            className="input-field"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Masalan: Matematika"
          />
        </div>
        <button
          className="btn-primary"
          disabled={!name.trim() || !subject.trim() || saving}
          onClick={() => onSave({ name, subject })}
        >
          {saving ? 'Saqlanmoqda...' : "O'zgarishlarni saqlash"}
        </button>
      </div>
    </Modal>
  )
}

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const { t } = useI18n()
  const { data, loading } = useGroupDetail(id)
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'TutorSpaceBot'

  const group = data?.group
  const students = data?.students || []

  // Date and Session state for Attendance
  const [attendanceBaseDate, setAttendanceBaseDate] = useState(() => new Date())
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })
  const attendanceDays = getDayDates(attendanceBaseDate)
  const selectedAttendanceDate = attendanceDays[selectedDayIndex]

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
  }, [id, selectedAttendanceDate, students])

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
  }, [id, students, attendance])

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
      const res = await createSession({ groupId: id, scheduledAt: scheduledAt.toISOString() })
      if (res.success && res.data) {
        activeSessionId = res.data.id
        setSessionId(activeSessionId)
      } else {
        // Revert state
        setAttendance((prev) => ({ ...prev, [studentId]: currentVal }))
        alert("Sessiya yaratib bo'lmadi")
        return
      }
    }

    const res = await saveAttendance(activeSessionId, studentId, nextVal)
    if (!res.success) {
      // Revert state
      setAttendance((prev) => ({ ...prev, [studentId]: currentVal }))
      alert("Yo'qlamani saqlab bo'lmadi")
    } else {
      haptic?.success()
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

    const res = await updateStudentRate(id, editingStudent.id, Number(newRateValue))
    setUpdatingRate(false)

    if (res.success) {
      haptic?.success()
      setEditingStudent(null)
    } else {
      haptic?.error()
      alert("O'quv haqini yangilab bo'lmadi")
    }
  }

  const handleSaveGroup = async (updates) => {
    setSaving(true)
    const result = await updateGroup(id, updates)
    setSaving(false)

    if (!result.success) {
      haptic?.error?.()
      return
    }

    haptic?.success?.()
    setShowEdit(false)
  }

  const handleRemoveStudent = async (studentId) => {
    haptic?.heavy?.()
    if (!confirm("Talabani guruhdan olib tashlamoqchimisiz?")) return

    const result = await removeStudentFromGroup(id, studentId)
    if (!result.success) {
      haptic?.error?.()
      return
    }

    haptic?.success?.()
  }

  const handleDeleteGroup = async () => {
    haptic?.heavy?.()
    if (!confirm("Bu guruhni o'chirmoqchimisiz?")) return

    const result = await deleteGroup(id)
    if (!result.success) {
      haptic?.error?.()
      return
    }

    haptic?.success?.()
    navigate('/teacher/groups', { replace: true })
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
          <span className="chip chip-active text-xs font-bold">{group?.subject || '-'}</span>
          <span className="chip text-xs">{group?.group_members?.[0]?.count ?? 0} {t('teacherGroups.students')}</span>
        </div>

        {/* Statistics Card */}
        <div className="card grid grid-cols-3 gap-2 text-center p-3">
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-surface-high/30">
            <span className="text-[10px] text-on-surface-variant font-medium">Qarzdorlar</span>
            <span className="text-lg font-extrabold text-debt-red mt-1">{monthlyStats.unpaidCount} ta</span>
            <span className="text-[9px] text-on-surface-variant mt-0.5">Не оплатили</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-surface-high/30">
            <span className="text-[10px] text-on-surface-variant font-medium">Kelmadi</span>
            <span className="text-lg font-extrabold text-orange-400 mt-1">{monthlyStats.absentCount} ta</span>
            <span className="text-[9px] text-on-surface-variant mt-0.5">Не пришли</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-surface-high/30">
            <span className="text-[10px] text-on-surface-variant font-medium">Davomat</span>
            <span className="text-lg font-extrabold text-paid-green mt-1">{monthlyStats.averageAttendance}%</span>
            <span className="text-[9px] text-on-surface-variant mt-0.5">{monthlyStats.totalClasses} dars</span>
          </div>
        </div>

        {/* Invitation Link Card */}
        <div className="card bg-brand/10 border border-brand/20 p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-bold text-on-surface">Taklif havolasi</h3>
            <span className="text-[10px] bg-brand/20 text-primary px-2 py-0.5 rounded-full font-bold">Havola</span>
          </div>
          <p className="text-xs text-on-surface-variant mb-3">
            O'quvchilarni taklif qilish havolasi (Ссылка для приглашения):
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
                  window.Telegram.WebApp.showAlert("Havola nusxalandi! (Ссылка для приглашения скопирована)")
                } else {
                  alert("Havola nusxalandi!")
                }
              }}
              className="w-full h-11 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all duration-200"
            >
              Пригласить студента
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
                onClick={() => document.getElementById('group-detail-attendance-date')?.showPicker?.() || document.getElementById('group-detail-attendance-date')?.click()}
                className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform shrink-0"
              >
                <CalendarDays size={14} />
              </button>
              <input
                type="date"
                id="group-detail-attendance-date"
                className="hidden"
                onChange={(event) => {
                  if (event.target.value) {
                    const selected = new Date(event.target.value)
                    setAttendanceBaseDate(selected)
                    const day = selected.getDay()
                    setSelectedDayIndex(day === 0 ? 6 : day - 1)
                  }
                }}
              />
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

          {manageStudents && <div className="text-red-400 text-xs font-semibold mb-3">Boshqaruv rejimi</div>}

          {loadingAttendance ? (
            <div className="py-8 text-center text-on-surface-variant text-xs animate-pulse">
              Yo'qlama yuklanmoqda...
            </div>
          ) : (
            <div className="space-y-0">
              {students.map((student, index) => (
                <div key={student.id}>
                  <div className="flex items-center gap-3 py-3">
                    <Avatar name={student.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface text-sm truncate">{student.name}</p>
                      <p className="text-on-surface-variant text-xs truncate">@{student.username || "username yo'q"}</p>
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
                  Bu guruhda hali talabalar yo'q
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
            <span className="text-[10px] bg-surface-high text-on-surface-variant px-2 py-0.5 rounded-full">Tahrirlash</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mb-2">
            Talaba to'lovini o'zgartirish uchun talabaning ustiga bosing (Нажмите для редактирования оплаты)
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
      />

      {/* Edit Student Rate Modal */}
      <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} title="O'quv haqini tahrirlash">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-on-surface mb-1">{editingStudent?.name}</p>
            <p className="text-xs text-on-surface-variant mb-3">Talabaning oylik o'quv haqini belgilang.</p>
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
            {updatingRate ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
