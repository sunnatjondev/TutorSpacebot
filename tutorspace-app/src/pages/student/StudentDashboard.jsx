import { useState } from 'react'
import { BookOpen, Wallet, CheckCircle2, Circle, AlertTriangle, CalendarDays, Clock, ChevronRight, CheckCircle, Sparkles } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useNavigate } from 'react-router-dom'
import { useStudentDashboard, useStudentHomework, useMarkHomeworkDone } from '../../hooks/api/useStudent'

export default function StudentDashboard() {
  const { user, haptic } = useTelegram()
  const { t, lang } = useI18n()
  const telegramId = user?.id
  const firstName = user?.first_name || (lang === 'ru' ? 'Ученик' : 'Talaba')

  const navigate = useNavigate()
  const { data: dash, isLoading: loadingDash } = useStudentDashboard(telegramId)
  const { data: homeworkRows, refetch: refetchHomework } = useStudentHomework(telegramId)
  const [localDone, setLocalDone] = useState({})
  const [showAllTasks, setShowAllTasks] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  const attendance = dash?.attendance ?? 0
  const balance = dash?.balance ?? 0
  const hwCount = dash?.homeworkCount ?? 0
  const hwOverdue = dash?.homeworkOverdue ?? 0
  const nextLesson = dash?.nextLesson

  const homework = (homeworkRows || []).map((submission) => ({
    id: submission.id,
    subject: submission.homework?.group?.subject || submission.homework?.group?.name || 'Boshqa',
    title: submission.homework?.title || '-',
    description: submission.homework?.description || '',
    due: submission.homework?.due_at
      ? new Date(submission.homework.due_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—',
    overdue: submission.homework?.due_at && new Date(submission.homework.due_at) < new Date(),
    done: localDone[submission.id] ?? (submission.status === 'done' || submission.status === 'graded'),
    submissionId: submission.id,
  }))

  const markHomeworkDoneMutation = useMarkHomeworkDone()

  const toggleHomework = async (id, submissionId) => {
    haptic?.selection?.()
    const newDone = !homework.find((item) => item.id === id)?.done
    setLocalDone((prev) => ({ ...prev, [id]: newDone }))

    if (submissionId) {
      try {
        await markHomeworkDoneMutation.mutateAsync({ submissionId, done: newDone })
        refetchHomework()
      } catch {
        setLocalDone((prev) => ({ ...prev, [id]: !newDone }))
      }
    }
  }

  const teacherName = nextLesson?.group?.teacher
    ? `${nextLesson.group.teacher.first_name || ''} ${nextLesson.group.teacher.last_name || ''}`.trim()
    : null

  return (
    <div className="flex min-h-screen flex-col bg-surface-lowest">
      <div className="page-wrapper space-y-4 px-4 pt-6 pb-24">
        {/* Header Greeting */}
        <div className="animate-slide-down flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-on-surface">
              {t('studentHome.greeting', { name: firstName })}
            </h1>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {lang === 'ru' ? 'Ваш учебный прогресс и расписание' : 'O\'quv jarayoni va dars jadvalingiz'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {firstName?.[0] || 'U'}
          </div>
        </div>

        {/* Hero Card: Next Lesson */}
        <div
          className="stagger-item m3-card !p-5 bg-gradient-to-br from-[#8b5cf6]/20 via-surface-container to-surface-container border border-[#8b5cf6]/35 dark:border-[#a855f7]/35 cursor-pointer active:scale-[0.98] transition-all duration-200 shadow-sm"
          onClick={() => {
            haptic?.light()
            navigate('/student/schedule')
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-primary/20 text-primary px-3 py-1 text-[11px] font-bold tracking-wider uppercase border border-primary/30 flex items-center gap-1.5">
              <Sparkles size={12} />
              <span>{t('studentHome.nextLesson')}</span>
            </span>
            {nextLesson?.scheduled_at ? (
              <span className="rounded-full bg-surface-high px-2.5 py-0.5 text-xs font-semibold text-on-surface flex items-center gap-1">
                <Clock size={12} className="text-primary" />
                <span>
                  {new Date(nextLesson.scheduled_at).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            ) : null}
          </div>

          <h2 className="mb-3 truncate text-xl font-extrabold leading-tight text-on-surface">
            {nextLesson?.group?.subject || t('studentHome.noUpcomingLessons')}
          </h2>

          {teacherName ? (
            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={teacherName} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-on-surface">
                    {teacherName}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    {lang === 'ru' ? 'Преподаватель' : 'O\'qituvchi'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-primary text-xs font-bold shrink-0">
                <span>{lang === 'ru' ? 'Расписание' : 'Jadval'}</span>
                <ChevronRight size={14} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant pt-1">
              {lang === 'ru' ? 'Нажмите, чтобы открыть расписание занятий' : 'Darslar jadvalini ko\'rish uchun bosing'}
            </p>
          )}
        </div>

        {/* 3-Column Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 stagger-item">
          {/* Attendance Card */}
          <div className="m3-card flex flex-col items-center justify-center p-3 text-center">
            <span className="text-[11px] font-bold text-on-surface-variant">{t('studentHome.attendance')}</span>
            <span className="text-xl font-extrabold text-paid-green mt-1.5">{attendance}%</span>
            <span className="text-[9px] text-on-surface-variant/70 mt-0.5">{lang === 'ru' ? 'посещений' : 'davomat'}</span>
          </div>

          {/* Homework Card */}
          <div className="m3-card flex flex-col items-center justify-center p-3 text-center">
            <span className="text-[11px] font-bold text-on-surface-variant">{t('studentHome.homework')}</span>
            <span className="text-xl font-extrabold text-on-surface mt-1.5">{hwCount}</span>
            <span className={`text-[9px] mt-0.5 font-semibold ${hwOverdue > 0 ? 'text-debt-red' : 'text-on-surface-variant/70'}`}>
              {hwOverdue > 0 ? (lang === 'ru' ? `${hwOverdue} просроч.` : `${hwOverdue} ta qarz`) : (lang === 'ru' ? 'активных' : 'faol')}
            </span>
          </div>

          {/* Balance Card */}
          <div
            className="m3-card flex flex-col items-center justify-center p-3 text-center cursor-pointer active:scale-95 transition-transform"
            onClick={() => {
              haptic?.light()
              navigate('/student/finance')
            }}
          >
            <span className="text-[11px] font-bold text-on-surface-variant">{t('studentHome.balance')}</span>
            <span className={`text-sm font-extrabold mt-1.5 truncate max-w-full ${balance < 0 ? 'text-debt-red' : 'text-paid-green'}`}>
              {formatUZS(balance, false, lang)}
            </span>
            <span className="text-[9px] text-primary font-semibold mt-0.5 flex items-center gap-0.5">
              <span>{lang === 'ru' ? 'Оплаты' : 'Moliya'}</span>
              <ChevronRight size={9} />
            </span>
          </div>
        </div>

        {/* Upcoming Homework Section */}
        <div className="stagger-item">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="m3-title-lg text-on-surface">{t('studentHome.upcomingTasks')}</h2>
            {homework.length > 3 && (
              <button
                onClick={() => {
                  haptic?.light()
                  setShowAllTasks(true)
                }}
                className="text-xs font-bold text-primary active:opacity-70 transition-opacity"
              >
                {t('common.viewAll')} ({homework.length})
              </button>
            )}
          </div>

          <div className="m3-card space-y-0">
            {homework.slice(0, 4).map((item, index) => (
              <div key={item.id}>
                <div className="flex items-start gap-3 py-3">
                  <button
                    onClick={() => toggleHomework(item.id, item.submissionId)}
                    className="mt-0.5 transition-transform active:scale-90 text-primary"
                  >
                    {item.done ? (
                      <CheckCircle2 size={22} className="text-paid-green" />
                    ) : (
                      <Circle size={22} className="text-outline-variant hover:text-on-surface" />
                    )}
                  </button>

                  <div
                    className="min-w-0 flex-1 cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={() => {
                      haptic?.selection()
                      setSelectedTask(item)
                    }}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold">
                        {item.subject}
                      </span>
                      {item.overdue && !item.done ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-debt-red bg-debt-red/10 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> {item.due}
                        </span>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant bg-surface-high px-2 py-0.5 rounded-full">
                          {item.due}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold truncate ${item.done ? 'line-through text-on-surface-variant/70' : 'text-on-surface'}`}>
                      {item.title}
                    </p>
                  </div>
                </div>
                {index < homework.slice(0, 4).length - 1 && <hr className="w-full h-px bg-outline-variant/20 border-0" />}
              </div>
            ))}

            {!homework.length && (
              <div className="py-8 text-center text-sm text-on-surface-variant">
                <BookOpen size={28} className="mx-auto text-on-surface-variant/40 mb-2" />
                <p>{t('studentHome.noTasks')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: All Tasks */}
      <Modal isOpen={showAllTasks} onClose={() => setShowAllTasks(false)} title={t('studentHome.upcomingTasks')}>
        <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto pr-1">
          {homework.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-surface-high/60 p-3.5 border border-outline-variant/10">
              <button onClick={() => toggleHomework(item.id, item.submissionId)} className="mt-0.5 transition-transform active:scale-90 text-primary">
                {item.done ? <CheckCircle2 size={22} className="text-paid-green" /> : <Circle size={22} className="text-outline-variant" />}
              </button>
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => {
                  haptic?.selection()
                  setSelectedTask(item)
                }}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-bold">
                    {item.subject}
                  </span>
                  <span className={`text-[10px] font-semibold ${item.overdue && !item.done ? 'text-debt-red' : 'text-on-surface-variant'}`}>
                    {item.due}
                  </span>
                </div>
                <p className={`text-sm font-semibold ${item.done ? 'line-through text-on-surface-variant/70' : 'text-on-surface'}`}>
                  {item.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal: Task Detail */}
      <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask?.title || ''}>
        {selectedTask && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-bold">
                {selectedTask.subject}
              </span>
              <span className={`text-xs font-medium ${selectedTask.overdue ? 'text-debt-red font-bold' : 'text-on-surface-variant'}`}>
                {selectedTask.due}
              </span>
            </div>
            <div className="rounded-2xl bg-surface-high/60 p-4 text-sm text-on-surface border border-outline-variant/15">
              {selectedTask.description ? (
                <p className="whitespace-pre-wrap leading-relaxed">{selectedTask.description}</p>
              ) : (
                <p className="italic text-on-surface-variant">{t('studentHome.noDescription') || 'Tavsif mavjud emas'}</p>
              )}
            </div>
            <button
              onClick={() => {
                haptic?.selection()
                toggleHomework(selectedTask.id, selectedTask.submissionId)
                setSelectedTask(null)
              }}
              className="m3-btn-filled w-full !py-3.5"
            >
              {selectedTask.done
                ? (lang === 'ru' ? 'Отменить выполнение' : 'Bajarilmadi deb belgilash')
                : (lang === 'ru' ? 'Отметить как выполненное' : 'Bajarildi deb belgilash')}
            </button>
          </div>
        )}
      </Modal>

      <BottomNav role="student" />
    </div>
  )
}

