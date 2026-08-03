import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram, useTelegramBackButton } from '../../hooks/useTelegram'
import { useTeacherAnalytics } from '../../hooks/api/useTeacher'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { ArrowLeft, TrendingUp, Users, CalendarDays, AlertTriangle, Lock } from 'lucide-react'

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
      <div className="p-4 pt-6 bg-surface-container sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <h1 className="text-2xl font-bold text-on-surface">
          {lang === 'ru' ? 'Аналитика' : "Analitika"}
        </h1>
        {!isCenter && (
          <div className="flex items-center gap-1 bg-surface-variant/50 px-3 py-1 rounded-full text-xs font-medium text-brand">
            <Lock className="w-3 h-3" />
            Solo
          </div>
        )}
      </div>

      <div className="p-4 space-y-6">
        
        {/* Revenue Dynamics (Full 6 months for all plans) */}
        <div className="bg-surface-container-low p-5 rounded-[24px] shadow-sm border border-outline-variant/30">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-on-surface">
              {lang === 'ru' ? 'Динамика выручки' : "Daromad dinamikasi"}
            </h2>
          </div>
          
          <div className="h-48 flex items-end justify-between gap-3 mt-6">
            {(revenueData || []).map((d, i) => {
              const earnedHeight = Math.max((d.earned / maxRevenue) * 100, 4)
              const expectedHeight = Math.max((d.expected / maxRevenue) * 100, 4)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full relative h-full flex items-end justify-center">
                    {/* Expected (Background Bar) */}
                    <div 
                      className="absolute bottom-0 w-full max-w-[24px] bg-surface-variant rounded-t-md transition-all duration-300"
                      style={{ height: `${expectedHeight}%` }}
                    />
                    {/* Earned (Foreground Bar) */}
                    <div 
                      className="absolute bottom-0 w-full max-w-[24px] bg-brand rounded-t-md transition-all duration-300"
                      style={{ height: `${earnedHeight}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-on-surface-variant">
                    {getMonthLabel(d.month)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-brand rounded-[3px]" />
              <span className="text-on-surface-variant">{lang === 'ru' ? 'Оплачено' : 'To\'langan'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-surface-variant rounded-[3px]" />
              <span className="text-on-surface-variant">{lang === 'ru' ? 'Ожидается' : 'Kutilmoqda'}</span>
            </div>
          </div>
        </div>

        {/* Top Debtors (Available for all plans) */}
        <div className="bg-surface-container-low p-5 rounded-[24px] shadow-sm border border-outline-variant/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-error" />
            <h2 className="text-lg font-bold text-on-surface">
              {lang === 'ru' ? 'Топ должников' : "Top qarzdorlar"}
            </h2>
          </div>

          {!topDebtors || topDebtors.length === 0 ? (
            <div className="text-center py-6 text-on-surface-variant text-sm font-medium">
              {lang === 'ru' ? 'Нет должников 🎉' : "Qarzdorlar yo'q 🎉"}
            </div>
          ) : (
            <div className="space-y-3">
              {topDebtors.map((d, i) => (
                <div key={d.studentId || i} className="flex items-center justify-between p-3 rounded.16px bg-surface-variant/20">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-error/10 text-error flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate max-w-[140px]">
                        {d.name}
                      </p>
                      <p className="text-xs text-error/80 font-medium">
                        {d.months} {lang === 'ru' ? 'мес. долга' : "oy qarzdor"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-error">
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
          <div className="bg-surface-variant/30 p-6 rounded-[24px] border border-outline-variant/30 text-center relative overflow-hidden">
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
                  navigate('/teacher/settings')
                }}
                className="bg-brand text-on-brand px-6 py-2.5 rounded-full font-medium active:scale-95 transition-transform"
              >
                {lang === 'ru' ? 'Улучшить тариф' : "Ta'rifni yangilash"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Student Dynamics */}
            <div className="bg-surface-container-low p-5 rounded-[24px] shadow-sm border border-outline-variant/30">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-secondary" />
                <h2 className="text-lg font-bold text-on-surface">
                  {lang === 'ru' ? 'Новые ученики' : "Yangi o'quvchilar"}
                </h2>
              </div>
              
              <div className="h-32 flex items-end justify-between gap-2 mt-4">
                {(studentData || []).map((d, i) => {
                  const height = Math.max((d.newStudents / maxStudents) * 100, 5)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full max-w-[24px] bg-secondary/80 rounded-t-md flex items-end justify-center pb-1 text-[10px] font-bold text-white transition-all" style={{ height: `${height}%` }}>
                        {d.newStudents > 0 ? d.newStudents : ''}
                      </div>
                      <span className="text-[10px] text-on-surface-variant">{getMonthLabel(d.month)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Attendance Heatmap */}
            <div className="bg-surface-container-low p-5 rounded-[24px] shadow-sm border border-outline-variant/30">
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
                  
                  let bgClass = "bg-surface-variant/30"
                  let textClass = "text-on-surface-variant"
                  if (stats?.total > 0) {
                    if (percent >= 90) { bgClass = "bg-[#8b5cf6]"; textClass = "text-white" }
                    else if (percent >= 75) { bgClass = "bg-[#8b5cf6]/70"; textClass = "text-white" }
                    else if (percent >= 50) { bgClass = "bg-[#8b5cf6]/40"; textClass = "text-on-surface" }
                    else { bgClass = "bg-[#8b5cf6]/20"; textClass = "text-on-surface" }
                  }

                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {daysOfWeek[day]}
                      </span>
                      <div className={`w-full aspect-square rounded-lg flex items-center justify-center ${bgClass}`}>
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
