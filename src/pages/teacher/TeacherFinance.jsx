import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useTeacherPayments, useMarkPaymentPaid } from '../../hooks/api/useTeacher'

function MarkPaymentModal({ student, onClose, onPaid, t, haptic }) {
  const [method, setMethod] = useState('cash')
  const [amount, setAmount] = useState(student?.amount || 0)
  const [loading, setLoading] = useState(false)

  const methods = [
    { key: 'cash', label: t('teacherFinance.cash') },
    { key: 'card', label: t('teacherFinance.card') },
    { key: 'transfer', label: t('teacherFinance.transfer') },
  ]

  const name = student?.student
    ? `${student.student.first_name} ${student.student.last_name || ''}`
    : '?'
  const group = student?.group?.name || '—'

  const markPaymentPaidMutation = useMarkPaymentPaid()

  const handleConfirm = async () => {
    setLoading(true)
    haptic?.medium()
    try {
      await markPaymentPaidMutation.mutateAsync({ paymentId: student.id, method })
      haptic?.success()
      onPaid()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 bg-surface-container rounded-2xl p-4">
        <Avatar name={name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-on-surface truncate">{name}</p>
          <p className="text-on-surface-variant text-sm truncate">👥 {group}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-extrabold text-debt-red">{formatUZS(student?.amount)}</p>
          <p className="text-xs text-debt-red font-bold">{t('common.unpaid').toUpperCase()}</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-on-surface-variant mb-2 block">
          {t('teacherFinance.amountReceived')}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="m3-input"
          placeholder="0"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-on-surface-variant mb-2 block">
          {t('teacherFinance.method')}
        </label>
        <div className="flex gap-2">
          {methods.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setMethod(item.key)
                haptic?.selection()
              }}
              className={`flex-1 h-11 rounded-full border font-semibold text-sm transition-all duration-200 ${
                method === item.key ? 'bg-brand border-brand text-white' : 'bg-transparent border-outline-variant text-on-surface'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleConfirm} disabled={loading} className="m3-btn-filled mt-2">
        <CheckCircle size={18} /> {loading ? t('groupDetail.saving') : t('teacherFinance.confirmPayment')}
      </button>
    </div>
  )
}

import { remindDebtors, remindStudent } from '../../lib/backend'

export default function TeacherFinance() {
  const { user, haptic, openTelegramLink } = useTelegram()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('current')
  const [markStudent, setMarkStudent] = useState(null)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [reminding, setReminding] = useState(false)
  const [remindResult, setRemindResult] = useState(null)
  const [sendingReminder, setSendingReminder] = useState(false)

  const telegramId = user?.id
  const { data: payments, refetch } = useTeacherPayments(telegramId, activeFilter)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  // Client-side filter by month
  const displayPayments = (payments || []).filter((payment) => {
    if (monthFilter === 'current') {
      return payment.period_month === currentMonth && payment.period_year === currentYear
    }
    if (monthFilter === 'prev') {
      return payment.period_month === prevMonth && payment.period_year === prevYear
    }
    return true // 'all'
  })

  const filters = [
    { key: 'all', label: t('teacherFinance.filterAll') },
    { key: 'paid', label: t('teacherFinance.filterPaid') },
    { key: 'unpaid', label: t('teacherFinance.filterUnpaid') },
  ]

  const totalEarned = displayPayments
    .filter((payment) => payment.status === 'paid')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0)
  const totalUnpaid = displayPayments
    .filter((payment) => payment.status === 'unpaid')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0)

  const handleMassRemind = async () => {
    haptic?.heavy?.()
    setReminding(true)
    try {
      const res = await remindDebtors()
      setRemindResult(res)
    } catch (e) {
      alert(lang === 'ru' ? 'Ошибка при отправке напоминаний' : 'Eslatma yuborishda xatolik yuz berdi')
    } finally {
      setReminding(false)
    }
  const handleSingleRemind = async (payment) => {
    haptic?.medium?.()
    const student = payment.student
    if (!student) return

    setSendingReminder(true)
    try {
      const res = await remindStudent(payment.id)
      if (res.sent) {
        window.Telegram?.WebApp?.showAlert?.(
          lang === 'ru' ? 'Напоминание успешно отправлено через бот!' : 'Eslatma bot orqali muvaffaqiyatli yuborildi!'
        )
        setSelectedPayment(null)
      } else {
        const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Talaba'
        if (student.username) {
          window.Telegram?.WebApp?.showConfirm?.(
            lang === 'ru' 
              ? `У студента не зарегистрирован чат с ботом. Открыть личный чат с @${student.username.replace(/^@/, '')}?`
              : `Talaba bot bilan suhbatni boshlamagan. @${student.username.replace(/^@/, '')} bilan shaxsiy chatni ochishni xohlaysizmi?`,
            (ok) => {
              if (ok) openTelegramLink(`https://t.me/${student.username.replace(/^@/, '')}`)
            }
          )
        } else {
          navigator.clipboard.writeText(res.text).then(() => {
            window.Telegram?.WebApp?.showAlert?.(
              lang === 'ru'
                ? `Бот не может написать студенту (нет активного чата), и у него нет юзернейма. Текст напоминания скопирован в буфер обмена:\n\n"${res.text}"`
                : `Bot talabaga yoza olmaydi (faol chat yo'q) va talabada username ham yo'q. Eslatma matni buferga nusxalandi:\n\n"${res.text}"`
            )
          }).catch(() => {
            window.Telegram?.WebApp?.showAlert?.(`Eslatma:\n\n"${res.text}"`)
          })
        }
      }
    } catch (e) {
      alert(lang === 'ru' ? 'Ошибка при отправке' : 'Yuborishda xatolik yuz berdi')
    } finally {
      setSendingReminder(false)
    }
  }

  const getName = (payment) =>
    payment.student
      ? `${payment.student.first_name} ${payment.student.last_name || ''}`.trim()
      : '?'

  const getGroup = (payment) => payment.group?.name || '—'

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6 pb-28">
        <div className="mb-5 flex justify-between items-end">
          <div>
            <h1 className="m3-display-md">{t('teacherFinance.title')}</h1>
            <p className="text-on-surface-variant text-sm">{t('teacherFinance.subtitle')}</p>
          </div>
          <select 
            value={monthFilter} 
            onChange={(e) => { setMonthFilter(e.target.value); haptic?.selection() }}
            className="bg-surface-high text-on-surface text-xs font-bold px-3 py-2 rounded-xl border border-outline-variant outline-none focus:border-brand"
          >
            <option value="current">{lang === 'ru' ? 'Этот месяц' : 'Shu oy'}</option>
            <option value="prev">{lang === 'ru' ? 'Прошлый месяц' : 'O\'tgan oy'}</option>
            <option value="all">{lang === 'ru' ? 'Все время' : 'Barcha vaqt'}</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-gradient-to-br from-paid-green/90 to-paid-green/70 text-white rounded-[24px] p-4 flex flex-col justify-between h-28 shadow-glow-sm shadow-paid-green/10">
            <div>
              <p className="text-[10px] uppercase font-bold opacity-80">{lang === 'ru' ? 'Получено' : 'Keltirilgan'}</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold">{formatUZS(totalEarned, true)}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-debt-red/90 to-debt-red/70 text-white rounded-[24px] p-4 flex flex-col justify-between h-28 shadow-glow-sm shadow-debt-red/10">
            <div>
              <p className="text-[10px] uppercase font-bold opacity-80">{lang === 'ru' ? 'Долги' : 'Qarzdorlik'}</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold">{formatUZS(totalUnpaid, true)}</p>
            </div>
          </div>
        </div>

        {totalUnpaid > 0 && (
          <button
            onClick={handleMassRemind}
            disabled={reminding}
            className="w-full h-12 mb-5 rounded-2xl bg-brand text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            🔔 {reminding ? (lang === 'ru' ? 'Отправка...' : 'Yuborilmoqda...') : (lang === 'ru' ? 'Напомнить должникам' : 'Qarzdorlarga eslatish')}
          </button>
        )}

        <div className="chip-row mb-4">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => {
                setActiveFilter(filter.key)
                haptic?.selection()
              }}
              className={`chip whitespace-nowrap transition-all duration-200 ${
                activeFilter === filter.key
                  ? 'bg-brand text-on-primary font-bold shadow-glow-sm scale-105'
                  : 'bg-surface-high text-on-surface-variant'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {displayPayments.map((payment, index) => (
            <div
              key={payment.id || index}
              className={`m3-card stagger-item border-l-[4px] ${
                payment.status === 'paid'
                  ? 'border-l-paid-green'
                  : payment.status === 'unpaid'
                    ? 'border-l-debt-red'
                    : 'border-l-partial-orange'
              }`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={getName(payment)} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface text-sm truncate">{getName(payment)}</p>
                  <p className="text-on-surface-variant text-xs truncate">👥 {getGroup(payment)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-on-surface text-sm">{formatUZS(payment.amount)}</p>
                  {payment.status === 'paid' && <span className="badge-paid text-[10px]">✓ {t('common.paid')}</span>}
                  {payment.status === 'unpaid' && (
                    <span className="badge-unpaid text-[10px] flex items-center gap-0.5">
                      <XCircle size={10} /> {t('common.unpaid')}
                    </span>
                  )}
                  {payment.status === 'partial' && (
                    <span className="badge-partial text-[10px]">{t('common.partial')}</span>
                  )}
                </div>
              </div>

              {(payment.status === 'unpaid' || payment.status === 'partial') && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      haptic?.light()
                      setSelectedPayment(payment)
                    }}
                    className="m3-btn-sm-tonal flex-1"
                  >
                    {t('common.details')}
                  </button>
                  <button
                    onClick={() => {
                      haptic?.medium()
                      setMarkStudent(payment)
                    }}
                    className="m3-btn-sm-filled flex-1"
                  >
                    ✓ {t('teacherFinance.markPaid')}
                  </button>
                </div>
              )}
            </div>
          ))}

          {!displayPayments.length && (
            <div className="m3-card text-center py-10 text-on-surface-variant">
              {t('teacherFinance.noPayments')}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={!!selectedPayment} onClose={() => setSelectedPayment(null)} title={t('common.details')}>
        {selectedPayment && (
          <div className="space-y-4 text-on-surface">
            <div className="flex items-center gap-3 bg-surface-container rounded-2xl p-4">
              <Avatar name={getName(selectedPayment)} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{getName(selectedPayment)}</p>
                <p className="text-on-surface-variant text-sm truncate">👥 {getGroup(selectedPayment)}</p>
              </div>
            </div>
            
            <div className="m3-card space-y-3 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('teacherFinance.periodLabel')}:</span>
                <span className="font-semibold">{selectedPayment.period_month}/{selectedPayment.period_year}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('teacherFinance.amountLabel')}:</span>
                <span className="font-semibold text-brand">{formatUZS(selectedPayment.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('teacherFinance.statusLabel')}:</span>
                <span className={`font-semibold ${selectedPayment.status === 'paid' ? 'text-paid-green' : 'text-debt-red'}`}>
                  {selectedPayment.status === 'paid' ? t('common.paid') : t('common.unpaid')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('teacherFinance.dateLabel')}:</span>
                <span className="font-semibold text-xs">
                  {new Date(selectedPayment.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            {selectedPayment.status !== 'paid' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSingleRemind(selectedPayment)}
                  disabled={sendingReminder}
                  className="m3-btn-filled flex-1 gap-1"
                >
                  🔔 {sendingReminder ? (lang === 'ru' ? 'Отправка...' : 'Yuborilmoqda...') : t('common.remind')}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!markStudent} onClose={() => setMarkStudent(null)} title={t('teacherFinance.markPayment')} closeOnBackdropClick={false}>
        <MarkPaymentModal
          student={markStudent}
          onClose={() => setMarkStudent(null)}
          onPaid={refetch}
          t={t}
          haptic={haptic}
        />
      </Modal>

      <Modal isOpen={!!remindResult} onClose={() => setRemindResult(null)} title={lang === 'ru' ? 'Результат напоминания' : 'Eslatmalar natijasi'}>
        {remindResult && (
          <div className="space-y-4">
            <div className="bg-surface-container rounded-2xl p-4 text-center">
              <p className="text-xs font-semibold text-on-surface-variant mb-1">
                {lang === 'ru' ? 'Отправлено автоматически через бот' : 'Bot orqali avtomatik yuborildi'}
              </p>
              <p className="text-3xl font-extrabold text-paid-green">{remindResult.sentCount}</p>
            </div>
            
            {remindResult.failedStudents?.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-error px-1">
                  {lang === 'ru' ? 'Не удалось отправить напрямую (скопируйте текст):' : 'To\'g\'ridan-to\'g\'ri yuborib bo\'lmadi (nusxalash):'}
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {remindResult.failedStudents.map(student => (
                    <div key={student.id} className="bg-surface-high p-3 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-on-surface truncate">{student.name}</p>
                        <p className="text-xs text-on-surface-variant font-serif">{formatUZS(student.amount)}</p>
                      </div>
                      <button 
                        onClick={() => {
                          haptic?.selection()
                          navigator.clipboard.writeText(student.text)
                          alert(lang === 'ru' ? 'Текст скопирован!' : 'Xabar matni nusxalandi!')
                        }}
                        className="bg-brand/20 text-primary font-bold text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-transform whitespace-nowrap"
                      >
                        {lang === 'ru' ? 'Копировать' : 'Nusxalash'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button className="m3-btn-filled w-full mt-4" onClick={() => setRemindResult(null)}>
              {t('common.close')}
            </button>
          </div>
        )}
      </Modal>

      <BottomNav role="teacher" />
    </div>
  )
}
