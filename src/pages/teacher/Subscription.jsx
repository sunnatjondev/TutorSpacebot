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
      const { paymentUrl } = await createOrder.mutateAsync({ planId })
      
      if (tg?.openInvoice) {
        tg.openInvoice(paymentUrl, (status) => {
          if (status === 'paid') {
            tg.showAlert(lang === 'ru' ? 'Оплата прошла успешно!' : 'To\'lov muvaffaqiyatli o\'tdi!')
            // Status will be updated via telegram bot webhook automatically
          } else if (status === 'failed') {
            tg.showAlert(lang === 'ru' ? 'Ошибка при оплате' : 'To\'lovda xatolik yuz berdi')
          }
        })
      } else if (tg?.openLink) {
        tg.openLink(paymentUrl)
      } else {
        window.open(paymentUrl, '_blank')
      }
    } catch (error) {
      tg?.showAlert(lang === 'ru' ? 'Ошибка при создании инвойса' : "Invoys yaratishda xatolik")
    } finally {
      setLoadingPlan(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-lowest">
        <div className="h-8 w-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
      </div>
    )
  }

  const isExpired = subscription?.status === 'expired'
  const isTrial = subscription?.status === 'trial'
  
  const expiresAt = subscription?.expiresAt ? new Date(subscription.expiresAt) : null
  const daysLeft = expiresAt ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)) : 0

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
        
        {/* Status Card */}
        <div className={`m3-card relative overflow-hidden ${isExpired ? 'bg-red-500/10 border-red-500/30' : 'bg-surface'}`}>
          {isExpired && (
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <AlertTriangle size={64} className="text-red-500" />
            </div>
          )}
          
          <p className="text-sm text-on-surface-variant font-medium">
            {lang === 'ru' ? 'Текущий статус' : 'Joriy holat'}
          </p>
          <div className="flex items-end gap-2 mt-1">
            <h2 className={`text-2xl font-bold ${isExpired ? 'text-red-500' : 'text-on-surface'}`}>
              {isExpired ? (lang === 'ru' ? 'Истёк' : 'Tugagan') 
                : isTrial ? (lang === 'ru' ? 'Пробный' : 'Sinov') 
                : (lang === 'ru' ? 'Активный' : 'Faol')}
            </h2>
            {subscription?.plan?.slug && !isExpired && (
              <span className="text-sm font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full mb-1">
                {subscription.plan.slug.toUpperCase()}
              </span>
            )}
          </div>
          
          {expiresAt && (
            <p className="text-sm mt-3 font-medium text-on-surface-variant flex items-center gap-2">
              <CreditCard size={16} /> 
              {daysLeft > 0 
                ? (lang === 'ru' ? `Осталось дней: ${daysLeft}` : `Qolgan kunlar: ${daysLeft}`)
                : (lang === 'ru' ? 'Подписка закончилась' : 'Obuna yakunlangan')}
            </p>
          )}
        </div>

        {/* Limits Info */}
        {!isExpired && subscription?.limits && (
          <div className="m3-card space-y-3">
            <h3 className="font-bold text-on-surface">{lang === 'ru' ? 'Ваши лимиты' : 'Sizning limitlaringiz'}</h3>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">{lang === 'ru' ? 'Группы' : 'Guruhlar'}</span>
              <span className="font-bold">{subscription.limits.maxGroups || <Infinity size={18} className="inline"/>}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">{lang === 'ru' ? 'Студенты' : 'Talabalar'}</span>
              <span className="font-bold">{subscription.limits.maxStudents || <Infinity size={18} className="inline"/>}</span>
            </div>
          </div>
        )}

        <h3 className="font-bold text-on-surface text-lg pt-2">
          {lang === 'ru' ? 'Тарифные планы' : 'Ta\'rif rejalari'}
        </h3>

        {/* Solo Plan */}
        <div className="m3-card border-2 border-brand/20 relative">
          <div className="absolute top-3 right-3 bg-brand/10 text-brand text-xs font-bold px-2 py-1 rounded-full">
            {lang === 'ru' ? 'Популярный' : 'Mashhur'}
          </div>
          <h3 className="text-xl font-bold text-on-surface">Solo</h3>
          <p className="text-brand font-bold text-lg mt-1">{formatUZS(100000)} / {lang === 'ru' ? 'мес' : 'oy'}</p>
          
          <ul className="space-y-2 mt-4 text-on-surface text-sm">
            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-brand"/> {lang === 'ru' ? 'До 3 групп' : '3 ta gacha guruh'}</li>
            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-brand"/> {lang === 'ru' ? 'До 30 учеников' : '30 ta gacha talaba'}</li>
            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-brand"/> {lang === 'ru' ? 'Напоминания об оплатах' : 'To\'lov eslatmalari'}</li>
          </ul>

          <button 
            onClick={() => handlePay('solo')}
            disabled={loadingPlan !== null}
            className="w-full mt-6 h-12 rounded-2xl bg-brand text-on-primary font-bold shadow-glow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingPlan === 'solo' ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {lang === 'ru' ? 'Оплатить' : 'To\'lash'}
          </button>
        </div>

        {/* Center Plan */}
        <div className="m3-card bg-surface-high">
          <h3 className="text-xl font-bold text-on-surface">Center</h3>
          <p className="text-on-surface-variant font-bold text-lg mt-1">{formatUZS(300000)} / {lang === 'ru' ? 'мес' : 'oy'}</p>
          
          <ul className="space-y-2 mt-4 text-on-surface text-sm">
            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-brand"/> {lang === 'ru' ? 'Безлимитные группы' : 'Cheksiz guruhlar'}</li>
            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-brand"/> {lang === 'ru' ? 'Безлимитные ученики' : 'Cheksiz talabalar'}</li>
            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-brand"/> {lang === 'ru' ? 'Приоритетная поддержка' : 'Ustuvor qo\'llab-quvvatlash'}</li>
          </ul>

          <button 
            onClick={() => handlePay('center')}
            disabled={loadingPlan !== null}
            className="w-full mt-6 h-12 rounded-2xl bg-surface-highest text-on-surface font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingPlan === 'center' ? <div className="h-5 w-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" /> : null}
            {lang === 'ru' ? 'Оплатить' : 'To\'lash'}
          </button>
        </div>

      </div>
    </div>
  )
}
