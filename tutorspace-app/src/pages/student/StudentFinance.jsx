import { CheckCircle2, MessageCircle, Wallet, BookOpen, ShieldCheck, XCircle } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useStudentPayments } from '../../hooks/api/useStudent'

export default function StudentFinance() {
  const { user, haptic } = useTelegram()
  const { t, lang } = useI18n()
  const { data: payments, isLoading } = useStudentPayments(user?.id)
  const displayPayments = payments || []

  const totalUnpaid = displayPayments
    .filter((payment) => payment.status === 'unpaid' || payment.status === 'pending' || payment.status === 'partial')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0)

  const grouped = displayPayments.reduce((acc, payment) => {
    const date = payment.created_at
    const month = date
      ? new Date(date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'long', year: 'numeric' })
      : (lang === 'ru' ? 'Текущий период' : 'Hozirgi davr')

    if (!acc[month]) acc[month] = []
    acc[month].push(payment)
    return acc
  }, {})

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6 pb-24 space-y-4">
        <div>
          <h1 className="m3-display-md text-on-surface">{t('studentFinance.title')}</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {lang === 'ru' ? 'История оплат и текущий статус баланса' : 'To\'lovlar tarixi va hisob holati'}
          </p>
        </div>

        {/* Debt Banner OR All Paid Banner */}
        {totalUnpaid > 0 ? (
          <div className="rounded-[24px] p-5 stagger-item bg-red-500/10 border border-red-500/30 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                {t('studentFinance.outstanding')}
              </span>
              <span className="badge-unpaid text-[10px]">
                {t('common.unpaid').toUpperCase()}
              </span>
            </div>
            <p className="text-3xl font-extrabold text-debt-red leading-none">
              {formatUZS(totalUnpaid, false, lang)}
            </p>
            <button
              onClick={() => {
                haptic?.light()
                const unpaidPayment = displayPayments.find((p) => p.status === 'unpaid' || p.status === 'pending' || p.status === 'partial')
                const teacher = unpaidPayment?.teacher
                if (teacher) {
                  if (teacher.username) {
                    window.Telegram?.WebApp?.openTelegramLink(`https://t.me/${teacher.username}`)
                  } else if (teacher.telegram_id) {
                    window.Telegram?.WebApp?.openTelegramLink(`https://t.me/user?id=${teacher.telegram_id}`)
                  }
                }
              }}
              className="w-full h-11 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <MessageCircle size={15} />
              <span>{t('studentFinance.contactTeacher')}</span>
            </button>
          </div>
        ) : displayPayments.length > 0 ? (
          <div className="rounded-[24px] p-4 stagger-item bg-paid-green/10 border border-paid-green/25 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-paid-green/20 flex items-center justify-center text-paid-green shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-paid-green">
                {lang === 'ru' ? 'Все занятия оплачены' : 'Barcha to\'lovlar amalga oshirilgan'}
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                {lang === 'ru' ? 'Задолженностей по предметам нет' : 'Qarzdorliklar mavjud emas'}
              </p>
            </div>
          </div>
        ) : null}

        {/* Payment History List */}
        <div className="space-y-4">
          <h2 className="m3-title-lg text-on-surface">{t('studentFinance.paymentHistory')}</h2>

          {isLoading && (
            <div className="text-center py-10 text-xs text-on-surface-variant">
              {t('common.loading')}
            </div>
          )}

          {!isLoading && !Object.keys(grouped).length && (
            <div className="m3-card text-center py-12 text-on-surface-variant space-y-2">
              <Wallet size={32} className="mx-auto text-on-surface-variant/40 mb-2" />
              <p className="text-sm font-medium">
                {lang === 'ru' ? 'История оплат пока пуста' : 'To\'lovlar tarixi hozircha bo\'sh'}
              </p>
            </div>
          )}

          {Object.entries(grouped).map(([month, monthPayments]) => (
            <div key={month} className="space-y-2">
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider px-1 capitalize">
                {month}
              </p>
              <div className="m3-card space-y-0 !p-3">
                {monthPayments.map((payment, index) => {
                  const subjectName = payment.group?.name || payment.group?.subject || (lang === 'ru' ? 'Занятие' : 'Dars to\'lovi')
                  const isPaid = payment.status === 'paid'
                  const dateStr = payment.created_at
                    ? new Date(payment.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'short', day: 'numeric' })
                    : '—'

                  return (
                    <div key={payment.id || index}>
                      <div className="flex items-center gap-3 py-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                          <BookOpen size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface text-sm truncate">{subjectName}</p>
                          <p className="text-on-surface-variant text-[11px] mt-0.5">{dateStr}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-on-surface text-sm">{formatUZS(payment.amount, false, lang)}</p>
                          <div className="mt-1">
                            {isPaid ? (
                              <span className="badge-paid text-[10px] inline-flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                <span>{t('common.paid')}</span>
                              </span>
                            ) : payment.status === 'partial' ? (
                              <span className="badge-partial text-[10px]">{t('common.partial')}</span>
                            ) : (
                              <span className="badge-unpaid text-[10px] inline-flex items-center gap-1">
                                <XCircle size={10} />
                                <span>{t('common.unpaid')}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {index < monthPayments.length - 1 && <hr className="w-full h-px bg-outline-variant/20 border-0" />}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav role="student" />
    </div>
  )
}

