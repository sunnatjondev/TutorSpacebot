import { Users, CalendarDays } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { useStudentGroups } from '../../hooks/api/useStudent'

export default function StudentGroups() {
  const { user } = useTelegram()
  const { t } = useI18n()
  const { data: groupsRaw } = useStudentGroups(user?.id)

  const groups = groupsRaw?.length
    ? groupsRaw.map((row) => {
        const group = row.group || row
        const teacher = group.teacher || {}
        const nextLesson = group.sessions?.find((session) => session.status === 'upcoming')

        return {
          id: group.id,
          subject: group.name || group.subject,
          teacher: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || "O'qituvchi",
          teacherSubject: group.subject || '—',
          studentsCount: group.group_members?.[0]?.count ?? 0,
          nextLesson: nextLesson?.scheduled_at
            ? new Date(nextLesson.scheduled_at).toLocaleDateString('uz-UZ', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—',
          telegramLink: group.telegram_group_link,
        }
      })
    : []

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        <h1 className="m3-display-md mb-5">{t('studentGroups.title')}</h1>

        <div className="space-y-4">
          {groups.map((group, index) => (
            <div key={group.id} className="m3-card stagger-item" style={{ animationDelay: `${index * 70}ms` }}>
              <h2 className="m3-title-lg mb-1 truncate">{group.subject}</h2>
              <p className="text-on-surface-variant text-sm mb-4 truncate">{group.teacher}</p>

              <div className="rounded-[24px] p-4 mb-4" style={{ background: '#2a2933' }}>
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

            </div>
          ))}

          {!groups.length && (
            <div className="m3-card text-center py-10 text-on-surface-variant">
              Siz hali hech qaysi guruhga qo'shilmagansiz
            </div>
          )}
        </div>
      </div>
      <BottomNav role="student" />
    </div>
  )
}
