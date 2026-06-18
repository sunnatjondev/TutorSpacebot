import { useState } from 'react'
import { ArrowLeft, CheckCircle, CreditCard, AlertTriangle, Infinity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTelegram, useTelegramBackButton } from '../../hooks/useTelegram'
import { useBillingStatus, useCreateBillingOrder } from '../../hooks/api/useTeacher'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'

export default function Subscription() {
  const { user, haptic, tg } = useTelegram()
  const { lang } = useI18n()
  const navigate = useNavigate()
  
  useTelegramBackButton(() => navigate('/teacher/settings'))

  const { data: subscription, isLoading } = useBillingStatus(user?.id)
  const createOrder = useCreateBillingOrder()
  
  const [loadingPlan, setLoadingPlan] = useState(null)

  const handlePay = async (planId) => {
    haptic?.selection()
    setLoadingPlan(planId)
    try {
      await createOrder.mutateAsync({ planId })
      
      const successMsg = lang === 'ru' 
        ? 'Реквизиты для оплаты отправлены вам в личные сообщения бота. Пожалуйста, закройте это окно.'
        : 'To\'lov ma\'lumotlari botga yuborildi. Iltimos, bu oynani yoping va botga qayting.'
        
      if (tg?.showAlert) {
        tg.showAlert(successMsg, () => {
          tg.close()
        })
      } else {
        alert(successMsg)
      }
    } catch (error) {
      tg?.showAlert(lang === 'ru' ? 'Ошибка при создании заявки' : "So'rov yaratishda xatolik")
    } finally {
      setLoadingPlan(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-lowest">
        <div className="flex flex-col items-center gap-5">
          <div className="h-10 w-10 rounded-full border-[3px] border-surface-container-highest border-t-brand animate-spin" />
          <p className="m3-label text-on-surface-variant font-medium animate-pulse">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  const isExpired = subscription?.status === 'expired'
  const isTrial = subscription?.status === 'trial'
  
  const expiresAt = subscription?.expiresAt ? new Date(subscription.expiresAt) : null
  const daysLeft = expiresAt ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)) : 0

  // Infer plan if backend didn't join the plan object
  let activePlan = subscription?.plan
  if (!activePlan && subscription?.limits) {
    if (subscription.limits.maxGroups === 3 && subscription.limits.maxStudents === 30) {
      activePlan = {
        slug: isTrial ? 'trial' : 'solo',
        name_uz: isTrial ? 'Sinov' : 'Solo',
        name_ru: isTrial ? 'Пробный' : 'Solo'
      }
    } else if (!subscription.limits.maxGroups && !subscription.limits.maxStudents) {
      activePlan = {
        slug: 'center',
        name_uz: 'Center',
        name_ru: 'Центр'
      }
    }
  }

  // Plan-specific dynamic styles for the ACTIVE STATUS CARD ONLY
  const getActivePlanStyles = () => {
    if (isExpired) {
      return {
        card: 'bg-red-500/10 border border-red-500/30 relative overflow-hidden rounded-[24px] p-5 transition-all duration-300',
        title: 'text-red-300/85',
        value: 'text-red-400 font-bold',
        muted: 'text-red-300/70',
        badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
        icon: 'text-red-400'
      }
    }
    
    const slug = activePlan?.slug
    if (slug === 'solo') {
      return {
        card: 'bg-gradient-to-br from-[#4c1d95]/40 to-[#581c87]/10 border border-[#9333ea]/50 shadow-[0_0_20px_rgba(147,51,234,0.15)] relative overflow-hidden rounded-[24px] p-5 transition-all duration-300',
        title: 'text-purple-200/80',
        value: 'text-[#c084fc] font-bold',
        muted: 'text-purple-200/60',
        badge: 'bg-[#9333ea]/35 text-[#c084fc] border border-[#9333ea]/50 font-bold',
        icon: 'text-[#c084fc]'
      }
    }
    
    if (slug === 'center') {
      return {
        card: 'bg-gradient-to-br from-[#431407]/60 to-[#7c2d12]/10 border border-[#fb923c]/40 shadow-[0_0_20px_rgba(249,115,22,0.15)] relative overflow-hidden rounded-[24px] p-5 transition-all duration-300',
        title: 'text-orange-200/80',
        value: 'text-[#fdba74] font-bold',
        muted: 'text-orange-200/60',
        badge: 'bg-[#ea580c]/30 text-[#fdba74] border border-[#ea580c]/40 font-bold',
        icon: 'text-[#fdba74]'
      }
    }
    
    // Trial / Default - keep it clean and standard, no heavy colors!
    return {
      card: 'bg-surface-container border border-outline-variant/30 shadow-m3-elevation-1 relative overflow-hidden rounded-[24px] p-5 transition-all duration-300',
      title: 'text-on-surface font-medium',
      value: 'text-on-surface font-bold',
      muted: 'text-on-surface-variant',
      badge: 'bg-brand/20 text-brand border border-brand/30',
      icon: 'text-on-surface-variant'
    }
  }

  const cardStyles = getActivePlanStyles()

  return (
    <div className="flex min-h-screen flex-col bg-surface-lowest pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 flex h-14 items-center gap-3 bg-surface/80 px-4 backdrop-blur-md">
        <button onClick={() => { haptic?.selection(); navigate('/teacher/settings') }} className="p-2 -ml-2 text-on-surface">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface">
          {lang === 'ru' ? 'Подписка' : 'Obuna'}
        </h1>
      </div>

      <div className="px-4 pt-4 space-y-6 page-wrapper">
        
        {/* Status Card - Colored dynamically */}
        <div className={cardStyles.card}>
          {isExpired && (
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <AlertTriangle size={64} className="text-red-500" />
            </div>
          )}
          
          <div className="flex items-center justify-between mt-1">
            <div>
              <p className={`text-sm ${cardStyles.muted}`}>
                {lang === 'ru' ? 'Текущий статус' : 'Joriy holat'}
              </p>
              <h2 className={`text-2xl mt-1 ${cardStyles.value}`}>
                {isExpired ? (lang === 'ru' ? 'Истёк' : 'Tugagan') 
                  : isTrial ? (lang === 'ru' ? 'Пробный' : 'Sinov') 
                  : (lang === 'ru' ? 'Активный' : 'Faol')}
              </h2>
            </div>
            
            {activePlan?.name_uz && (
              <div className="text-right">
                <p className={`text-sm ${cardStyles.muted}`}>
                  {lang === 'ru' ? 'Ваш тариф' : 'Sizning ta\'rifingiz'}
                </p>
                <span className={`inline-block mt-1 text-sm px-3 py-1 rounded-lg ${cardStyles.badge}`}>
                  {lang === 'ru' ? activePlan.name_ru : activePlan.name_uz}
                </span>
              </div>
            )}
          </div>
          
          {expiresAt && (
            <p className={`text-sm mt-3 flex items-center gap-2 ${cardStyles.muted}`}>
              <CreditCard size={16} className={cardStyles.icon} /> 
              <span className="font-medium">
                {daysLeft > 0 
                  ? (lang === 'ru' ? `Осталось дней: ${daysLeft}` : `Qolgan kunlar: ${daysLeft}`)
                  : (lang === 'ru' ? 'Подписка закончилась' : 'Obuna yakunlangan')}
              </span>
            </p>
          )}
        </div>

        {/* Limits Info - Reverted to clean style */}
        {!isExpired && subscription?.limits && (
          <div className="m3-card space-y-3">
            <h3 className="font-bold text-on-surface">{lang === 'ru' ? 'Ваши лимиты' : 'Sizning limitlaringiz'}</h3>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">{lang === 'ru' ? 'Группы' : 'Guruhlar'}</span>
              <span className="font-bold text-on-surface">
                {subscription.limits.maxGroups || <Infinity size={18} className="inline"/>}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">{lang === 'ru' ? 'Студенты' : 'Talabalar'}</span>
              <span className="font-bold text-on-surface">
                {subscription.limits.maxStudents || <Infinity size={18} className="inline"/>}
              </span>
            </div>
          </div>
        )}

        {/* Change/Cancel Info - Reverted to clean style */}
        <div className="bg-surface-variant/20 rounded-[20px] p-4 border border-outline-variant/20">
          <h4 className="text-sm font-bold text-on-surface mb-1">
            {lang === 'ru' ? 'Смена и отмена тарифа' : "Ta'rifni o'zgartirish va bekor qilish"}
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {lang === 'ru' 
              ? 'Вы можете сменить тариф в любое время, купив новый. Старые дни автоматически прибавятся. Чтобы отменить подписку, просто не оплачивайте следующий месяц — списаний не будет.' 
              : "Ta'rifingizni xohlagan vaqtda yangisini sotib olib o'zgartirishingiz mumkin. Qoldiq kunlar avtomatik qo'shiladi. Obunani bekor qilish uchun keyingi oy to'lov qilmasangiz kifoya — avtomatik yechib olish yo'q."}
          </p>
        </div>

        <h3 className="font-bold text-on-surface text-lg pt-2">
          {lang === 'ru' ? 'Тарифные планы' : 'Ta\'rif rejalari'}
        </h3>

        {/* Solo Plan */}
        <div className="relative overflow-hidden rounded-[28px] border-[2px] border-[#9333ea] bg-gradient-to-br from-[#4c1d95]/40 to-[#581c87]/10 p-6 shadow-glow-sm">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-[#9333ea] opacity-20 blur-2xl" />
          <div className="absolute top-4 right-4 bg-gradient-to-r from-[#9333ea] to-[#c084fc] text-white text-[11px] tracking-wider uppercase font-extrabold px-3 py-1 rounded-full shadow-md">
            {lang === 'ru' ? 'Популярный' : 'Mashhur'}
          </div>
          <h3 className="text-2xl font-black text-white relative z-10">Solo</h3>
          <div className="mt-2 flex items-baseline gap-1 relative z-10">
            <span className="text-3xl font-extrabold text-[#c084fc]">{formatUZS(100000)}</span>
            <span className="text-sm font-semibold text-[#c084fc]/70">/ {lang === 'ru' ? 'мес' : 'oy'}</span>
          </div>
          
          <ul className="space-y-3 mt-6 text-on-surface text-sm font-medium relative z-10">
            <li className="flex items-center gap-3"><CheckCircle size={18} className="text-[#a855f7]"/> <span className="text-white/90">{lang === 'ru' ? 'До 3 групп' : '3 ta gacha guruh'}</span></li>
            <li className="flex items-center gap-3"><CheckCircle size={18} className="text-[#a855f7]"/> <span className="text-white/90">{lang === 'ru' ? 'До 30 учеников' : '30 ta gacha talaba'}</span></li>
            <li className="flex items-center gap-3"><CheckCircle size={18} className="text-[#a855f7]"/> <span className="text-white/90">{lang === 'ru' ? 'Напоминания об оплатах' : 'To\'lov eslatmalari'}</span></li>
          </ul>

          <button 
            onClick={() => handlePay('solo')}
            disabled={loadingPlan !== null}
            className="w-full mt-8 h-[52px] rounded-2xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 relative z-10"
          >
            {loadingPlan === 'solo' ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {lang === 'ru' ? 'Оплатить' : 'To\'lash'}
          </button>
        </div>

        {/* Center Plan */}
        <div className="relative overflow-hidden rounded-[28px] border-[1px] border-[#fb923c]/30 bg-gradient-to-br from-[#431407]/60 to-[#7c2d12]/10 p-6">
          <div className="absolute top-0 left-0 -ml-8 -mt-8 h-32 w-32 rounded-full bg-[#fb923c] opacity-10 blur-2xl" />
          <div className="absolute top-4 right-4 bg-gradient-to-r from-[#f97316] to-[#fb923c] text-white text-[11px] tracking-wider uppercase font-extrabold px-3 py-1 rounded-full shadow-md">
            {lang === 'ru' ? 'Бизнес' : 'Biznes'}
          </div>
          <h3 className="text-2xl font-black text-white relative z-10">Center</h3>
          <div className="mt-2 flex items-baseline gap-1 relative z-10">
            <span className="text-3xl font-extrabold text-[#fdba74]">{formatUZS(300000)}</span>
            <span className="text-sm font-semibold text-[#fdba74]/70">/ {lang === 'ru' ? 'мес' : 'oy'}</span>
          </div>
          
          <ul className="space-y-3 mt-6 text-on-surface text-sm font-medium relative z-10">
            <li className="flex items-center gap-3"><CheckCircle size={18} className="text-[#fb923c]"/> <span className="text-white/90">{lang === 'ru' ? 'Безлимитные группы' : 'Cheksiz guruhlar'}</span></li>
            <li className="flex items-center gap-3"><CheckCircle size={18} className="text-[#fb923c]"/> <span className="text-white/90">{lang === 'ru' ? 'Безлимитные ученики' : 'Cheksiz talabalar'}</span></li>
            <li className="flex items-center gap-3"><CheckCircle size={18} className="text-[#fb923c]"/> <span className="text-white/90">{lang === 'ru' ? 'Приоритетная поддержка' : 'Ustuvor qo\'llab-quvvatlash'}</span></li>
          </ul>

          <button 
            onClick={() => handlePay('center')}
            disabled={loadingPlan !== null}
            className="w-full mt-8 h-[52px] rounded-2xl bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white font-bold shadow-[0_0_20px_rgba(234,88,12,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 relative z-10"
          >
            {loadingPlan === 'center' ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {lang === 'ru' ? 'Оплатить' : 'To\'lash'}
          </button>
        </div>

      </div>
    </div>
  )
}
