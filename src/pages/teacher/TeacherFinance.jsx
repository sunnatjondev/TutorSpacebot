import React, { useState } from 'react'
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
          className="input-field"
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

      <button onClick={handleConfirm} disabled={loading} className="btn-primary mt-2">
        <CheckCircle size={18} /> {loading ? 'Saqlanmoqda...' : t('teacherFinance.confirmPayment')}
      </button>
    </div>
  )
}

export default function TeacherFinance() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const [activeFilter, setActiveFilter] = useState('all')
  const [markStudent, setMarkStudent] = useState(null)

  const telegramId = user?.id
  const { data: payments, refetch } = useTeacherPayments(telegramId, activeFilter)
  const displayPayments = payments || []

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

  const getName = (payment) =>
    payment.student
      ? `${payment.student.first_name} ${payment.student.last_name || ''}`.trim()
      : '?'

  const getGroup = (payment) => payment.group?.name || '—'

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6">
        <div className="mb-5">
          <h1 className="text-[28px] font-extrabold text-on-surface">{t('teacherFinance.title')}</h1>
          <p className="text-on-surface-variant text-sm">{t('teacherFinance.subtitle')}</p>
        </div>

        <div className="flex gap-3 mb-5">
          <div className="flex-1 card">
            <div className="flex items-start justify-between mb-2">
              <p className="text-on-surface-variant text-xs font-medium">{t('teacherFinance.earned')}</p>
              <div className="w-8 h-8 rounded-xl bg-surface-high flex items-center justify-center">
                <TrendingUp size={14} className="text-paid-green" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-on-surface">{formatUZS(totalEarned, true)}</p>
          </div>
          <div className="flex-1 card">
            <div className="flex items-start justify-between mb-2">
              <p className="text-on-surface-variant text-xs font-medium">{t('teacherFinance.outstanding')}</p>
              <div className="w-8 h-8 rounded-xl bg-surface-high flex items-center justify-center">
                <Clock size={14} className="text-partial-orange" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-debt-red">{formatUZS(totalUnpaid, true)}</p>
            <p className="text-on-surface-variant text-xs mt-0.5">Kutilayotgan</p>
          </div>
        </div>

        <div className="chip-row mb-4">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => {
                setActiveFilter(filter.key)
                haptic?.selection()
              }}
              className={`chip whitespace-nowrap ${activeFilter === filter.key ? 'chip-active' : ''}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {displayPayments.map((payment, index) => (
            <div key={payment.id || index} className="card stagger-item" style={{ animationDelay: `${index * 60}ms` }}>
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
                  <button className="btn-secondary h-10 flex-1 text-sm">{t('common.details')}</button>
                  <button
                    onClick={() => {
                      haptic?.medium()
                      setMarkStudent(payment)
                    }}
                    className="btn-primary h-10 flex-1 text-sm"
                  >
                    ✓ {t('teacherFinance.markPaid')}
                  </button>
                </div>
              )}
            </div>
          ))}

          {!displayPayments.length && (
            <div className="card text-center py-10 text-on-surface-variant">
              Hali to'lovlar yo'q
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={!!markStudent} onClose={() => setMarkStudent(null)} title={t('teacherFinance.markPayment')}>
        <MarkPaymentModal
          student={markStudent}
          onClose={() => setMarkStudent(null)}
          onPaid={refetch}
          t={t}
          haptic={haptic}
        />
      </Modal>

      <BottomNav role="teacher" />
    </div>
  )
}
