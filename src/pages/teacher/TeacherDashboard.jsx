import React, { useState } from 'react'
import { Users, CalendarDays, Bell, Plus, CheckCircle2 } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useTeacherDashboard, useTeacherGroups, createGroup } from '../../hooks/useSupabaseData'
import { useNavigate } from 'react-router-dom'

function StatCard({ icon: Icon, value, label, iconBg }) {
  return (
    <div className="stat-card">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={20} className="text-on-surface" />
      </div>
      <p className="text-2xl font-extrabold text-on-surface">{value ?? '-'}</p>
      <p className="text-xs font-medium text-on-surface-variant">{label}</p>
    </div>
  )
}

function CreateGroupModal({ onClose, onCreated, telegramId, user, haptic }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) return

    setLoading(true)
    setError(null)
    haptic?.medium()

    const result = await createGroup(telegramId, { name: name.trim(), subject: subject || 'BOSHQA' }, user)
    setLoading(false)

    if (result.success) {
      haptic?.success?.()
      await onCreated(result.data)
      onClose()
      return
    }

    console.error('[createGroup] error:', result.error)
    setError(result.error?.message || "Xatolik yuz berdi. Qayta urinib ko'ring.")
    haptic?.warning?.()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-on-surface-variant">Guruh nomi</label>
        <input
          className="input-field"
          placeholder="Masalan: Fizika 101"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-on-surface-variant">Fan</label>
        <input
          className="input-field"
          placeholder="Masalan: Matematika"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
      </div>
      {error && (
        <div className="rounded-xl border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
      <button
        className="btn-primary mt-2"
        onClick={handleCreate}
        disabled={!name.trim() || loading}
      >
        {loading ? 'Yaratilmoqda...' : 'Guruh yaratish'}
      </button>
    </div>
  )
}

export default function TeacherDashboard() {
  const { user, greeting, greetingRu, haptic } = useTelegram()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  const telegramId = user?.id
  const { data: dash, refetch } = useTeacherDashboard(telegramId)
  const { data: groups, refetch: refetchGroups } = useTeacherGroups(telegramId)

  const today = new Date().toLocaleDateString('uz-UZ', { month: 'long', day: 'numeric' })
  const firstName = user?.first_name || "O'qituvchi"
  const recentGroups = (groups || []).slice(0, 3)
  const localizedGreeting = lang === 'ru' ? greetingRu : greeting

  const handleGroupCreated = async (group) => {
    await Promise.all([refetch(), refetchGroups()])

    if (group?.id) {
      navigate(`/teacher/groups/${group.id}`)
      return
    }

    navigate('/teacher/groups')
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        <div className="mb-5 animate-slide-down">
          <h1 className="text-2xl font-extrabold text-on-surface">
            {t('teacherHome.greeting', { greeting: localizedGreeting, name: firstName })}
          </h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">{t('teacherHome.subtitle')}</p>
        </div>

        <div className="mb-5 flex gap-3">
          <StatCard icon={Users} value={dash?.totalStudents} label={t('teacherHome.students')} iconBg="bg-brand/20" />
          <StatCard icon={Users} value={dash?.totalGroups} label={t('teacherHome.groups')} iconBg="bg-tertiary/20" />
          <StatCard icon={CalendarDays} value={dash?.todaySessions?.length ?? 0} label={t('teacherHome.lessons')} iconBg="bg-surface-high" />
        </div>

        <div className="card mb-4 stagger-item">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest text-on-surface-variant">{t('teacherHome.recentGroups')}</span>
            <button
              onClick={() => {
                haptic?.light()
                navigate('/teacher/groups')
              }}
              className="text-xs font-semibold text-primary"
            >
              {t('teacherHome.allGroups')}
            </button>
          </div>

          {recentGroups.length > 0 ? (
            <div className="space-y-0">
              {recentGroups.map((group, index) => (
                <button
                  key={group.id}
                  className="flex w-full items-center gap-3 py-3 text-left transition-transform active:scale-[0.99]"
                  onClick={() => {
                    haptic?.light()
                    navigate(`/teacher/groups/${group.id}`)
                  }}
                >
                  <Avatar name={group.name} size="md" color={group.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">{group.name}</p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {group.subject} - {group.group_members?.[0]?.count ?? 0} {t('teacherGroups.students')}
                    </p>
                  </div>
                  <span className="chip shrink-0 text-[11px]">{group.paidPercent ?? 0}%</span>
                  {index < recentGroups.length - 1 && <hr className="divider" />}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-on-surface-variant">{t('teacherHome.noGroupsYet')}</p>
          )}
        </div>

        <div className="card mb-4 stagger-item">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest text-on-surface-variant">{t('teacherHome.today')}</span>
            <span className="text-sm font-semibold text-primary">{today}</span>
          </div>
          {dash?.todaySessions?.length > 0 ? (
            <div className="space-y-0">
              {dash.todaySessions.map((session, index) => (
                <div key={session.id}>
                  <div className="flex items-center gap-3 py-3">
                    <Avatar name={session.group?.name || '?'} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-on-surface">{session.group?.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(session.scheduled_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} - {session.group?.subject}
                      </p>
                    </div>
                    <span className={`badge-${session.status === 'done' ? 'paid' : 'debt'} whitespace-nowrap`}>
                      {session.status === 'done' ? <CheckCircle2 size={10} /> : null}
                      {session.status === 'done' ? t('common.done') : t('common.upcoming')}
                    </span>
                  </div>
                  {index < dash.todaySessions.length - 1 && <hr className="divider" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-on-surface-variant">Bugun darslar yo'q</p>
          )}
        </div>

        {dash?.unpaid?.length > 0 && (
          <div
            className="stagger-item mb-6 rounded-card p-4"
            style={{ background: '#1f1f28', border: '1px solid rgba(248,113,113,0.2)', borderLeft: '3px solid #f87171' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-debt-red">{t('teacherHome.unpaidWeek')}</span>
              <span className="text-sm font-bold text-on-surface">
                {formatUZS(dash.unpaid.reduce((sum, payment) => sum + (payment.amount || 0), 0))}
              </span>
            </div>
            {dash.unpaid.slice(0, 3).map((payment, index) => (
              <div key={index} className="flex items-center gap-3 py-1.5">
                <Avatar name={`${payment.student?.first_name || '?'} ${payment.student?.last_name || ''}`} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {payment.student?.first_name} {payment.student?.last_name}
                  </p>
                  <p className="text-xs font-bold text-debt-red">{formatUZS(payment.amount)}</p>
                </div>
                <button onClick={() => haptic?.light()} className="btn-ghost shrink-0 gap-1 text-xs">
                  <Bell size={12} /> {t('common.remind')}
                </button>
              </div>
            ))}
          </div>
        )}
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Yangi guruh yaratish">
        <CreateGroupModal
          telegramId={telegramId}
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={handleGroupCreated}
          haptic={haptic}
        />
      </Modal>

      <BottomNav role="teacher" />
    </div>
  )
}
