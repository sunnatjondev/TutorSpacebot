import { Users, CalendarDays, Send, BookOpen, Clock } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { useStudentGroups } from '../../hooks/api/useStudent'

export default function StudentGroups() {
  const { user } = useTelegram()
  const { t, lang } = useI18n()
  const { data: groupsRaw, isLoading } = useStudentGroups(user?.id)

  const groups = groupsRaw?.length
    ? groupsRaw.map((row) => {
        const group = row.group || row
        const teacher = group.teacher || {}
        const nextLesson = group.sessions?.find((session) => session.status === 'upcoming')

        return {
          id: group.id,
          name: group.name || group.subject,
          subject: group.subject || '—',
          teacher: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || (lang === 'ru' ? 'Преподаватель' : "O'qituvchi"),
          studentsCount: group.group_members?.[0]?.count ?? 0,
          nextLesson: nextLesson?.scheduled_at
            ? new Date(nextLesson.scheduled_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
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
      <div className="page-wrapper px-4 pt-6 pb-24 space-y-4">
        <div>
          <h1 className="m3-display-md text-on-surface">{t('studentGroups.title')}</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {lang === 'ru' ? 'Список всех ваших учебных групп' : 'Siz a\'zo bo\'lgan barcha guruhlar'}
          </p>
        </div>

        {isLoading && (
          <div className="text-center text-on-surface-variant py-10 text-xs">
            {t('common.loading')}
          </div>
        )}

        <div className="space-y-4">
          {groups.map((group, index) => (
            <div
              key={group.id}
              className="m3-card stagger-item !p-5 flex flex-col gap-4 border border-[#8b5cf6]/20 shadow-sm"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-on-surface">{group.name}</h2>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                    {group.subject}
                  </span>
                </div>
                {group.telegramLink && (
                  <a
                    href={group.telegramLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Send size={12} />
                    <span>Telegram</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3 bg-surface-high/50 border border-outline-variant/15 rounded-2xl p-3">
                <Avatar name={group.teacher} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{group.teacher}</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{t('studentGroups.teacher') || (lang === 'ru' ? 'Преподаватель' : 'O\'qituvchi')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-surface-high/50 border border-outline-variant/15 p-3">
                  <p className="text-on-surface-variant text-[10px] font-medium mb-1">{t('studentGroups.students')}</p>
                  <p className="flex items-center gap-1.5 font-bold text-on-surface text-sm">
                    <Users size={14} className="text-primary" />
                    <span>{group.studentsCount}</span>
                  </p>
                </div>
                <div className="rounded-xl bg-surface-high/50 border border-outline-variant/15 p-3">
                  <p className="text-on-surface-variant text-[10px] font-medium mb-1">{t('studentGroups.nextLesson')}</p>
                  <p className="flex items-center gap-1.5 font-bold text-on-surface text-xs truncate">
                    <CalendarDays size={14} className="text-primary shrink-0" />
                    <span className="truncate">{group.nextLesson}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}

          {!isLoading && !groups.length && (
            <div className="m3-card text-center py-12 text-on-surface-variant space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <BookOpen size={30} />
              </div>
              <p className="text-sm font-medium">
                {lang === 'ru' ? 'Вы еще не состоите ни в одной группе' : 'Siz hali hech qaysi guruhga qo\'shilmagansiz'}
              </p>
              <p className="text-xs text-on-surface-variant/70 max-w-xs mx-auto">
                {lang === 'ru'
                  ? 'Попросите преподавателя отправить ссылку-приглашение в группу.'
                  : 'O\'qituvchingizdan guruhga qo\'shilish havolasini so\'rang.'}
              </p>
            </div>
          )}
        </div>
      </div>
      <BottomNav role="student" />
    </div>
  )
}

