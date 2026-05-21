import React, { useState } from 'react'
import { TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { mockFinanceStudents } from '../../data/mockData'

function MarkPaymentModal({ student, onClose, t, haptic }) {
  const [method, setMethod] = useState('cash')
  const [amount, setAmount] = useState(student?.amount || 0)

  const methods = [
    { key: 'cash', label: t('teacherFinance.cash') },
    { key: 'card', label: t('teacherFinance.card') },
    { key: 'transfer', label: t('teacherFinance.transfer') },
  ]

  return (
    <div className="space-y-5">
      {/* Student info */}
      <div className="flex items-center gap-3 bg-surface-container rounded-2xl p-4">
        <Avatar name={student?.name} size="md" />
        <div className="flex-1">
          <p className="font-bold text-on-surface">{student?.name}</p>
          <p className="text-on-surface-variant text-sm">{student?.group}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-debt-red">{formatUZS(student?.amount)}</p>
          <p className="text-xs text-debt-red font-bold">{t('common.unpaid').toUpperCase()}</p>
        </div>
      </div>

      {/* Amount input */}
      <div>
        <label className="text-sm font-semibold text-on-surface-variant mb-2 block">
          {t('teacherFinance.amountReceived')}
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="input-field"
          placeholder="0"
        />
      </div>

      {/* Method */}
      <div>
        <label className="text-sm font-semibold text-on-surface-variant mb-2 block">
          {t('teacherFinance.method')}
        </label>
        <div className="flex gap-2">
          {methods.map(m => (
            <button
              key={m.key}
              onClick={() => { setMethod(m.key); haptic?.selection() }}
              className={`flex-1 h-11 rounded-full border font-semibold text-sm transition-all duration-200 ${
                method === m.key
                  ? 'bg-brand border-brand text-white'
                  : 'bg-transparent border-outline-variant text-on-surface'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date + Note */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Sana</label>
          <div className="input-field flex items-center text-on-surface">{t('common.today')}</div>
        </div>
        <div className="flex-1">
          <label className="text-sm font-semibold text-on-surface-variant mb-2 block">
            {t('teacherFinance.note')}
          </label>
          <input placeholder="..." className="input-field" />
        </div>
      </div>

      <button
        onClick={() => { haptic?.success(); onClose() }}
        className="btn-primary mt-2"
      >
        <CheckCircle size={18} /> {t('teacherFinance.confirmPayment')}
      </button>
    </div>
  )
}

export default function TeacherFinance() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const [activeFilter, setActiveFilter] = useState('all')
  const [markStudent, setMarkStudent] = useState(null)

  const filters = [
    { key: 'all', label: t('teacherFinance.filterAll') },
    { key: 'paid', label: t('teacherFinance.filterPaid') },
    { key: 'unpaid', label: t('teacherFinance.filterUnpaid') },
    { key: 'week', label: t('teacherFinance.filterWeek') },
  ]

  const filtered = mockFinanceStudents.filter(s => {
    if (activeFilter === 'paid') return s.status === 'paid'
    if (activeFilter === 'unpaid') return s.status === 'unpaid'
    return true
  })

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <TopBar user={user} />

      <div className="page-wrapper px-4 pt-5">
        <div className="mb-5">
          <h1 className="text-[28px] font-extrabold text-on-surface">{t('teacherFinance.title')}</h1>
          <p className="text-on-surface-variant text-sm">{t('teacherFinance.subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 card">
            <div className="flex items-start justify-between mb-2">
              <p className="text-on-surface-variant text-xs font-medium">{t('teacherFinance.earned')}</p>
              <div className="w-8 h-8 rounded-xl bg-surface-high flex items-center justify-center">
                <TrendingUp size={14} className="text-paid-green" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-on-surface">{formatUZS(3_240_000, true)}</p>
            <p className="text-paid-green text-xs font-semibold mt-0.5">↗ +12 dars</p>
          </div>
          <div className="flex-1 card">
            <div className="flex items-start justify-between mb-2">
              <p className="text-on-surface-variant text-xs font-medium">{t('teacherFinance.outstanding')}</p>
              <div className="w-8 h-8 rounded-xl bg-surface-high flex items-center justify-center">
                <Clock size={14} className="text-partial-orange" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-debt-red">{formatUZS(450_000, true)}</p>
            <p className="text-on-surface-variant text-xs mt-0.5">Kutilayotgan</p>
          </div>
        </div>

        {/* Filters */}
        <div className="chip-row mb-4">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => { setActiveFilter(f.key); haptic?.selection() }}
              className={`chip whitespace-nowrap ${activeFilter === f.key ? 'chip-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Student list */}
        <div className="space-y-3">
          {filtered.map((s, i) => (
            <div
              key={s.id}
              className="card stagger-item"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={s.name} size="md" />
                <div className="flex-1">
                  <p className="font-bold text-on-surface text-sm">{s.name}</p>
                  <p className="text-on-surface-variant text-xs">👥 {s.group}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-on-surface text-sm">{formatUZS(s.amount)}</p>
                  {s.status === 'paid' && (
                    <span className="badge-paid text-[10px]">✓ {t('common.paid')}</span>
                  )}
                  {s.status === 'unpaid' && (
                    <span className="badge-unpaid text-[10px] flex items-center gap-0.5">
                      <XCircle size={10} /> {t('common.unpaid')}
                    </span>
                  )}
                  {s.status === 'partial' && (
                    <span className="badge-partial text-[10px]">
                      {t('common.partial')} ({formatUZS(s.remaining)})
                    </span>
                  )}
                </div>
              </div>

              {(s.status === 'unpaid' || s.status === 'partial') && (
                <div className="flex gap-2">
                  <button className="btn-secondary h-10 flex-1 text-sm">{t('common.details')}</button>
                  <button
                    onClick={() => { haptic?.medium(); setMarkStudent(s) }}
                    className="btn-primary h-10 flex-1 text-sm"
                  >
                    {t('teacherFinance.markPaid')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={!!markStudent}
        onClose={() => setMarkStudent(null)}
        title={t('teacherFinance.markPayment')}
      >
        <MarkPaymentModal
          student={markStudent}
          onClose={() => setMarkStudent(null)}
          t={t}
          haptic={haptic}
        />
      </Modal>

      <BottomNav role="teacher" />
    </div>
  )
}
