import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, CalendarDays, Trash2 } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Modal } from '../../components/ui/Modal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { useTeacherGroups, createGroup, deleteGroup } from '../../hooks/useSupabaseData'

const SUBJECTS = ['MATEMATIKA', 'FIZIKA', 'KIMYO', 'BIOLOGIYA', 'INGLIZ TILI', 'TARIX', 'ADABIYOT', 'BOSHQA']

function CreateGroupModal({ onClose, onCreated, telegramId, user, haptic }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('MATEMATIKA')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    haptic?.medium()
    const result = await createGroup(telegramId, { name: name.trim(), subject }, user)
    setLoading(false)

    if (result.success) {
      haptic?.success?.()
      onCreated()
      onClose()
      return
    }

    setError(result.error?.message || 'Xatolik yuz berdi.')
    haptic?.warning?.()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Guruh nomi</label>
        <input
          className="input-field"
          placeholder="Masalan: Fizika 101"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Fan</label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((item) => (
            <button
              key={item}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setSubject(item)
                haptic?.selection()
              }}
              className={`chip text-[11px] ${subject === item ? 'chip-active' : ''}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      <button className="btn-primary" onClick={handleCreate} disabled={!name.trim() || loading}>
        {loading ? 'Yaratilmoqda...' : '+ Guruh yaratish'}
      </button>
    </div>
  )
}

export default function TeacherGroups() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const telegramId = user?.id
  const { data: groups, loading, refetch } = useTeacherGroups(telegramId)
  const displayGroups = groups || []

  const handleDelete = async (event, groupId) => {
    event.stopPropagation()
    haptic?.heavy?.()
    if (!confirm("Bu guruhni o'chirmoqchimisiz?")) return

    setDeletingId(groupId)
    await deleteGroup(groupId)
    setDeletingId(null)
    refetch()
  }

  const getStudentCount = (group) => group.group_members?.[0]?.count ?? 0

  const getNextLesson = (group) => {
    const next = group.sessions?.find((session) => session.status === 'upcoming')
    if (!next?.scheduled_at) return '—'

    return new Date(next.scheduled_at).toLocaleString('uz-UZ', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[28px] font-extrabold text-on-surface">{t('teacherGroups.title')}</h1>
          <button
            className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #4f44e2)', boxShadow: '0 4px 16px rgba(108,99,255,0.4)' }}
            onClick={() => {
              haptic?.medium()
              setShowCreate(true)
            }}
          >
            <Plus size={20} />
          </button>
        </div>

        {loading && !displayGroups.length && (
          <div className="text-center text-on-surface-variant py-8">Yuklanmoqda...</div>
        )}

        <div className="space-y-4">
          {displayGroups.map((group, index) => (
            <button
              key={group.id}
              className="card w-full text-left stagger-item transition-all duration-200 active:scale-[0.98] relative"
              style={{ animationDelay: `${index * 70}ms`, opacity: deletingId === group.id ? 0.5 : 1 }}
              onClick={() => {
                haptic?.light()
                navigate(`/teacher/groups/${group.id}`)
              }}
            >
              <button
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-high flex items-center justify-center text-debt-red active:scale-90 z-10"
                onClick={(event) => handleDelete(event, group.id)}
              >
                <Trash2 size={14} />
              </button>

              <div className="flex items-center gap-2 mb-3 pr-10">
                <span className="chip chip-active text-[11px] font-bold py-1 px-3 max-w-[120px] truncate">
                  {group.subject}
                </span>
                <span className="chip text-xs shrink-0">
                  <Users size={12} /> {getStudentCount(group)} {t('teacherGroups.students')}
                </span>
              </div>

              <h2 className="text-xl font-bold text-on-surface mb-3 truncate pr-8">{group.name}</h2>

              <div className="flex items-center gap-3 bg-surface-high rounded-2xl p-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center shrink-0">
                  <CalendarDays size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-on-surface-variant text-xs font-medium">{t('teacherGroups.nextLesson')}</p>
                  <p className="font-semibold text-sm text-on-surface truncate">{getNextLesson(group)}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-on-surface-variant">{t('teacherGroups.paymentProgress')}</span>
                  <span className="text-xs font-bold text-on-surface">
                    {group.paidPercent ?? 0}
                    {t('teacherGroups.paidPercent')}
                  </span>
                </div>
                <ProgressBar value={group.paidPercent ?? 0} />
              </div>
            </button>
          ))}

          {!loading && !displayGroups.length && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-primary" />
              </div>
              <p className="text-on-surface-variant">Hali guruhlar yo'q</p>
              <button className="btn-primary mt-4" onClick={() => setShowCreate(true)}>
                + Guruh yaratish
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Yangi guruh">
        <CreateGroupModal
          telegramId={telegramId}
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={refetch}
          haptic={haptic}
        />
      </Modal>

      <BottomNav role="teacher" />
    </div>
  )
}
