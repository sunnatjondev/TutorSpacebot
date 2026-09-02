import { useState, useEffect, useMemo } from 'react'
import { AlertCircle, BookOpen, Wallet, CheckCircle, CalendarDays, Users, Sparkles, ChevronRight } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { RoleSwitcher } from '../../components/ui/RoleSwitcher'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useParentChildren, useStudentDashboard, useStudentHomework, useStudentSchedule, useStudentPayments } from '../../hooks/api/useStudent'

export default function ParentDashboard() {
  const { user, haptic } = useTelegram()
  const { t, lang } = useI18n()
  const [demoMode, setDemoMode] = useState(false)

  // 1. Fetch connected children
  const { data: realChildren, isLoading: loadingChildren, isError: childrenError, error: childrenLoadError } = useParentChildren(user?.id)

  const children = useMemo(() => {
    if (realChildren && realChildren.length > 0) return realChildren
    if (demoMode) {
      return [{
        id: 'demo-child-1',
        first_name: lang === 'ru' ? 'Азиз (Демо)' : 'Aziz (Demo)',
        last_name: lang === 'ru' ? 'Каримов' : 'Karimov',
        username: 'aziz_k'
      }]
    }
    return []
  }, [realChildren, demoMode, lang])

  const [selectedChildId, setSelectedChildId] = useState(null)

  // Auto-select first child when loaded
  useEffect(() => {
    if (children && children.length > 0 && (!selectedChildId || !children.some(c => c.id === selectedChildId))) {
      setSelectedChildId(children[0].id)
    }
  }, [children, selectedChildId])

  const selectedChild = useMemo(() => {
    return (children || []).find(c => c.id === selectedChildId)
  }, [children, selectedChildId])

  // Week start for Schedule (Monday of current week)
  const weekStartKey = useMemo(() => {
    const baseDate = new Date()
    const day = baseDate.getDay()
    const monday = new Date(baseDate)
    monday.setDate(baseDate.getDate() - ((day === 0 ? 7 : day) - 1))
    monday.setHours(0, 0, 0, 0)
    return monday.getTime()
  }, [])

  // 2. Fetch data for selected child
  const isDemo = demoMode && (!realChildren || realChildren.length === 0)
  const { data: realDash, isLoading: loadingDash } = useStudentDashboard(user?.id, isDemo ? null : selectedChildId)
  const { data: realHomeworks, isLoading: loadingHw } = useStudentHomework(user?.id, isDemo ? null : selectedChildId)
  const { data: realPayments, isLoading: loadingPayments } = useStudentPayments(user?.id, isDemo ? null : selectedChildId)
  const { data: realSessions, isLoading: loadingSchedule } = useStudentSchedule(user?.id, weekStartKey, isDemo ? null : selectedChildId)

  const dash = isDemo ? {
    attendance: 94,
    balance: 0,
    homeworkCount: 2,
    homeworkOverdue: 0,
    nextLesson: {
      scheduled_at: new Date(Date.now() + 3600000 * 3).toISOString(),
      group: {
        subject: lang === 'ru' ? 'Математика (IELTS)' : 'Matematika (IELTS)',
        teacher: { first_name: 'Sunnatjon', last_name: 'Dev' }
      }
    }
  } : realDash

  const homeworks = isDemo ? [
    {
      id: 'demo-hw-1',
      status: 'done',
      homework: {
        title: lang === 'ru' ? 'Тригонометрия: №12' : 'Trigonometriya 12-mashq',
        description: lang === 'ru' ? 'Система уравнений (1-10 примеры)' : 'Tenglamalar sistemasi (1-10 misollar)',
        due_at: new Date(Date.now() + 86400000).toISOString(),
        group: { subject: lang === 'ru' ? 'Математика' : 'Matematika' }
      }
    },
    {
      id: 'demo-hw-2',
      status: 'pending',
      homework: {
        title: lang === 'ru' ? 'Физика: 2-й закон Ньютона' : 'Fizika: Nyutonning 2-qonuni',
        description: lang === 'ru' ? 'Сборник задач стр. 45' : 'Masalalar to\'plami 45-bet',
        due_at: new Date(Date.now() + 86400000 * 2).toISOString(),
        group: { subject: lang === 'ru' ? 'Физика' : 'Fizika' }
      }
    }
  ] : realHomeworks

  const payments = isDemo ? [
    {
      id: 'demo-pay-1',
      status: 'paid',
      amount: 450000,
      period_month: '09',
      period_year: 2026,
      group: { name: 'Guruh A', subject: lang === 'ru' ? 'Математика' : 'Matematika' }
    }
  ] : realPayments

  const sessions = isDemo ? [
    {
      id: 'demo-s-1',
      scheduled_at: new Date(Date.now() + 3600000 * 3).toISOString(),
      duration_min: 90,
      status: 'upcoming',
      group: { name: 'Guruh A', subject: lang === 'ru' ? 'Математика' : 'Matematika' },
      attendance: [{ student_id: 'demo-child-1', present: true }]
    }
  ] : realSessions

  const [activeSubTab, setActiveSubTab] = useState('summary') // 'summary' | 'schedule' | 'payments' | 'homework'

  const attendance = dash?.attendance ?? 0
  const balance = dash?.balance ?? 0
  const hwCount = dash?.homeworkCount ?? 0
  const hwOverdue = dash?.homeworkOverdue ?? 0
  const nextLesson = dash?.nextLesson

  const childName = selectedChild 
    ? `${selectedChild.first_name} ${selectedChild.last_name || ''}`.trim()
    : 'Farzandingiz'

  if (loadingChildren && !demoMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-lowest">
        <div className="flex flex-col items-center gap-5">
          <div className="h-10 w-10 rounded-full border-[3px] border-surface-container-highest border-t-brand animate-spin" />
          <p className="m3-label text-on-surface-variant font-medium animate-pulse">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // If parent has no linked children yet
  if (!children || children.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-lowest">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center text-primary shadow-glow-sm">
            <Users size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-on-surface">
              {lang === 'ru' ? 'Свяжите аккаунт ребенка' : 'Farzandingizni ulang'}
            </h1>
            <p className="text-on-surface-variant text-xs max-w-xs leading-relaxed">
              {lang === 'ru'
                ? 'Вы еще не привязали ни одного ученика. Попросите ребенка скопировать ссылку привязки из его Настроек и отправить её вам.'
                : 'Siz hali o\'quvchini ulamadingiz. Farzandingiz sozlamalar bo\'limidan ota-ona havolasini olib, sizga yuborishini so\'rang.'}
            </p>
          </div>

          <button
            onClick={() => {
              haptic?.medium?.()
              setDemoMode(true)
            }}
            className="w-full max-w-xs py-3.5 px-4 rounded-2xl bg-brand text-on-primary font-bold text-sm shadow-glow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            <span>{lang === 'ru' ? 'Включить ДЕМО-просмотр' : 'DEMO ko\'rinishni yoqish'}</span>
          </button>

          <div className="w-full max-w-xs pt-3">
            <RoleSwitcher currentRole="parent" />
          </div>
        </div>
        <BottomNav role="parent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6 pb-24 space-y-4">
        {/* Child Selector Header */}
        <div className="animate-slide-down flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-on-surface">
              {lang === 'ru' ? 'Кабинет родителя' : 'Ota-ona kabineti'}
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {lang === 'ru' ? 'Контроль успеваемости детей' : 'Farzandlar muvaffaqiyati nazorati'}
            </p>
          </div>
          {children.length > 1 && (
            <div className="flex items-center gap-1 bg-surface-high/30 rounded-full p-1 border border-outline-variant/10">
              {children.map(c => {
                const isSel = c.id === selectedChildId
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      haptic?.selection()
                      setSelectedChildId(c.id)
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      isSel ? 'bg-brand text-on-primary shadow-m3-elevation-1' : 'text-on-surface-variant'
                    }`}
                  >
                    {c.first_name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Child Info Banner */}
        <div className="flex items-center gap-3 bg-surface-high/20 rounded-[24px] p-4 border border-outline-variant/10">
          <Avatar name={childName} size="md" />
          <div>
            <p className="font-bold text-on-surface text-base">{childName}</p>
            {selectedChild?.username && <p className="text-xs text-on-surface-variant">@{selectedChild.username}</p>}
          </div>
        </div>

        {/* Navigation Tabs (Summary | Schedule | Homework | Payments) */}
        <div className="flex gap-1 bg-surface-high/40 rounded-[20px] p-1.5 border border-outline-variant/10">
          {[
            { key: 'summary', label: lang === 'ru' ? 'Дашборд' : 'Umumiy' },
            { key: 'schedule', label: lang === 'ru' ? 'Уроки' : 'Darslar' },
            { key: 'homework', label: lang === 'ru' ? 'ДЗ' : 'Vazifalar' },
            { key: 'payments', label: lang === 'ru' ? 'Оплата' : 'To\'lovlar' }
          ].map(tab => {
            const isAct = activeSubTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => {
                  haptic?.selection()
                  setActiveSubTab(tab.key)
                }}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-[16px] transition-all duration-200 ${
                  isAct ? 'bg-surface text-primary shadow-m3-elevation-1' : 'text-on-surface-variant hover:bg-surface/30'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Dynamic Sub-Tab Rendering */}
        {activeSubTab === 'summary' && (
          <div className="space-y-4 animate-fade-in">
            {/* Next Lesson Hero Card */}
            <div
              className="stagger-item m3-card !p-5 bg-gradient-to-br from-[#8b5cf6]/20 via-surface-container to-surface-container border border-[#8b5cf6]/35 dark:border-[#a855f7]/35 cursor-pointer active:scale-[0.98] transition-all duration-200 shadow-sm"
              onClick={() => {
                haptic?.light()
                setActiveSubTab('schedule')
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-primary/20 text-primary px-3 py-1 text-[11px] font-bold tracking-wider uppercase border border-primary/30 flex items-center gap-1.5">
                  <Sparkles size={12} />
                  <span>{lang === 'ru' ? 'СЛЕДУЮЩИЙ УРОК' : 'KEYINGI DARS'}</span>
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
                {nextLesson?.group?.subject || (lang === 'ru' ? 'Нет запланированных уроков' : 'Darslar rejalashtirilmagan')}
              </h2>

              {nextLesson?.group?.teacher ? (
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={nextLesson.group.teacher.first_name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-on-surface">
                        {nextLesson.group.teacher.first_name} {nextLesson.group.teacher.last_name || ''}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        {lang === 'ru' ? 'Преподаватель' : 'O\'qituvchi'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary text-xs font-bold shrink-0">
                    <span>{lang === 'ru' ? 'Уроки' : 'Darslar'}</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant pt-1">
                  {lang === 'ru' ? 'Нажмите, чтобы открыть расписание занятий' : 'Dars jadvalini ko\'rish uchun bosing'}
                </p>
              )}
            </div>

            {/* 3-Column Metrics Grid */}
            <div className="grid grid-cols-3 gap-2.5 stagger-item">
              <div className="m3-card flex flex-col items-center justify-center p-3 text-center">
                <span className="text-[11px] font-bold text-on-surface-variant">{t('studentHome.attendance')}</span>
                <span className="text-xl font-extrabold text-paid-green mt-1.5">{attendance}%</span>
                <span className="text-[9px] text-on-surface-variant/70 mt-0.5">{lang === 'ru' ? 'посещений' : 'davomat'}</span>
              </div>

              <div className="m3-card flex flex-col items-center justify-center p-3 text-center">
                <span className="text-[11px] font-bold text-on-surface-variant">{lang === 'ru' ? 'ДЗ' : 'Vazifalar'}</span>
                <span className="text-xl font-extrabold text-on-surface mt-1.5">{hwCount}</span>
                <span className={`text-[9px] mt-0.5 font-semibold ${hwOverdue > 0 ? 'text-debt-red' : 'text-on-surface-variant/70'}`}>
                  {hwOverdue > 0 ? (lang === 'ru' ? `${hwOverdue} долг` : `${hwOverdue} ta qarz`) : (lang === 'ru' ? 'активных' : 'faol')}
                </span>
              </div>

              <div
                className="m3-card flex flex-col items-center justify-center p-3 text-center cursor-pointer active:scale-95 transition-transform"
                onClick={() => {
                  haptic?.light()
                  setActiveSubTab('payments')
                }}
              >
                <span className="text-[11px] font-bold text-on-surface-variant">{t('studentHome.balance')}</span>
                <span className={`text-sm font-extrabold mt-1.5 truncate max-w-full ${balance < 0 ? 'text-debt-red' : 'text-paid-green'}`}>
                  {formatUZS(balance, false, lang)}
                </span>
                <span className="text-[9px] text-primary font-semibold mt-0.5 flex items-center gap-0.5">
                  <span>{lang === 'ru' ? 'Оплата' : 'To\'lov'}</span>
                  <ChevronRight size={9} />
                </span>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'schedule' && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="m3-title-md !font-sans !text-base">{lang === 'ru' ? 'Расписание на эту неделю' : 'Ushbu haftalik dars jadvali'}</h3>
            {loadingSchedule ? (
              <p className="py-8 text-center text-xs text-on-surface-variant">{t('common.loading')}</p>
            ) : !sessions || sessions.length === 0 ? (
              <div className="m3-card py-8 text-center text-on-surface-variant">
                <CalendarDays size={32} className="mx-auto text-on-surface-variant/40 mb-3" />
                <p className="text-sm">{lang === 'ru' ? 'На эту неделю занятий нет.' : 'Bu hafta uchun darslar yo\'q.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(s => {
                  const date = new Date(s.scheduled_at)
                  const dayName = date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { weekday: 'long' })
                  const dateStr = date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'short' })
                  const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                  const isAttended = s.attendance?.some(a => a.student_id === selectedChildId && a.present)
                  
                  return (
                    <div key={s.id} className="m3-card p-4 border border-outline-variant/15 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-primary tracking-wider bg-brand/10 px-2 py-0.5 rounded-full">{dayName}, {dateStr}</span>
                        <h4 className="font-bold text-on-surface text-base mt-1.5">{s.group?.subject || 'Boshqa'}</h4>
                        <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                          <Users size={12} className="text-primary shrink-0" />
                          <span>{s.group?.name}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-on-surface text-base">{timeStr}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block mt-1 ${isAttended ? 'text-paid-green bg-paid-green/10' : 'text-on-surface-variant bg-surface-high'} px-2 py-0.5 rounded-full`}>
                          {isAttended ? (lang === 'ru' ? 'Присутствовал' : 'Qatnashdi') : (lang === 'ru' ? 'Был пропуск / Предстоит' : 'Qatnashmadi / Kutilmoqda')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'homework' && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="m3-title-md !font-sans !text-base">{lang === 'ru' ? 'Домашние задания' : 'Uy vazifalari'}</h3>
            {loadingHw ? (
              <p className="py-8 text-center text-xs text-on-surface-variant">{t('common.loading')}</p>
            ) : !homeworks || homeworks.length === 0 ? (
              <div className="m3-card py-8 text-center text-on-surface-variant">
                <BookOpen size={32} className="mx-auto text-on-surface-variant/40 mb-3" />
                <p className="text-sm">{lang === 'ru' ? 'Заданий пока нет.' : 'Hali vazifalar berilmagan.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {homeworks.map(hw => {
                  const done = hw.status === 'done' || hw.status === 'graded'
                  const due = hw.homework?.due_at
                    ? new Date(hw.homework.due_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'short', day: 'numeric' })
                    : '-'
                  
                  return (
                    <div key={hw.id} className="m3-card p-4 border border-outline-variant/15 flex justify-between items-center">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-high px-2.5 py-0.5 rounded-full">{hw.homework?.group?.subject || 'Vazifa'}</span>
                        <h4 className="font-bold text-on-surface text-sm truncate mt-1.5">{hw.homework?.title || '-'}</h4>
                        {hw.homework?.description && <p className="text-xs text-on-surface-variant truncate mt-0.5">{hw.homework.description}</p>}
                        <span className="text-[10px] text-on-surface-variant block mt-1">{lang === 'ru' ? 'Срок сдачи' : 'Muddati'}: <b>{due}</b></span>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {done ? (
                          <span className="text-[10px] font-bold text-paid-green bg-paid-green/10 px-2 py-1 rounded-full uppercase tracking-wider">
                            {lang === 'ru' ? 'Сдано' : 'Topshirildi'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-debt-red bg-debt-red/10 px-2 py-1 rounded-full uppercase tracking-wider">
                            {lang === 'ru' ? 'Не сдано' : 'Bajarilmagan'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'payments' && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="m3-title-md !font-sans !text-base">{lang === 'ru' ? 'История начислений и оплат' : 'To\'lovlar tarixi'}</h3>
            {loadingPayments ? (
              <p className="py-8 text-center text-xs text-on-surface-variant">{t('common.loading')}</p>
            ) : !payments || payments.length === 0 ? (
              <div className="m3-card py-8 text-center text-on-surface-variant">
                <Wallet size={32} className="mx-auto text-on-surface-variant/40 mb-3" />
                <p className="text-sm">{lang === 'ru' ? 'Счетов на оплату нет.' : 'To\'lov hisoblari yo\'q.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map(p => {
                  const paid = p.status === 'paid'
                  return (
                    <div key={p.id} className="m3-card p-4 border border-outline-variant/15 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-high px-2 py-0.5 rounded-full">
                          {p.period_month}-{p.period_year}
                        </span>
                        <h4 className="font-bold text-on-surface text-sm mt-1.5">{p.group?.subject || 'Dars to\'lovi'}</h4>
                        <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                          <Users size={12} className="text-primary shrink-0" />
                          <span>{p.group?.name}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-on-surface text-base">{formatUZS(p.amount)}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block mt-1.5 ${paid ? 'text-paid-green bg-paid-green/10' : 'text-debt-red bg-debt-red/10'} px-2 py-0.5 rounded-full`}>
                          {paid ? (lang === 'ru' ? 'Оплачено' : 'To\'landi') : (lang === 'ru' ? 'Долг' : 'To\'lanmagan')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav role="parent" />
    </div>
  )
}
