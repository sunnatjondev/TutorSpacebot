import { useState } from 'react'
import { User, Layers, CalendarDays, Bell, Plus, CheckCircle2, TrendingUp, BookOpen, ChevronRight } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useTeacherDashboard, useTeacherGroups, useCreateGroup, useTeacherPayments, useUpdateSession, useDeleteSession } from '../../hooks/api/useTeacher'
import { useNavigate } from 'react-router-dom'


function CreateGroupModal({ onClose, onCreated, telegramId, haptic }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const createGroupMutation = useCreateGroup()

  const handleCreate = async () => {
    if (!name.trim()) return

    setLoading(true)
    setError(null)
    haptic?.medium()

    try {
      const data = await createGroupMutation.mutateAsync({ telegramId, name: name.trim(), subject: subject || 'BOSHQA' })
      haptic?.success?.()
      await onCreated(data)
      onClose()
    } catch (err) {
      console.error('[createGroup] error:', err)
      let displayError = err.message || "Xatolik yuz berdi. Qayta urinib ko'ring."
      if (err.message === 'plan_limit_reached') {
        displayError = "Ta'rif rejangizdagi guruhlar limitiga yetdingiz! Cheklovni olib tashlash uchun obunangizni yangilang."
      } else if (err.message === 'subscription_expired') {
        displayError = "Obuna muddati tugagan! Guruh yaratish uchun obunangizni uzaytiring."
      }
      setError(displayError)
      haptic?.warning?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-on-surface-variant">Guruh nomi</label>
        <input
          className="m3-input"
          placeholder="Masalan: Fizika 101"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-on-surface-variant">Fan</label>
        <input
          className="m3-input"
          placeholder="Masalan: Matematika"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
      </div>
      {error && (
        <div className="rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
      <button className="m3-btn-filled w-full" onClick={handleCreate} disabled={loading}>
        {loading ? 'Yaratilmoqda...' : 'Yaratish'}
      </button>
    </div>
  )
}

function AttendanceModal({ groups, groupAttendance, lang, attendanceMonth, attendanceYear, onChangeMonth, haptic }) {
  const [expandedGroupId, setExpandedGroupId] = useState(null)
  
  const monthNamesUz = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']
  const monthNamesRu = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const monthName = lang === 'ru' ? monthNamesRu[attendanceMonth - 1] : monthNamesUz[attendanceMonth - 1]

  const handlePrevMonth = () => {
    haptic?.light?.()
    if (attendanceMonth === 1) {
      onChangeMonth(12, attendanceYear - 1)
    } else {
      onChangeMonth(attendanceMonth - 1, attendanceYear)
    }
  }

  const handleNextMonth = () => {
    haptic?.light?.()
    if (attendanceMonth === 12) {
      onChangeMonth(1, attendanceYear + 1)
    } else {
      onChangeMonth(attendanceMonth + 1, attendanceYear)
    }
  }

  const tNoData = lang === 'ru' ? 'Нет данных за этот месяц' : 'Bu oy uchun maʼlumot yoʻq'

  return (
    <div className="space-y-4">
      {/* Month Navigator Toggles */}
      <div className="flex items-center justify-between bg-surface-high p-3 rounded-2xl border border-outline-variant/30">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded-lg hover:bg-surface-highest text-on-surface"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-bold text-sm text-on-surface">
          {monthName} {attendanceYear}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 rounded-lg hover:bg-surface-highest text-on-surface"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {!groupAttendance || groupAttendance.length === 0 ? (
        <p className="text-center text-on-surface-variant py-8">{tNoData}</p>
      ) : (
        <div className="space-y-3">
          {groupAttendance.map(ga => {
            const group = groups?.find(g => g.id === ga.groupId)
            if (!group) return null
            const isExpanded = expandedGroupId === ga.groupId

            return (
              <div 
                key={ga.groupId} 
                className="bg-surface-high rounded-2xl border border-outline-variant/20 overflow-hidden transition-all duration-200"
              >
                {/* Header Row */}
                <button
                  onClick={() => {
                    haptic?.light?.()
                    setExpandedGroupId(isExpanded ? null : ga.groupId)
                  }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-surface-highest/40 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={group.name} size="md" color={group.color} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{group.name}</p>
                      <p className="text-[10px] text-on-surface-variant truncate font-medium mt-0.5">
                        {group.subject} • {ga.present} / {ga.total} {lang === 'ru' ? 'посещ.' : 'kelgan'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-serif font-bold text-base text-on-surface">{ga.percent}%</span>
                    <svg 
                      className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Students Details Accordion */}
                {isExpanded && (
                  <div className="border-t border-outline-variant/10 bg-surface/30 px-3 py-2 space-y-2">
                    {!ga.students || ga.students.length === 0 ? (
                      <p className="text-xs text-on-surface-variant/70 text-center py-2">
                        {lang === 'ru' ? 'Нет записанных учеников' : 'Yozilgan talabalar yo\'q'}
                      </p>
                    ) : (
                      ga.students.map(s => {
                        const absentCount = s.totalCount - s.presentCount
                        return (
                          <div key={s.studentId} className="flex items-center justify-between py-1.5 px-1 border-b border-outline-variant/5 last:border-b-0">
                            <span className="text-xs font-semibold text-on-surface truncate pr-2">{s.name}</span>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-[10px] text-on-surface-variant font-medium">
                                {s.presentCount}/{s.totalCount}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center text-[9px] font-bold text-paid-green bg-paid-green/10 px-1.5 py-0.5 rounded">
                                  🟢 {s.presentCount}
                                </span>
                                <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded ${absentCount > 0 ? 'text-debt-red bg-debt-red/10' : 'text-on-surface-variant/40 bg-surface-high/50'}`}>
                                  🔴 {absentCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function TeacherDashboard() {
  const { user, greeting, greetingRu, haptic, openTelegramLink, tg } = useTelegram()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [showAttendance, setShowAttendance] = useState(false)
  const todayDate = new Date()
  const [attendanceMonth, setAttendanceMonth] = useState(() => todayDate.getMonth() + 1)
  const [attendanceYear, setAttendanceYear] = useState(() => todayDate.getFullYear())

  const telegramId = user?.id
  const { data: dash, refetch: refetchDash } = useTeacherDashboard(telegramId, attendanceMonth, attendanceYear)
  const { data: groups } = useTeacherGroups(telegramId)
  const { data: payments } = useTeacherPayments(telegramId, 'all')

  const updateSessionMutation = useUpdateSession()
  const deleteSessionMutation = useDeleteSession()

  const handleOverdueAction = async (sessionId, action) => {
    haptic?.medium()
    try {
      if (action === 'done') {
        await updateSessionMutation.mutateAsync({ sessionId, status: 'done' })
      } else if (action === 'delete') {
        if (confirm(lang === 'ru' ? 'Точно удалить этот урок?' : "Bu darsni aniq o'chirmoqchimisiz?")) {
          await deleteSessionMutation.mutateAsync(sessionId)
        } else {
          return
        }
      }
      haptic?.success()
      refetchDash()
    } catch {
      alert(lang === 'ru' ? 'Ошибка при выполнении действия' : 'Xatolik yuz berdi')
    }
  }

  const currentMonth = attendanceMonth
  const currentYear = attendanceYear
  const currentMonthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'long' })
  
  // 1. Calculate Monthly Revenue (Paid payments this month)
  const thisMonthPayments = payments?.filter(p => p.period_month === currentMonth && p.period_year === currentYear) || []
  const earnedThisMonth = thisMonthPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  // 2. Unpaid amounts and debtors
  const unpaidThisMonth = thisMonthPayments
    .filter(p => p.status === 'unpaid' || p.status === 'partial')
  const debtThisMonth = unpaidThisMonth
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  // 3. Payment % across all groups
  const totalStudentsExpectedToPay = thisMonthPayments.length
  const totalStudentsPaid = thisMonthPayments.filter(p => p.status === 'paid').length
  const overallPaymentPercent = totalStudentsExpectedToPay > 0 
    ? Math.round((totalStudentsPaid / totalStudentsExpectedToPay) * 100) 
    : 0

  const today = new Date().toLocaleDateString('uz-UZ', { month: 'long', day: 'numeric' })
  const firstName = user?.first_name || "O'qituvchi"
  const recentGroups = (groups || []).slice(0, 3)
  const localizedGreeting = lang === 'ru' ? greetingRu : greeting
  const getSessionBadgeClass = (status) => {
    if (status === 'done') return 'badge-paid'
    if (status === 'ongoing') return 'badge-partial'
    return 'badge-debt'
  }

  const getSessionStatusLabel = (status) => {
    if (status === 'done') return t('common.done')
    if (status === 'ongoing') return t('common.inProgress')
    return t('common.upcoming')
  }

  const handleRemind = (payment) => {
    haptic?.medium()
    const student = payment.student
    if (!student) return

    const name = `${student.first_name || ''} ${student.last_name || ''}`.trim()
    const amountStr = formatUZS(payment.amount)
    const text = `Assalomu alaykum, ${name}. Sizda TutorSpace bot orqali ${amountStr} miqdorida to'lov kutilmoqda. Iltimos, imkon qadar tezroq amalga oshiring.`

    if (student.username) {
      openTelegramLink(`https://t.me/${student.username.replace(/^@/, '')}`)
    } else {
      navigator.clipboard.writeText(text).then(() => {
        tg?.showAlert(`Talaba username'ga ega emas. Eslatma xabari buferga nusxalandi! Siz uni boshqa kanallar orqali yuborishingiz mumkin:\n\n"${text}"`)
      }).catch(() => {
        tg?.showAlert(`Eslatma xabari:\n\n"${text}"`)
      })
    }
  }

  const handleGroupCreated = async (group) => {

    if (group?.id) {
      navigate(`/teacher/groups/${group.id}`)
      return
    }

    navigate('/teacher/groups')
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6 pb-28">
        <div className="mb-6 animate-slide-down flex justify-between items-start">
          <div>
            <h1 className="m3-display-md">
              {t('teacherHome.greeting', { greeting: localizedGreeting, name: firstName })}
            </h1>
            <p className="mt-2 m3-body-lg">{t('teacherHome.subtitle')}</p>
          </div>
        </div>

        {/* Subscription Banner */}
        {dash?.subscription && dash.subscription.status === 'expired' && (
          <div className="mb-6 m3-card bg-red-500/10 border-2 border-red-500/30 flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-red-500 font-bold text-lg mb-1">{lang === 'ru' ? 'Подписка истекла' : 'Obunangiz tugagan'}</h3>
              <p className="text-on-surface-variant text-sm pr-2">
                {lang === 'ru' ? 'Оплатите подписку, чтобы продолжить работу со студентами.' : 'Talabalar bilan ishlashni davom ettirish uchun obunangizni uzaytiring.'}
              </p>
            </div>
            <button 
              onClick={() => { haptic?.selection(); navigate('/teacher/subscription') }}
              className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold whitespace-nowrap active:scale-95 transition-transform shadow-glow-sm shadow-red-500/20"
            >
              {lang === 'ru' ? 'Оплатить' : 'To\'lash'}
            </button>
          </div>
        )}
        {dash?.subscription && (dash.subscription.status === 'trial' || dash.subscription.status === 'active') && (() => {
          const expiresAt = new Date(dash.subscription.expiresAt)
          const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))
          if (daysLeft <= 3 && daysLeft > 0) {
            return (
              <div className="mb-6 m3-card bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-orange-500 font-bold text-base mb-1">{lang === 'ru' ? `Подписка истекает через ${daysLeft} дн.` : `Obunangiz ${daysLeft} kundan so'ng tugaydi`}</h3>
                  <p className="text-on-surface-variant text-xs pr-2">
                    {lang === 'ru' ? 'Оплатите сейчас, чтобы не потерять доступ.' : 'Kirishni yo\'qotmaslik uchun hozir to\'lang.'}
                  </p>
                </div>
                <button 
                  onClick={() => { haptic?.selection(); navigate('/teacher/subscription') }}
                  className="bg-orange-500 text-white px-3 py-1.5 rounded-xl font-bold text-sm whitespace-nowrap active:scale-95 transition-transform"
                >
                  {lang === 'ru' ? 'Продлить' : 'Uzaytirish'}
                </button>
              </div>
            )
          }
          return null
        })()}

        {/* Overdue Sessions Banner */}
        {dash?.overdueSessions?.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-error font-bold text-sm px-1">
              {lang === 'ru' ? 'Просроченные уроки (Не отмечена посещаемость)' : "O'tib ketgan darslar (Davomat belgilanmagan)"}
            </h3>
            {dash.overdueSessions.map(session => (
              <div key={session.id} className="m3-card bg-error-container/10 border border-error/20 flex flex-col gap-3 p-3">
                <div>
                  <p className="font-bold text-on-surface text-sm">{session.groups?.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(session.scheduled_at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOverdueAction(session.id, 'done')}
                    className="flex-1 bg-paid-green/20 text-paid-green font-bold text-xs py-2 rounded-xl active:scale-95 transition-transform"
                  >
                    {lang === 'ru' ? 'Завершить' : 'Yakunlash'}
                  </button>
                  <button 
                    onClick={() => handleOverdueAction(session.id, 'delete')}
                    className="flex-1 bg-error/20 text-error font-bold text-xs py-2 rounded-xl active:scale-95 transition-transform"
                  >
                    {lang === 'ru' ? 'Удалить' : "O'chirish"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Section — clean, minimal */}
        <div className="mb-5 m3-card p-5 relative overflow-hidden stagger-item">
          <div className="absolute top-0 right-0 p-4 opacity-[0.04]">
            <TrendingUp size={80} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-on-surface-variant">{lang === 'ru' ? 'Аналитика за' : 'Tahlillar'} {currentMonthName}</h2>
              <div className="bg-brand/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                {overallPaymentPercent}% {lang === 'ru' ? 'Оплат' : 'To\'lovlar'}
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-4 mt-2">
              <div>
                <div className="mb-1 text-xs text-on-surface-variant">{lang === 'ru' ? 'Доход за месяц' : 'Oylik daromad'}</div>
                <div className="text-3xl font-extrabold text-on-surface">{formatUZS(earnedThisMonth)}</div>
              </div>
              
              {/* Sparkline Chart */}
              {(() => {
                const sparklineData = Array.from({ length: 7 }).map((_, idx) => {
                  const d = new Date()
                  d.setDate(d.getDate() - (6 - idx))
                  const start = new Date(d)
                  start.setHours(0, 0, 0, 0)
                  const end = new Date(d)
                  end.setHours(23, 59, 59, 999)

                  return (payments || [])
                    .filter(p => {
                      if (p.status !== 'paid') return false
                      const pDate = new Date(p.created_at)
                      return pDate >= start && pDate <= end
                    })
                    .reduce((sum, p) => sum + (p.amount || 0), 0)
                })

                const maxVal = Math.max(...sparklineData, 1000)
                const sparklineWidth = 120
                const sparklineHeight = 36
                const points = sparklineData.map((val, idx) => {
                  const x = (idx * sparklineWidth) / 6
                  const y = sparklineHeight - (val / maxVal) * (sparklineHeight - 6) - 3
                  return `${x},${y}`
                }).join(' ')

                const fillPoints = `0,${sparklineHeight} ${points} ${sparklineWidth},${sparklineHeight}`

                return (
                  <div className="flex flex-col items-end gap-1">
                    <svg width={sparklineWidth} height={sparklineHeight} className="overflow-visible">
                      <defs>
                        <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <polygon points={fillPoints} fill="url(#sparkline-grad)" />
                      <polyline points={points} fill="none" stroke="var(--md-sys-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" />
                    </svg>
                    <span className="text-[9px] text-on-surface-variant font-medium uppercase tracking-wider">{lang === 'ru' ? 'За 7 дней' : '7 kunlik trend'}</span>
                  </div>
                )
              })()}
            </div>
            
            <div className="flex items-center gap-3 bg-surface-high p-3 rounded-xl">
              <div className="flex-1">
                <div className="text-[10px] text-on-surface-variant mb-0.5">{lang === 'ru' ? 'Ожидается' : 'Kutilayotgan'}</div>
                <div className="text-sm font-bold text-on-surface">{formatUZS(debtThisMonth)}</div>
              </div>
              <div className="w-px h-8 bg-outline-variant/30 mx-2" />
              <div className="flex-1">
                <div className="text-[10px] text-on-surface-variant mb-0.5">{lang === 'ru' ? 'Должники' : 'Qarzdorlar'}</div>
                <div className="text-sm font-bold text-on-surface">{unpaidThisMonth.length} {lang === 'ru' ? 'студ.' : 'talaba'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3" style={{ gridTemplateRows: 'auto auto' }}>
          {/* Talabalar */}
          <div className="m3-card p-5 flex flex-col items-center justify-center text-center row-span-2 transition-all duration-200 active:scale-[0.98]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 mb-3">
              <User size={20} className="text-primary" />
            </div>
            <p className="text-4xl font-bold text-on-surface leading-none">{dash?.totalStudents ?? '—'}</p>
            <p className="m3-label mt-2">{t('teacherHome.students')}</p>
          </div>
          {/* Guruhlar */}
          <div className="m3-card p-4 flex items-center gap-3 transition-all duration-200 active:scale-[0.98]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tertiary/10 shrink-0">
              <Layers size={18} className="text-tertiary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-on-surface leading-none">{dash?.totalGroups ?? '—'}</p>
              <p className="m3-label mt-0.5">{t('teacherHome.groups')}</p>
            </div>
          </div>
          {/* Bugungi darslar */}
          <div className="m3-card p-4 flex items-center gap-3 transition-all duration-200 active:scale-[0.98]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/10 shrink-0">
              <CalendarDays size={18} className="text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-on-surface leading-none">{dash?.todaySessions?.length ?? 0}</p>
              <p className="m3-label mt-0.5">{t('teacherHome.lessons')}</p>
            </div>
          </div>
        </div>

        <div className="m3-card mb-4 stagger-item">
          <div className="mb-3 flex items-center justify-between">
            <span className="m3-label">{t('teacherHome.recentGroups')}</span>
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
                <div key={group.id} className="relative w-full">
                  <button
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
                    <span className="badge-paid shrink-0">{group.paidPercent ?? 0}%</span>
                  </button>
                  {index < recentGroups.length - 1 && <hr className="w-full h-px bg-outline-variant/20 border-0" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-on-surface-variant">{t('teacherHome.noGroupsYet')}</p>
          )}
        </div>

        <div className="m3-card mb-4 stagger-item">
          <div className="mb-3 flex items-center justify-between">
            <span className="m3-label">{t('teacherHome.today')}</span>
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
                    <span className={`${getSessionBadgeClass(session.status)} whitespace-nowrap`}>
                      {session.status === 'done' ? <CheckCircle2 size={10} /> : null}
                      {getSessionStatusLabel(session.status)}
                    </span>
                  </div>
                  {index < dash.todaySessions.length - 1 && <hr className="w-full h-px bg-outline-variant/20 border-0" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-on-surface-variant">Bugun darslar yo'q</p>
          )}
        </div>

        {/* Upcoming Homeworks Section */}
        <div className="m3-card mb-4 stagger-item">
          <div className="mb-3 flex items-center justify-between">
            <span className="m3-label">{lang === 'ru' ? 'Ближайшие домашние задания' : 'Yaqindagi vazifalar'}</span>
            <BookOpen size={16} className="text-primary" />
          </div>
          {dash?.upcomingHomeworks?.length > 0 ? (
            <div className="space-y-0">
              {dash.upcomingHomeworks.map((hw, index) => (
                <div key={hw.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-on-surface">{hw.title}</p>
                      <p className="text-xs text-on-surface-variant truncate">👥 {hw.group?.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-error font-bold bg-error/15 px-2.5 py-1 rounded-full whitespace-nowrap">
                        ⌛ {new Date(hw.due_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  {index < dash.upcomingHomeworks.length - 1 && <hr className="w-full h-px bg-outline-variant/20 border-0" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-on-surface-variant">
              {lang === 'ru' ? 'Нет запланированных заданий' : 'Muddati bor vazifalar yo\'q'}
            </p>
          )}
        </div>

        {dash?.unpaid?.length > 0 && (
          <div
            className="stagger-item mb-4 m3-card"
            style={{ borderLeft: '4px solid var(--error)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="m3-label text-error">{t('teacherHome.unpaidWeek')}</span>
              <span className="font-serif m3-title-lg">
                {formatUZS(dash.unpaid.reduce((sum, payment) => sum + (payment.amount || 0), 0))}
              </span>
            </div>
            {dash.unpaid.slice(0, 3).map((payment, index) => (
              <div key={index}>
                <div className="flex items-center gap-3 py-3">
                  <Avatar name={`${payment.student?.first_name || '?'} ${payment.student?.last_name || ''}`} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {payment.student?.first_name} {payment.student?.last_name}
                    </p>
                    <p className="text-xs font-bold text-debt-red">{formatUZS(payment.amount)}</p>
                  </div>
                  <button onClick={() => handleRemind(payment)} className="m3-btn-tonal shrink-0 gap-1 text-[11px] px-3 py-1.5 h-auto">
                    <Bell size={12} /> {t('common.remind')}
                  </button>
                </div>
                {index < dash.unpaid.slice(0, 3).length - 1 && <hr className="w-full h-px bg-outline-variant/20 border-0" />}
              </div>
            ))}
          </div>
        )}

        {/* Attendance Stats */}
        <button 
          className="m3-card mb-20 stagger-item w-full text-left active:scale-[0.98] transition-transform"
          onClick={() => { haptic?.light(); setShowAttendance(true) }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-paid-green" />
              <span className="m3-label">{t('teacherAnalytics.attendance') || 'DAVOMAT'}</span>
            </div>
            <ChevronRight size={16} className="text-on-surface-variant" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" strokeWidth="3" className="text-surface-highest"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" strokeWidth="3" className="text-paid-green"
                  strokeDasharray={`${dash?.attendancePercent || 0}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-on-surface">
                {dash?.attendancePercent || 0}%
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-on-surface capitalize">
                {lang === 'ru' ? `Посещаемость: ${currentMonthName}` : `${currentMonthName} oyi davomati`}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                {dash?.attendanceTotalRecords > 0 
                  ? (lang === 'ru' 
                      ? `${dash?.attendancePresent} из ${dash?.attendanceTotalRecords} студ. посетили` 
                      : `${dash?.attendanceTotalRecords} talabadan ${dash?.attendancePresent} tasi kelgan`)
                  : (lang === 'ru'
                      ? 'Нажмите для статистики по группам'
                      : 'Guruhlar statistikasi uchun bosing')}
              </p>
            </div>
          </div>
        </button>
      </div>

      <button
        className="m3-fab"
        onClick={() => {
          haptic?.medium()
          setShowCreate(true)
        }}
      >
        <Plus size={28} />
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

      <Modal isOpen={showAttendance} onClose={() => setShowAttendance(false)} title={lang === 'ru' ? 'Посещаемость' : 'Davomat'}>
        <AttendanceModal 
          groups={groups} 
          groupAttendance={dash?.groupAttendance} 
          lang={lang}
          attendanceMonth={attendanceMonth}
          attendanceYear={attendanceYear}
          onChangeMonth={(month, year) => {
            setAttendanceMonth(month)
            setAttendanceYear(year)
          }}
          haptic={haptic}
        />
      </Modal>

      <BottomNav role="teacher" />
    </div>
  )
}
