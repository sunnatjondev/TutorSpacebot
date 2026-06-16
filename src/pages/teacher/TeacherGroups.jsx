import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, CalendarDays, Trash2 } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Modal } from '../../components/ui/Modal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { useTeacherGroups, useCreateGroup, useDeleteGroup } from '../../hooks/api/useTeacher'

function CreateGroupModal({ onClose, onCreated, telegramId, haptic }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')

  const createGroupMutation = useCreateGroup()

  const handleCreate = async () => {
    if (!name.trim()) return
    haptic?.medium()

    // Close modal immediately so the user can see the optimistic group in the list
    onClose()

    try {
      const data = await createGroupMutation.mutateAsync({ telegramId, name: name.trim(), subject })
      haptic?.success?.()
      await onCreated(data)
    } catch (err) {
      haptic?.warning?.()
      const msg = err.message || "Guruh yaratishda xatolik yuz berdi. Qayta urinib ko'ring."
      if (window.Telegram?.WebApp?.showPopup) {
        window.Telegram.WebApp.showPopup({
          title: 'Xatolik',
          message: msg,
          buttons: [{ type: 'ok' }]
        })
      } else {
        alert(msg)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="m3-label block mb-2">{t('groupDetail.groupName')}</label>
        <input
          className="m3-input"
          placeholder={t('groupDetail.groupNamePlaceholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="m3-label block mb-2">{t('groupDetail.subject')}</label>
        <input
          className="m3-input"
          placeholder={t('groupDetail.subjectPlaceholder')}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
      </div>
      <button className="m3-btn-filled w-full mt-4" onClick={handleCreate} disabled={!name.trim()}>
        + {t('teacherGroups.createGroup')}
      </button>
    </div>
  )
}

export default function TeacherGroups() {
  const { user, haptic } = useTelegram()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const telegramId = user?.id
  const { data: groups, loading, refetch } = useTeacherGroups(telegramId)
  const displayGroups = groups || []

  const deleteGroupMutation = useDeleteGroup()

  const handleDelete = async (event, groupId) => {
    event.stopPropagation()
    haptic?.heavy?.()
    if (!confirm("Bu guruhni o'chirmoqchimisiz?")) return

    setDeletingId(groupId)
    try {
      await deleteGroupMutation.mutateAsync(groupId)
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  const getStudentCount = (group) => group.group_members?.[0]?.count ?? 0

  const getNextLesson = (group) => {
    const next = group.sessions?.find((session) => session.status === 'upcoming')
    if (!next?.scheduled_at) return '—'

    return new Date(next.scheduled_at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="m3-display-md">{t('teacherGroups.title')}</h1>
          <button
            className="m3-fab static shadow-none w-14 h-14"
            onClick={() => {
              haptic?.medium()
              setShowCreate(true)
            }}
          >
            <Plus size={28} />
          </button>
        </div>

        {loading && !displayGroups.length && (
          <div className="text-center text-on-surface-variant py-8">{t('common.loading')}</div>
        )}

        <div className="space-y-4">
          {displayGroups.map((group, index) => {
            const isOptimistic = group.isOptimistic
            return (
              <button
                key={group.id}
                className={`m3-card w-full text-left stagger-item transition-all duration-200 relative ${
                  isOptimistic ? 'opacity-60 pointer-events-none' : 'active:scale-[0.98]'
                }`}
                style={{ animationDelay: `${index * 70}ms`, opacity: deletingId === group.id ? 0.5 : undefined }}
                onClick={() => {
                  if (isOptimistic) return
                  haptic?.light()
                  navigate(`/teacher/groups/${group.id}`)
                }}
              >
                {!isOptimistic && (
                  <button
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center text-error active:scale-90 z-10 transition-transform"
                    onClick={(event) => handleDelete(event, group.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                )}

              <div className="flex items-center gap-2 mb-3 pr-10">
                <span className="chip chip-active text-[11px] font-bold py-1 px-3 max-w-[120px] truncate">
                  {group.subject}
                </span>
                <span className="chip text-xs shrink-0">
                  <Users size={12} /> {getStudentCount(group)} {t('teacherGroups.students')}
                </span>
              </div>

              <h2 className="m3-title-lg mb-4 truncate pr-8">{group.name}</h2>

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
                <div className="flex items-center justify-between mb-2">
                  <span className="m3-label">{t('teacherGroups.paymentProgress')}</span>
                  <span className="font-serif font-bold text-on-surface">
                    {group.paidPercent ?? 0}%
                  </span>
                </div>
                <ProgressBar value={group.paidPercent ?? 0} />
              </div>
            </button>
          )
        })}

          {!loading && !displayGroups.length && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-primary" />
              </div>
              <p className="m3-body-lg mb-6">{t('teacherHome.noGroupsYet')}</p>
              <button className="m3-btn-filled mx-auto" onClick={() => setShowCreate(true)}>
                + {t('teacherGroups.createGroup')}
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t('teacherGroups.createGroup')}>
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
