import React from 'react'
import { Users, CalendarDays, Bell, Plus, CheckCircle2 } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { mockTeacher, mockTodaySessions, mockUnpaidWeek } from '../../data/mockData'
import { useNavigate } from 'react-router-dom'

function StatCard({ icon: Icon, value, label, iconBg }) {
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={20} className="text-on-surface" />
      </div>
      <p className="text-2xl font-extrabold text-on-surface">{value}</p>
      <p className="text-xs text-on-surface-variant font-medium">{label}</p>
    </div>
  )
}

export default function TeacherDashboard() {
  const { user, greeting, haptic } = useTelegram()
  const { t } = useI18n()
  const navigate = useNavigate()

  const today = new Date().toLocaleDateString('uz-UZ', { month: 'long', day: 'numeric' })

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <TopBar user={user} />

      <div className="page-wrapper px-4 pt-5">
        {/* Greeting */}
        <div className="mb-5 animate-slide-down">
          <h1 className="text-2xl font-extrabold text-on-surface">
            {t('teacherHome.greeting', { greeting, name: mockTeacher.name.split(' ')[0] })}
          </h1>
          <p className="text-on-surface-variant text-sm mt-0.5">{t('teacherHome.subtitle')}</p>
        </div>

        {/* Stat Cards */}
        <div className="flex gap-3 mb-6">
          <StatCard icon={Users} value={mockTeacher.totalStudents} label={t('teacherHome.students')} iconBg="bg-brand/20" />
          <StatCard icon={Users} value={mockTeacher.totalGroups} label={t('teacherHome.groups')} iconBg="bg-tertiary/20" />
          <StatCard icon={CalendarDays} value={mockTeacher.todayLessons} label={t('teacherHome.lessons')} iconBg="bg-surface-high" />
        </div>

        {/* Today's Sessions */}
        <div className="card mb-4 stagger-item">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-widest text-on-surface-variant">{t('teacherHome.today')}</span>
            <span className="text-primary text-sm font-semibold">{today}</span>
          </div>
          <div className="space-y-0">
            {mockTodaySessions.map((s, i) => (
              <div key={s.id}>
                <div className="flex items-center gap-3 py-3">
                  <Avatar name={s.student} size="md" />
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface text-sm">{s.student}</p>
                    <p className="text-on-surface-variant text-xs">{s.time} • {s.subject}</p>
                  </div>
                  {s.status === 'paid' ? (
                    <span className="badge-paid"><CheckCircle2 size={10} /> {t('common.paid')}</span>
                  ) : (
                    <span className="badge-debt">{t('common.debt')}</span>
                  )}
                  <button
                    onClick={() => haptic?.light()}
                    className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
                  >
                    <Users size={14} />
                  </button>
                </div>
                {i < mockTodaySessions.length - 1 && <hr className="divider" />}
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid This Week */}
        <div
          className="rounded-card mb-6 p-4 stagger-item"
          style={{
            background: '#1f1f28',
            border: '1px solid rgba(248,113,113,0.2)',
            borderLeft: '3px solid #f87171',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-widest text-debt-red">
              {t('teacherHome.unpaidWeek')}
            </span>
            <span className="font-bold text-on-surface text-sm">{formatUZS(140_000)}</span>
          </div>
          {mockUnpaidWeek.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center">
                <Users size={14} className="text-on-surface-variant" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-on-surface text-sm">{u.student}</p>
                <p className="text-debt-red font-bold text-sm">{formatUZS(u.amount)}</p>
              </div>
              <button
                onClick={() => haptic?.light()}
                className="btn-ghost text-xs gap-1"
              >
                <Bell size={12} /> {t('common.remind')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        className="fab bottom-[88px] right-4"
        onClick={() => { haptic?.medium(); navigate('/teacher/groups') }}
      >
        <Plus size={24} className="text-white" />
      </button>

      <BottomNav role="teacher" />
    </div>
  )
}
