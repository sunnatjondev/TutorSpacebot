import React from 'react'
import { ExternalLink, Users, CalendarDays, Star } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { useStudentGroups } from '../../hooks/useSupabaseData'
import { mockStudentGroups } from '../../data/mockData'

export default function StudentGroups() {
  const { user, haptic, openTelegramLink } = useTelegram()
  const { t } = useI18n()
  const { data: groupsRaw } = useStudentGroups(user?.id)

  // Normalize: real data comes nested under .group, mock is flat
  const groups = groupsRaw?.length
    ? groupsRaw.map(row => {
        const g = row.group || row
        const teacher = g.teacher || {}
        return {
          id: g.id,
          subject: g.name || g.subject,
          teacher: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'O\'qituvchi',
          teacherSubject: g.subject || '—',
          studentsCount: g.group_members?.[0]?.count ?? 0,
          nextLesson: g.sessions?.find(s => s.status === 'upcoming')
            ? new Date(g.sessions.find(s => s.status === 'upcoming').scheduled_at)
                .toLocaleDateString('uz-UZ', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
            : '—',
          telegramLink: g.telegram_group_link,
          members: [], // would need a separate query
        }
      })
    : mockStudentGroups

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        <h1 className="text-[28px] font-extrabold text-on-surface mb-5">{t('studentGroups.title')}</h1>

        <div className="space-y-4">
          {groups.map((group, i) => (
            <div key={group.id} className="card stagger-item" style={{ animationDelay: `${i * 70}ms` }}>
              {/* Header */}
              <h2 className="text-xl font-extrabold text-on-surface mb-1 truncate">{group.subject}</h2>
              <p className="text-on-surface-variant text-sm mb-4 truncate">{group.teacher}</p>

              {/* Teacher info */}
              <div className="rounded-card p-4 mb-4" style={{ background: '#2a2933' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={group.teacher} size="lg" />
                  <div className="min-w-0">
                    <p className="font-bold text-on-surface truncate">{group.teacher}</p>
                    <span className="chip text-[11px] mt-1 inline-flex max-w-[150px] truncate">{group.teacherSubject}</span>
                  </div>
                </div>
                <hr className="divider my-2" />
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="rounded-xl bg-surface-container p-3">
                    <p className="text-on-surface-variant text-xs mb-1">{t('studentGroups.students')}</p>
                    <p className="flex items-center gap-1.5 font-bold text-on-surface text-sm">
                      <Users size={14} className="text-primary" /> {group.studentsCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface-container p-3">
                    <p className="text-on-surface-variant text-xs mb-1">{t('studentGroups.nextLesson')}</p>
                    <p className="flex items-center gap-1.5 font-bold text-on-surface text-sm">
                      <CalendarDays size={14} className="text-primary shrink-0" />
                      <span className="truncate">{group.nextLesson}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Telegram Group */}
              <button
                onClick={() => { haptic?.medium(); group.telegramLink && openTelegramLink?.(group.telegramLink) }}
                className="btn-primary mb-4">
                <ExternalLink size={16} /> {t('studentGroups.openTelegram')}
              </button>

              {/* Members */}
              {group.members?.length > 0 && (
                <>
                  <p className="font-bold text-on-surface mb-3">{t('studentGroups.members')}</p>
                  <div className="space-y-0">
                    {group.members.map((m, mi) => (
                      <div key={mi}>
                        <div className="flex items-center gap-3 py-2.5">
                          <Avatar name={m.name || `${m.first_name} ${m.last_name || ''}`} size="md" />
                          <p className="flex-1 text-on-surface text-sm font-medium truncate">
                            {m.name || `${m.first_name} ${m.last_name || ''}`.trim()}
                          </p>
                          {m.role === 'teacher' && (
                            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-brand/20 border border-brand/30 text-primary text-xs font-bold shrink-0">
                              <Star size={10} fill="currentColor" /> {t('studentGroups.teacher')}
                            </span>
                          )}
                        </div>
                        {mi < group.members.length - 1 && <hr className="divider" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <BottomNav role="student" />
    </div>
  )
}
