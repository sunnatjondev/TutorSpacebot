import React, { useState } from 'react'
import { Users, CalendarDays, Bell, Plus, CheckCircle2, TrendingUp } from 'lucide-react'
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
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={20} className="text-on-surface" />
      </div>
      <p className="text-2xl font-extrabold text-on-surface">{value ?? '—'}</p>
      <p className="text-xs text-on-surface-variant font-medium">{label}</p>
    </div>
  )
}

function CreateGroupModal({ onClose, onCreated, telegramId, user, t, haptic }) {
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
    } else {
      console.error('[createGroup] error:', result.error)
      setError(result.error?.message || 'Xatolik yuz berdi. Qayta urinib ko\'ring.')
      haptic?.warning?.()
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Guruh nomi</label>
        <input
          className="input-field"
          placeholder="Masalan: Fizika 101"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Fan</label>
        <input
          className="input-field"
          placeholder="Masalan: Matematika"
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
      </div>
      {error && (
        <div className="rounded-xl bg-error-container/30 border border-error-container px-4 py-3">
          <p className="text-error text-sm">⚠️ {error}</p>
        </div>
      )}
      <button
        className="btn-primary mt-2"
        onClick={handleCreate}
        disabled={!name.trim() || loading}
      >
        {loading ? 'Yaratilmoqda...' : '✅ Guruh yaratish'}
      </button>
    </div>
  )
}


export default function TeacherDashboard() {
  const { user, greeting, haptic } = useTelegram()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  const telegramId = user?.id
  const { data: dash, refetch } = useTeacherDashboard(telegramId)
  const { data: groups, refetch: refetchGroups } = useTeacherGroups(telegramId)

  const today = new Date().toLocaleDateString('uz-UZ', { month: 'long', day: 'numeric' })
  const firstName = user?.first_name || 'O\'qituvchi'
  const recentGroups = (groups || []).slice(0, 3)

  const handleGroupCreated = async (group) => {
    await Promise.all([refetch(), refetchGroups()])

    if (group?.id) {
      navigate(`/teacher/groups/${group.id}`)
      return
    }

    navigate('/teacher/groups')
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        {/* Greeting */}
        <div className="mb-5 animate-slide-down">
          <h1 className="text-2xl font-extrabold text-on-surface">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-on-surface-variant text-sm mt-0.5">{t('teacherHome.subtitle')}</p>
        </div>

        {/* Stat Cards */}
        <div className="flex gap-3 mb-5">
          <StatCard icon={Users} value={dash?.totalStudents} label={t('teacherHome.students')} iconBg="bg-brand/20" />
          <StatCard icon={Users} value={dash?.totalGroups} label={t('teacherHome.groups')} iconBg="bg-tertiary/20" />
          <StatCard icon={CalendarDays} value={dash?.todaySessions?.length ?? 0} label={t('teacherHome.lessons')} iconBg="bg-surface-high" />
        </div>

        <div className="card mb-4 stagger-item">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-widest text-on-surface-variant">{t('teacherHome.recentGroups')}</span>
            <button
              onClick={() => {
                haptic?.light()
                navigate('/teacher/groups')
              }}
              className="text-primary text-xs font-semibold"
            >
              {t('teacherHome.allGroups')}
            </button>
          </div>

          {recentGroups.length > 0 ? (
            <div className="space-y-0">
              {recentGroups.map((group, index) => (
                <button
                  key={group.id}
                  className="w-full flex items-center gap-3 py-3 text-left active:scale-[0.99] transition-transform"
                  onClick={() => {
                    haptic?.light()
                    navigate(`/teacher/groups/${group.id}`)
                  }}
                >
                  <Avatar name={group.name} size="md" color={group.color} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface text-sm truncate">{group.name}</p>
                    <p className="text-on-surface-variant text-xs truncate">
                      {group.subject} • {group.group_members?.[0]?.count ?? 0} {t('teacherGroups.students')}
                    </p>
                  </div>
                  <span className="chip text-[11px] shrink-0">{group.paidPercent ?? 0}%</span>
                  {index < recentGroups.length - 1 && <hr className="divider" />}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm py-4 text-center">{t('teacherHome.noGroupsYet')}</p>
          )}
        </div>

        {/* Today's Sessions */}
        <div className="card mb-4 stagger-item">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-widest text-on-surface-variant">{t('teacherHome.today')}</span>
            <span className="text-primary text-sm font-semibold">{today}</span>
          </div>
          {dash?.todaySessions?.length > 0 ? (
            <div className="space-y-0">
              {dash.todaySessions.map((s, i) => (
                <div key={s.id}>
                  <div className="flex items-center gap-3 py-3">
                    <Avatar name={s.group?.name || '?'} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface text-sm truncate">{s.group?.name}</p>
                      <p className="text-on-surface-variant text-xs">
                        {new Date(s.scheduled_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} • {s.group?.subject}
                      </p>
                    </div>
                    <span className={`badge-${s.status === 'done' ? 'paid' : 'debt'} whitespace-nowrap`}>
                      {s.status === 'done' ? <CheckCircle2 size={10} /> : null}
                      {s.status === 'done' ? t('common.done') : t('common.upcoming')}
                    </span>
                  </div>
                  {i < dash.todaySessions.length - 1 && <hr className="divider" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm py-4 text-center">Bugun darslar yo'q</p>
          )}
        </div>

        {/* Unpaid This Week */}
        {dash?.unpaid?.length > 0 && (
          <div
            className="rounded-card mb-6 p-4 stagger-item"
            style={{ background: '#1f1f28', border: '1px solid rgba(248,113,113,0.2)', borderLeft: '3px solid #f87171' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-widest text-debt-red">{t('teacherHome.unpaidWeek')}</span>
              <span className="font-bold text-on-surface text-sm">
                {formatUZS(dash.unpaid.reduce((s, p) => s + (p.amount || 0), 0))}
              </span>
            </div>
            {dash.unpaid.slice(0, 3).map((u, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Avatar name={`${u.student?.first_name || '?'} ${u.student?.last_name || ''}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface text-sm truncate">
                    {u.student?.first_name} {u.student?.last_name}
                  </p>
                  <p className="text-debt-red font-bold text-xs">{formatUZS(u.amount)}</p>
                </div>
                <button onClick={() => haptic?.light()} className="btn-ghost text-xs gap-1 shrink-0">
                  <Bell size={12} /> {t('common.remind')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB — Create Group */}
      <button
        className="fab bottom-[88px] right-4"
        onClick={() => { haptic?.medium(); setShowCreate(true) }}
      >
        <Plus size={24} className="text-white" />
      </button>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Yangi guruh yaratish">
        <CreateGroupModal
          telegramId={telegramId}
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={handleGroupCreated}
          t={t}
          haptic={haptic}
        />
      </Modal>

      <BottomNav role="teacher" />
    </div>
  )
}
