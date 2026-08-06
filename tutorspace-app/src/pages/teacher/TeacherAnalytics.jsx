import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram, useTelegramBackButton } from '../../hooks/useTelegram'
import { useTeacherAnalytics } from '../../hooks/api/useTeacher'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { ArrowLeft, TrendingUp, Users, CalendarDays, AlertTriangle, Lock, CheckCircle2, Sparkles } from 'lucide-react'

export default function TeacherAnalytics() {
  const { user, haptic } = useTelegram()
  const { lang } = useI18n()
  const navigate = useNavigate()
  
  useTelegramBackButton(() => navigate('/teacher/home'))

  const { data: analytics, isLoading, error, refetch } = useTeacherAnalytics(user?.id)

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center h-40">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!analytics?.ok) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-error font-semibold">
          {lang === 'ru' ? 'Ошибка загрузки аналитики' : "Analitikani yuklashda xatolik"}
        </p>
        {error?.message && (
          <p className="text-xs text-on-surface-variant bg-surface-container p-3 rounded-xl break-all">
            {error.message}
          </p>
        )}
        <button 
          onClick={() => refetch()} 
          className="bg-brand text-on-brand px-5 py-2 rounded-full text-sm font-medium"
        >
          {lang === 'ru' ? 'Повторить' : 'Qayta urinish'}
        </button>
      </div>
    )
  }

  const { isCenter, revenueData = [], studentData = [], attendanceByDay = {}, topDebtors = [] } = analytics

  const monthNamesRu = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  const monthNamesUz = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
  const getMonthLabel = (mStr) => {
    const idx = parseInt(mStr, 10) - 1
    if (idx < 0 || idx > 11) return mStr
    return lang === 'ru' ? monthNamesRu[idx] : monthNamesUz[idx]
  }

  const maxRevenue = Math.max(...(revenueData || []).map(d => Math.max(d.earned, d.expected)), 1)
  const maxStudents = Math.max(...(studentData || []).map(d => d.newStudents), 1)
  
  const daysOfWeek = lang === 'ru' 
    ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    : ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']

  return (
    <div className="pb-24 animate-fade-in">
      <div className="p-4 pt-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">
          {lang === 'ru' ? 'Аналитика' : "Analitika"}
        </h1>
        {!isCenter && (
          <button
            onClick={() => {
              haptic?.selection()
              navigate('/teacher/subscription')
            }}
            className="px-3.5 py-1.5 rounded-full bg-surface-variant/40 text-on-surface-variant text-xs font-semibold border border-outline-variant/20 active:scale-95 transition-all flex items-center gap-1 hover:bg-surface-variant/60"
          >
            {lang === 'ru' ? 'Тариф Solo' : 'Solo ta\'rif'}
          </button>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Revenue Dynamics (Full 6 months for all plans) */}
        <div className="m3-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-on-surface">
              {lang === 'ru' ? 'Динамика выручки' : "Daromad dinamikasi"}
            </h2>
          </div>
          
          <div className="h-48 flex items-end justify-between gap-3 mt-6">
            {(revenueData || []).map((d, i) => {
              const isCurrent = i === (revenueData.length - 1)
              const hasEarned = d.earned > 0
              const hasExpected = d.expected > 0
              
              const earnedHeight = hasEarned ? Math.max((d.earned / maxRevenue) * 100, 8) : 0
              const expectedHeight = hasExpected ? Math.max((d.expected / maxRevenue) * 100, 8) : 0

              const earnedBarClass = isCurrent
                ? "bg-gradient-to-t from-brand to-purple-400 shadow-sm shadow-brand/20"
                : "bg-[#5E5968]"

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full relative h-full flex items-end justify-center">
                    {/* Expected (Background Bar) */}
                    {hasExpected && (
                      <div 
                        className="absolute bottom-0 w-full max-w-[24px] bg-[#36343B] rounded-full transition-all duration-300"
                        style={{ height: `${expectedHeight}%` }}
                      />
                    )}

                    {/* Earned (Foreground Bar) */}
                    {hasEarned ? (
                      <div 
                        className={`absolute bottom-0 w-full max-w-[24px] ${earnedBarClass} rounded-full transition-all duration-300`}
                        style={{ height: `${earnedHeight}%` }}
                      />
                    ) : (
                      <div className={`w-full max-w-[24px] h-1.5 ${isCurrent ? 'bg-brand/60' : 'bg-[#36343B]'} rounded-full`} />
                    )}
                  </div>
                  <span className={`text-[11px] font-medium ${isCurrent ? 'text-brand font-bold' : 'text-on-surface-variant'}`}>
                    {getMonthLabel(d.month)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-brand rounded-full shrink-0" />
              <span className="text-on-surface-variant">{lang === 'ru' ? 'Оплачено' : 'To\'langan'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#36343B] rounded-full shrink-0" />
              <span className="text-on-surface-variant">{lang === 'ru' ? 'Ожидается' : 'Kutilmoqda'}</span>
            </div>
          </div>
        </div>

        {/* Top Debtors (Available for all plans) */}
        <div className="m3-card">
          <div className="flex items-center gap-2 mb-4">
            {topDebtors && topDebtors.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-error" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-paid-green" />
            )}
            <h2 className="text-lg font-bold text-on-surface">
              {lang === 'ru' ? 'Топ должников' : "Top qarzdorlar"}
            </h2>
          </div>

          {!topDebtors || topDebtors.length === 0 ? (
            <div className="text-center py-6 text-on-surface-variant text-sm font-medium flex items-center justify-center gap-1.5">
              {lang === 'ru' ? 'Нет должников' : "Qarzdorlar yo'q"}
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {topDebtors.map((d, i) => (
                <div key={d.studentId || i} className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-high/60 border border-[#8b5cf6]/40 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-error/15 text-error flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-on-surface truncate">
                        {d.name || (lang === 'ru' ? 'Студент' : 'Talaba')}
                      </p>
                      <p className="text-xs text-error font-medium mt-0.5">
                        {d.months || 1} {lang === 'ru' ? 'мес. долга' : "oy qarzdor"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-extrabold text-error">
                      -{formatUZS(d.debt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center Plan Features (Locked for Solo) */}
        {!isCenter ? (
          <div className="m3-card text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-container z-0" />
            <div className="relative z-10 flex flex-col items-center">
              <Lock className="w-10 h-10 text-on-surface-variant mb-3 opacity-50" />
              <h3 className="text-lg font-bold text-on-surface mb-2">
                {lang === 'ru' ? 'Доступно в тарифе Center' : "Center ta'rifida mavjud"}
              </h3>
              <p className="text-sm text-on-surface-variant mb-4">
                {lang === 'ru' 
                  ? 'Прирост учеников и тепловая карта посещаемости за 6 месяцев.' 
                  : '6 oylik o\'quvchilar o\'sishi va davomat xaritasi.'}
              </p>
              <button 
                onClick={() => {
                  haptic?.selection()
                  navigate('/teacher/subscription')
                }}
                className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform shadow-m3-elevation-1"
              >
                {lang === 'ru' ? 'Улучшить тариф' : "Ta'rifni yangilash"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Student Dynamics */}
            <div className="m3-card">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-brand" />
                <h2 className="text-lg font-bold text-on-surface">
                  {lang === 'ru' ? 'Новые ученики' : "Yangi o'quvchilar"}
                </h2>
              </div>
              
              <div className="h-36 flex items-end justify-between gap-2 mt-4">
                {(studentData || []).map((d, i) => {
                  const hasStudents = d.newStudents > 0
                  const height = hasStudents ? Math.max((d.newStudents / maxStudents) * 100, 20) : 0

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <div className="w-full relative h-full flex items-end justify-center">
                        {hasStudents ? (
                          <div 
                            className="w-full max-w-[24px] bg-gradient-to-t from-brand to-purple-400 rounded-full flex items-start justify-center pt-1.5 text-[10px] font-bold text-white transition-all shadow-sm shadow-brand/20"
                            style={{ height: `${height}%` }}
                          >
                            {d.newStudents}
                          </div>
                        ) : (
                          <div className="w-full max-w-[24px] h-1.5 bg-[#36343B] rounded-full" />
                        )}
                      </div>
                      <span className="text-[10px] text-on-surface-variant font-medium">{getMonthLabel(d.month)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Attendance Heatmap */}
            <div className="m3-card">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-5 h-5 text-[#8b5cf6]" />
                <h2 className="text-lg font-bold text-on-surface">
                  {lang === 'ru' ? 'Посещаемость по дням' : "Kunlar bo'yicha davomat"}
                </h2>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {[1,2,3,4,5,6,0].map(day => {
                  const stats = (attendanceByDay || {})[day]
                  const percent = stats?.total > 0 ? (stats.present / stats.total) * 100 : 0
                  
                  let bgClass = "bg-[#25232A]/60"
                  let textClass = "text-on-surface-variant/30"
                  if (stats?.total > 0) {
                    if (percent >= 90) { bgClass = "bg-[#8b5cf6] shadow-sm shadow-purple-500/20"; textClass = "text-white" }
                    else if (percent >= 75) { bgClass = "bg-[#8b5cf6]/75"; textClass = "text-white" }
                    else if (percent >= 50) { bgClass = "bg-[#8b5cf6]/45"; textClass = "text-on-surface" }
                    else { bgClass = "bg-[#8b5cf6]/25 border border-[#8b5cf6]/30"; textClass = "text-on-surface" }
                  }

                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {daysOfWeek[day]}
                      </span>
                      <div className={`w-full aspect-square rounded-2xl flex items-center justify-center ${bgClass} transition-all`}>
                        <span className={`text-[10px] font-bold ${textClass}`}>
                          {stats?.total > 0 ? `${Math.round(percent)}%` : '-'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
