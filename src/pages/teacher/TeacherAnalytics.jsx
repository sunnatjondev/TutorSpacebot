import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, Layers, AlertCircle, CalendarDays, BookOpen } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useTeacherDashboard, useTeacherGroups, useTeacherPayments } from '../../hooks/api/useTeacher'

export default function TeacherAnalytics() {
  const { user, haptic, tg } = useTelegram()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  
  const telegramId = user?.id
  const { data: dash, isLoading: loadingDash } = useTeacherDashboard(telegramId)
  const { data: groups, isLoading: loadingGroups } = useTeacherGroups(telegramId)
  const { data: payments, isLoading: loadingPayments } = useTeacherPayments(telegramId, 'all')

  const isLoading = loadingDash || loadingGroups || loadingPayments

  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  
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

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="px-4 pt-6 pb-2 sticky top-0 bg-surface-lowest/90 backdrop-blur-xl z-20 flex justify-between items-center animate-slide-down">
        <div>
          <h1 className="m3-display-md !text-2xl">{t('nav.analytics')}</h1>
          <p className="text-on-surface-variant text-xs">{today.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button
          onClick={() => {
            haptic?.selection()
            navigate('/teacher/settings')
          }}
          className="w-10 h-10 rounded-full bg-surface-high flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="text-xl">⚙️</span>
        </button>
      </div>

      <div className="page-wrapper px-4 pt-2">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className="h-32 bg-surface-container animate-pulse rounded-card" />
            <div className="h-40 bg-surface-container animate-pulse rounded-card" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Revenue Card */}
            <div className="bg-gradient-to-br from-[#4c1d95]/40 to-[#581c87]/10 border border-[#9333ea]/50 rounded-card p-5 relative overflow-hidden shadow-[0_0_20px_rgba(147,51,234,0.15)] animate-slide-up">
              <div className="absolute top-4 right-4 w-10 h-10 bg-[#9333ea]/20 rounded-full flex items-center justify-center">
                <TrendingUp size={20} className="text-[#c084fc]" />
              </div>
              <h2 className="text-sm text-purple-200/80 mb-1">{t('teacherAnalytics.earnedThisMonth')}</h2>
              <div className="text-3xl font-bold text-[#c084fc] mb-4">{formatUZS(earnedThisMonth, true)}</div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-surface-lowest/50 rounded-2xl p-3">
                  <p className="text-xs text-purple-200/60 mb-1">{t('teacherAnalytics.paymentProgress')}</p>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-sm">{overallPaymentPercent}%</span>
                    <span className="text-[10px] text-purple-200/60">{totalStudentsPaid}/{totalStudentsExpectedToPay}</span>
                  </div>
                  <div className="w-full bg-[#3b0764]/50 rounded-full h-1.5">
                    <div 
                      className="bg-[#c084fc] h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${overallPaymentPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
              <div className="m3-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-tertiary/20 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-tertiary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-on-surface">{dash?.totalStudents || 0}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{t('teacherHome.students')}</p>
                </div>
              </div>
              <div className="m3-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center shrink-0">
                  <Layers size={18} className="text-brand" />
                </div>
                <div>
                  <p className="text-xl font-bold text-on-surface">{dash?.totalGroups || 0}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{t('teacherHome.groups')}</p>
                </div>
              </div>
            </div>

            {/* Groups Payment Status */}
            <div className="m3-card animate-slide-up" style={{ animationDelay: '100ms' }}>
              <h3 className="m3-title-md !text-lg mb-4">{t('teacherAnalytics.groupsPayment')}</h3>
              
              <div className="space-y-4">
                {groups && groups.length > 0 ? groups.map(group => (
                  <div key={group.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={group.name} size="sm" color={group.color} />
                        <span className="text-sm font-semibold truncate max-w-[150px]">{group.name}</span>
                      </div>
                      <span className="text-xs font-bold text-paid-green">{group.paidPercent}%</span>
                    </div>
                    <div className="w-full bg-surface-highest rounded-full h-1.5">
                      <div 
                        className="bg-paid-green h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${group.paidPercent}%` }}
                      />
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-sm text-on-surface-variant py-2">{t('teacherHome.noGroupsYet')}</p>
                )}
              </div>
            </div>

            {/* Debtors List */}
            {unpaidThisMonth.length > 0 && (
              <div className="m3-card animate-slide-up" style={{ animationDelay: '150ms', borderLeft: '4px solid var(--error)' }}>
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

                <div className="space-y-0">
                  {unpaidThisMonth.slice(0, 5).map((payment, idx) => (
                    <div key={payment.id || idx}>
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={`${payment.student?.first_name || '?'} ${payment.student?.last_name || ''}`} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">
                              {payment.student?.first_name} {payment.student?.last_name}
                            </p>
                            <p className="text-[10px] text-on-surface-variant truncate">{payment.group?.name}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-debt-red whitespace-nowrap shrink-0">{formatUZS(payment.amount)}</span>
                      </div>
                      {idx < Math.min(unpaidThisMonth.length, 5) - 1 && <hr className="border-outline-variant/20" />}
                    </div>
                  ))}
                  {unpaidThisMonth.length > 5 && (
                    <button 
                      onClick={() => navigate('/teacher/finance')}
                      className="w-full py-2 mt-2 text-xs font-semibold text-primary"
                    >
                      {t('common.viewAll')} ({unpaidThisMonth.length})
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <div className="h-6"></div> {/* Spacer for bottom nav */}
          </div>
        )}
      </div>

      <BottomNav role="teacher" />
    </div>
  )
}
