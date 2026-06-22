import { useState } from 'react'
import { User, Layers, CalendarDays, Bell, Plus, CheckCircle2, TrendingUp, AlertCircle, BookOpen } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useTeacherDashboard, useTeacherGroups, useCreateGroup, useTeacherPayments } from '../../hooks/api/useTeacher'
import { useNavigate } from 'react-router-dom'

function StatCard({ icon: Icon, value, label, iconBg }) {
  return (
    <div className="m3-card flex-1 p-4 flex flex-col items-center justify-center text-center gap-2">
      <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${iconBg}`}>
        <Icon size={24} className="text-on-surface" />
      </div>
      <p className="font-serif text-3xl font-bold text-on-surface">{value ?? '-'}</p>
      <p className="m3-label text-center">{label}</p>
    </div>
  )
}

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

export default function TeacherDashboard() {
  const { user, greeting, greetingRu, haptic, openTelegramLink, tg } = useTelegram()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  const telegramId = user?.id
  const { data: dash } = useTeacherDashboard(telegramId)
  const { data: groups } = useTeacherGroups(telegramId)
  const { data: payments } = useTeacherPayments(telegramId, 'all')

  const todayDate = new Date()
  const currentMonth = todayDate.getMonth() + 1
  const currentYear = todayDate.getFullYear()
  
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
      <div className="page-wrapper px-4 pt-6">
        <div className="mb-6 animate-slide-down flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-serif font-bold text-on-surface leading-tight">
              {t('teacherHome.greeting', { greeting: localizedGreeting, name: firstName })}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant font-medium">{t('teacherHome.subtitle')}</p>
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

        {/* Revenue Card */}
        <div className="mb-6 bg-gradient-to-br from-[#4c1d95]/40 to-[#581c87]/10 border border-[#9333ea]/50 rounded-[28px] p-5 relative overflow-hidden shadow-[0_0_20px_rgba(147,51,234,0.15)] animate-slide-up">
          <div className="absolute top-4 right-4 w-10 h-10 bg-[#9333ea]/20 rounded-full flex items-center justify-center">
            <TrendingUp size={20} className="text-[#c084fc]" />
          </div>
          <h2 className="text-sm font-semibold text-purple-200/80 mb-2">{t('teacherAnalytics.earnedThisMonth')}</h2>
          <div className="text-3xl font-extrabold text-white tracking-tight mb-5 drop-shadow-sm">
            {formatUZS(earnedThisMonth, true)}
          </div>
          
          <div className="bg-[#3b0764]/40 rounded-2xl p-3 border border-white/5 backdrop-blur-sm">
            <p className="text-xs text-purple-200/80 mb-2 font-medium">{t('teacherAnalytics.paymentProgress')}</p>
            
            {/* Visual Chart Area */}
            <div className="flex gap-1 h-8 mb-2 items-end">
              {Array.from({ length: 12 }).map((_, i) => {
                const threshold = (i / 12) * 100
                const isFilled = overallPaymentPercent > threshold
                return (
                  <div 
                    key={i} 
                    className={`flex-1 rounded-t-sm transition-all duration-700 ${isFilled ? 'bg-[#c084fc]' : 'bg-white/10'}`}
                    style={{ 
                      height: isFilled ? `${40 + (Math.random() * 60)}%` : '20%',
                      opacity: isFilled ? 1 : 0.5
                    }}
                  />
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{overallPaymentPercent}%</span>
              <span className="text-[10px] font-bold text-purple-200/80">{totalStudentsPaid} / {totalStudentsExpectedToPay}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="m3-card p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 mb-2 rounded-xl bg-tertiary/20 flex items-center justify-center">
              <User size={16} className="text-tertiary" />
            </div>
            <p className="text-lg font-bold text-on-surface">{dash?.totalStudents || 0}</p>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">{t('teacherHome.students')}</p>
          </div>
          <div className="m3-card p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 mb-2 rounded-xl bg-brand/20 flex items-center justify-center">
              <Layers size={16} className="text-brand" />
            </div>
            <p className="text-lg font-bold text-on-surface">{dash?.totalGroups || 0}</p>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">{t('teacherHome.groups')}</p>
          </div>
          <div className="m3-card p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 mb-2 rounded-xl bg-paid-green/20 flex items-center justify-center">
              <BookOpen size={16} className="text-paid-green" />
            </div>
            <p className="text-lg font-bold text-on-surface">{dash?.attendancePercent || 0}%</p>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">{t('teacherAnalytics.attendance') || 'DAVOMAT'}</p>
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

        {/* Debtors List */}
        {unpaidThisMonth.length > 0 && (
          <div className="m3-card mb-6 animate-slide-up" style={{ animationDelay: '150ms', borderLeft: '4px solid var(--error)' }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="m3-title-md !text-lg flex items-center gap-2">
                  <AlertCircle size={18} className="text-error" />
                  {t('teacherAnalytics.debtors')}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">{t('teacherAnalytics.unpaidTotal', { amount: formatUZS(debtThisMonth, true) })}</p>
              </div>
              <div className="bg-error-container text-on-error-container text-xs font-bold px-2 py-1 rounded-lg">
                {unpaidThisMonth.length}
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {unpaidThisMonth.slice(0, 5).map((payment, idx) => {
                const studentName = `${payment.student?.first_name || ''} ${payment.student?.last_name || ''}`.trim() || 'No Name'
                const groupName = payment.group?.name || '—'
                return (
                  <div key={payment.id || idx} className="flex items-center justify-between bg-surface-highest/50 rounded-xl p-3 border border-outline-variant/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={studentName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{studentName}</p>
                        <p className="text-[10px] text-on-surface-variant truncate font-medium mt-0.5">{groupName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-extrabold text-debt-red whitespace-nowrap">{formatUZS(payment.amount)}</span>
                      <button onClick={() => handleRemind(payment)} className="m3-btn-tonal shrink-0 gap-1 text-[11px] px-2 py-1.5 h-auto rounded-lg">
                        <Bell size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {unpaidThisMonth.length > 5 && (
                <button 
                  onClick={() => navigate('/teacher/finance')}
                  className="w-full py-2.5 mt-2 text-xs font-bold bg-surface-highest rounded-xl text-primary active:scale-95 transition-transform"
                >
                  {t('common.viewAll')} ({unpaidThisMonth.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Groups Payment Status */}
        <div className="m3-card mb-20 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="m3-title-md !text-lg mb-4 flex items-center gap-2">
            <Layers size={18} className="text-primary" />
            {t('teacherAnalytics.groupsPayment')}
          </h3>
          
          <div className="space-y-5">
            {groups && groups.length > 0 ? groups.map(group => (
              <div key={group.id}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={group.name} size="md" color={group.color} />
                    <span className="text-sm font-bold text-on-surface truncate max-w-[150px]">{group.name}</span>
                  </div>
                  <span className={`text-sm font-extrabold ${group.paidPercent === 100 ? 'text-paid-green' : group.paidPercent > 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {group.paidPercent}%
                  </span>
                </div>
                <div className="w-full bg-surface-highest rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${group.paidPercent === 100 ? 'bg-paid-green' : 'bg-primary'}`} 
                    style={{ width: `${group.paidPercent}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-center text-sm text-on-surface-variant py-4">{t('teacherHome.noGroupsYet')}</p>
            )}
          </div>
        </div>
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

      <BottomNav role="teacher" />
    </div>
  )
}
