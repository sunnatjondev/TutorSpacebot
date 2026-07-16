import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Wallet, CheckCircle, Circle, CalendarDays, User, ChevronRight } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useParentChildren, useStudentDashboard, useStudentHomework, useStudentSchedule, useStudentPayments } from '../../hooks/api/useStudent'

export default function ParentDashboard() {
  const { user, haptic } = useTelegram()
  const { t, lang } = useI18n()

  // 1. Fetch connected children
  const { data: children, isLoading: loadingChildren } = useParentChildren(user?.id)

  const [selectedChildId, setSelectedChildId] = useState(null)

  // Auto-select first child when loaded
  useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
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
  const { data: dash, isLoading: loadingDash } = useStudentDashboard(user?.id, selectedChildId)
  const { data: homeworks, isLoading: loadingHw } = useStudentHomework(user?.id, selectedChildId)
  const { data: payments, isLoading: loadingPayments } = useStudentPayments(user?.id, selectedChildId)
  const { data: sessions, isLoading: loadingSchedule } = useStudentSchedule(user?.id, weekStartKey, selectedChildId)

  const [activeSubTab, setActiveSubTab] = useState('summary') // 'summary' | 'schedule' | 'payments' | 'homework'

  const attendance = dash?.attendance ?? 0
  const balance = dash?.balance ?? 0
  const hwCount = dash?.homeworkCount ?? 0
  const hwOverdue = dash?.homeworkOverdue ?? 0
  const nextLesson = dash?.nextLesson

  const childName = selectedChild 
    ? `${selectedChild.first_name} ${selectedChild.last_name || ''}`.trim()
    : 'Farzandingiz'

  if (loadingChildren) {
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
          <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center text-4xl animate-bounce-slow">
            👨‍👩‍👦
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-on-surface">
              {lang === 'ru' ? 'Свяжите аккаунт ребенка' : 'Farzandingizni ulang'}
            </h1>
            <p className="text-on-surface-variant text-sm max-w-xs leading-relaxed">
              {lang === 'ru'
                ? 'Вы еще не привязали ни одного ученика. Пожалуйста, попросите вашего ребенка скопировать ссылку привязки из настроек его приложения и отправить её вам.'
                : 'Siz hali hech qaysi o\'quvchini ulamadingiz. Iltimos, farzandingizning sozlamalari bo\'limidan ota-ona uchun havola olib, sizga yuborishini so\'rang.'}
            </p>
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
            {/* Next Lesson Box */}
            <div
              className="rounded-[24px] p-5 cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #5a52e0 0%, #7c74ff 60%, #a099ff 100%)', boxShadow: '0 8px 32px rgba(108,99,255,0.3)' }}
              onClick={() => {
                haptic?.light()
                setActiveSubTab('schedule')
              }}
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-widest text-white/80">
                  {lang === 'ru' ? 'СЛЕДУЮЩИЙ УРОК' : 'KEYINGI DARS'}
                </span>
                {nextLesson?.scheduled_at && (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90">
                    {new Date(nextLesson.scheduled_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <h2 className="mb-3 truncate text-2xl font-extrabold leading-tight text-white">
                {nextLesson?.group?.subject || (lang === 'ru' ? 'Нет запланированных уроков' : 'Darslar rejalashtirilmagan')}
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
                <p className="text-sm text-white/70">{lang === 'ru' ? 'Дата и преподаватель появятся позже' : 'Dars jadvali keyinroq ko\'rsatiladi'}</p>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
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
                <p className="text-2xl font-extrabold text-on-surface mt-1">
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
                    <span className="badge-unpaid text-[10px]">{lang === 'ru' ? `${hwOverdue} долг` : `${hwOverdue} ta qarz`}</span>
                  )}
                </div>
                <p className="text-xs font-medium tracking-wide text-on-surface-variant">{lang === 'ru' ? 'Задачи ДЗ' : 'Vazifalar'}</p>
                <p className="text-2xl font-extrabold text-on-surface mt-1">{hwCount}</p>
              </div>
            </div>

            {/* Financial Card */}
            <div className="m3-card flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase">{lang === 'ru' ? 'Текущий баланс ребенка' : 'Farzandingiz hisobi'}</p>
                <p className={`text-2xl font-extrabold mt-2 ${balance < 0 ? 'text-debt-red' : 'text-paid-green'}`}>
                  {formatUZS(balance)}
                </p>
              </div>
              <div className={`p-3.5 rounded-2xl ${balance < 0 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-500'}`}>
                <Wallet size={24} />
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
                        <p className="text-xs text-on-surface-variant mt-0.5">👥 {s.group?.name}</p>
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
                        <p className="text-xs text-on-surface-variant mt-0.5">👥 {p.group?.name}</p>
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
