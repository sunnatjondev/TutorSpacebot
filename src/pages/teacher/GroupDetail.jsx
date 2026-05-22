import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Circle, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useTelegram, useTelegramBackButton } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { deleteGroup, removeStudentFromGroup, updateGroup, useGroupDetail } from '../../hooks/useSupabaseData'

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

  const group = data?.group
  const students = data?.students || []

  const [attendance, setAttendance] = useState({})
  const [showActions, setShowActions] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [manageStudents, setManageStudents] = useState(false)
  const [saving, setSaving] = useState(false)

  useTelegramBackButton(() => navigate(-1))

  useEffect(() => {
    setAttendance((prev) => {
      const next = {}
      students.forEach((student) => {
        next[student.id] = prev[student.id] ?? false
      })
      return next
    })
  }, [students])

  const toggleAttendance = (studentId) => {
    haptic?.light()
    setAttendance((prev) => ({ ...prev, [studentId]: !prev[studentId] }))
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

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold tracking-widest text-on-surface-variant">
              {t('groupDetail.attendance')}
            </p>
            {manageStudents && <span className="text-red-400 text-xs font-semibold">Boshqaruv rejimi</span>}
          </div>
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
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold tracking-widest text-on-surface-variant">
              {t('groupDetail.paymentStatus')}
            </p>
            <button className="text-primary text-xs font-semibold">{t('common.viewAll')}</button>
          </div>
          <div className="space-y-0">
            {students.map((student, index) => (
              <div key={student.id}>
                <div className="flex items-center gap-3 py-3">
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
    </div>
  )
}
