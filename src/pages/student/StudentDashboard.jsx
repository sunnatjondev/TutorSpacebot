import { useState } from 'react'
import { BookOpen, Wallet, CheckCircle, Circle, AlertTriangle } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Modal } from '../../components/ui/Modal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useNavigate } from 'react-router-dom'
import { useStudentDashboard, useStudentHomework, useMarkHomeworkDone } from '../../hooks/api/useStudent'
export default function StudentDashboard() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const telegramId = user?.id
  const firstName = user?.first_name || 'Talaba'

  const navigate = useNavigate()
  const { data: dash } = useStudentDashboard(telegramId)
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
    subject: submission.homework?.group?.subject || 'BOSHQA',
    title: submission.homework?.title || '-',
    description: submission.homework?.description || '',
    due: submission.homework?.due_at
      ? new Date(submission.homework.due_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })
      : '-',
    overdue: submission.homework?.due_at && new Date(submission.homework.due_at) < new Date(),
    done: localDone[submission.id] ?? (submission.status === 'done' || submission.status === 'graded'),
    submissionId: submission.id,
  }))

  const markHomeworkDoneMutation = useMarkHomeworkDone()

  const toggleHomework = async (id, submissionId) => {
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

  return (
    <div className="flex min-h-screen flex-col bg-surface-lowest">
      <div className="page-wrapper space-y-4 px-4 pt-6">
        <div className="animate-slide-down">
          <h1 className="text-2xl font-extrabold text-on-surface">
            {t('studentHome.greeting', { name: firstName })}
          </h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">{t('studentHome.subtitle')}</p>
        </div>

        <div
          className="stagger-item rounded-[24px] p-5 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #5a52e0 0%, #7c74ff 60%, #a099ff 100%)', boxShadow: '0 8px 32px rgba(108,99,255,0.4)' }}
          onClick={() => {
            haptic?.light()
            navigate('/student/schedule')
          }}
        >
          <div className="mb-3 flex items-start justify-between">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-widest text-white/80">
              {t('studentHome.nextLesson')}
            </span>
            {nextLesson?.scheduled_at && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90">
                {new Date(nextLesson.scheduled_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <h2 className="mb-3 truncate text-2xl font-extrabold leading-tight text-white">
            {nextLesson?.group?.subject || t('studentHome.noUpcomingLessons')}
          </h2>

          {nextLesson?.group?.teacher ? (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                {nextLesson.group.teacher.first_name?.[0] || 'T'}
              </div>
              <p className="truncate text-sm font-medium text-white/90">
                {nextLesson.group.teacher.first_name} {nextLesson.group.teacher.last_name || ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-white/70">{t('studentHome.teacherAndTimeWillShowLater')}</p>
          )}
        </div>

        <div className="stagger-item grid grid-cols-2 gap-3">
          <div className="m3-card">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/20">
                <CheckCircle size={18} className="text-primary" />
              </div>
              <div className="h-10 w-10">
                <svg viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(108,99,255,0.15)" strokeWidth="4" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#6C63FF"
                    strokeWidth="4"
                    strokeDasharray={`${attendance * 0.88} 88`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium tracking-wide text-on-surface-variant">{t('studentHome.attendance')}</p>
            <p className="text-2xl font-extrabold text-on-surface">
              {attendance}
              <span className="text-sm font-medium text-on-surface-variant">%</span>
            </p>
          </div>

          <div className="m3-card">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-error-container/30">
                <BookOpen size={18} className="text-error" />
              </div>
              {hwOverdue > 0 && (
                <span className="badge-unpaid text-[10px]">{t('studentHome.overdueCount', { count: hwOverdue })}</span>
              )}
            </div>
            <p className="text-xs font-medium tracking-wide text-on-surface-variant">{t('studentHome.homework')}</p>
            <p className="text-2xl font-extrabold text-on-surface">{hwCount}</p>
          </div>
        </div>

        <div
          className="m3-card stagger-item"
          style={{ background: 'linear-gradient(135deg, #1f1f28, #2a1a1a)', border: '1px solid rgba(248,113,113,0.25)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-error-container/20">
              <Wallet size={18} className="text-error" />
            </div>
            {balance < 0 && <span className="badge-debt text-xs">{t('common.debt').toUpperCase()}</span>}
          </div>
          <p className="mb-1 text-xs font-medium tracking-wide text-on-surface-variant">{t('studentHome.balance')}</p>
          <p className={`text-3xl font-extrabold ${balance < 0 ? 'text-debt-red' : 'text-paid-green'}`}>
            {formatUZS(balance)}
          </p>
          {balance < 0 && <p className="mt-1 text-xs text-on-surface-variant">{t('studentHome.debtContact')}</p>}
        </div>

        <div className="stagger-item">
          <div className="section-header">
            <h2 className="m3-title-lg">{t('studentHome.upcomingTasks')}</h2>
            <button
              onClick={() => {
                haptic?.light()
                setShowAllTasks(true)
              }}
              className="text-sm font-semibold text-primary"
            >
              {t('common.viewAll')}
            </button>
          </div>
          <div className="m3-card space-y-0">
            {homework.slice(0, 4).map((item, index) => (
              <div key={item.id}>
                <div className="flex items-start gap-3 py-3">
                  <button onClick={() => toggleHomework(item.id, item.submissionId)} className="mt-0.5 transition-transform active:scale-90">
                    {item.done ? <CheckCircle size={22} className="text-paid-green" /> : <Circle size={22} className="text-outline" />}
                  </button>
                  <div 
                    className="min-w-0 flex-1 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => {
                      haptic?.selection()
                      setSelectedTask(item)
                    }}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-high px-2 py-0.5 text-[10px] font-bold tracking-wide text-on-surface-variant">
                        {item.subject}
                      </span>
                      {item.overdue ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-partial-orange">
                          <AlertTriangle size={10} /> {item.due}
                        </span>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant">{item.due}</span>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${item.done ? 'line-through text-on-surface-variant' : 'text-on-surface'} ${item.overdue && !item.done ? 'rounded-xl border border-debt-red/30 bg-debt-red/5 px-2 py-1' : ''}`}>
                      {item.title}
                    </p>
                  </div>
                </div>
                {index < homework.slice(0, 4).length - 1 && <hr className="divider" />}
              </div>
            ))}

            {!homework.length && (
              <div className="py-8 text-center text-sm text-on-surface-variant">
                {t('studentHome.noTasks')}
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal isOpen={showAllTasks} onClose={() => setShowAllTasks(false)} title={t('studentHome.upcomingTasks')}>
        <div className="space-y-4 pt-2">
          {homework.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-surface-high p-4">
              <button onClick={() => toggleHomework(item.id, item.submissionId)} className="mt-0.5 transition-transform active:scale-90">
                {item.done ? <CheckCircle size={22} className="text-paid-green" /> : <Circle size={22} className="text-outline" />}
              </button>
              <div 
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => {
                  haptic?.selection()
                  setSelectedTask(item)
                }}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface-highest px-2 py-0.5 text-[10px] font-bold tracking-wide text-on-surface-variant">
                    {item.subject}
                  </span>
                  <span className={`text-[10px] font-bold ${item.overdue ? 'text-partial-orange' : 'text-on-surface-variant'}`}>
                    {item.due}
                  </span>
                </div>
                <p className={`text-sm font-medium ${item.done ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                  {item.title}
                </p>
              </div>
            </div>
          ))}
          {!homework.length && (
            <div className="py-8 text-center text-sm text-on-surface-variant">
              {t('studentHome.noTasks')}
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask?.title || ''}>
        {selectedTask && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-surface-high px-3 py-1 text-xs font-bold tracking-wide text-on-surface-variant">
                {selectedTask.subject}
              </span>
              <span className={`text-xs font-medium ${selectedTask.overdue ? 'text-partial-orange' : 'text-on-surface-variant'}`}>
                {selectedTask.due}
              </span>
            </div>
            <div className="rounded-xl bg-surface-high p-4 text-sm text-on-surface">
              {selectedTask.description ? (
                <p className="whitespace-pre-wrap leading-relaxed">{selectedTask.description}</p>
              ) : (
                <p className="italic text-on-surface-variant">{t('studentHome.noDescription') || 'Описание отсутствует'}</p>
              )}
            </div>
            <button
              onClick={() => {
                haptic?.selection()
                toggleHomework(selectedTask.id, selectedTask.submissionId)
                setSelectedTask(null)
              }}
              className="m3-btn-filled w-full"
            >
              {selectedTask.done ? (t('studentHome.markNotDone') || 'Отменить') : (t('studentHome.markDone') || 'Отметить как выполнено')}
            </button>
          </div>
        )}
      </Modal>

      <BottomNav role="student" />
    </div>
  )
}
