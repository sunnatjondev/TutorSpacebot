import React from 'react'
import { MessageCircle, CheckCircle } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { BottomNav } from '../../components/layout/BottomNav'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { mockStudentPayments } from '../../data/mockData'

const subjectIcons = {
  'Oliy Matematika': 'Σ',
  'Fizika 101': '⚗',
  'Calculus Tayyorgarligi': 'Σ',
  'Tarix Insho Tahlili': '📜',
}

export default function StudentFinance() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()

  const octPayments = mockStudentPayments.filter(p => !p.month)
  const sepPayments = mockStudentPayments.filter(p => p.month)

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <TopBar user={user} />
      <div className="page-wrapper px-4 pt-5 space-y-5">
        <h1 className="text-[28px] font-extrabold text-on-surface">{t('studentFinance.title')}</h1>

        {/* Outstanding Balance */}
        <div
          className="rounded-card p-5 stagger-item"
          style={{ background: 'linear-gradient(135deg, #2a1a1a, #1f1520)', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <p className="text-on-surface-variant text-sm mb-2">{t('studentFinance.outstanding')}</p>
          <div className="flex items-baseline gap-3 mb-4">
            <p className="text-3xl font-extrabold text-debt-red">{formatUZS(240_000)}</p>
            <p className="text-on-surface-variant text-sm">{t('studentFinance.dueDate', { date: '15-okt' })}</p>
          </div>
          <button
            onClick={() => haptic?.light()}
            className="btn-secondary h-11 text-sm"
          >
            <MessageCircle size={16} /> {t('studentFinance.contactTeacher')}
          </button>
        </div>

        {/* Payment History */}
        <div>
          <h2 className="text-xl font-bold text-on-surface mb-4">{t('studentFinance.paymentHistory')}</h2>
          <p className="text-on-surface-variant text-sm font-semibold mb-3">Oktyabr 2025</p>
          <div className="card mb-4 space-y-0">
            {octPayments.map((p, i) => (
              <div key={p.id}>
                <div className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-primary font-bold text-lg">
                    {subjectIcons[p.subject] || '📚'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface text-sm">{p.subject}</p>
                    <p className="text-on-surface-variant text-xs">{p.date} • {p.hours}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-on-surface">{formatUZS(p.amount)}</p>
                    <span className="text-xs font-semibold text-on-surface-variant bg-surface-high px-2 py-0.5 rounded-full">
                      {t('common.pending')}
                    </span>
                  </div>
                </div>
                {i < octPayments.length - 1 && <hr className="divider" />}
              </div>
            ))}
          </div>

          <p className="text-on-surface-variant text-sm font-semibold mb-3">{sepPayments[0]?.month}</p>
          <div className="card space-y-0">
            {sepPayments.map((p, i) => (
              <div key={p.id}>
                <div className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-primary font-bold text-lg">
                    {subjectIcons[p.subject] || '📚'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface text-sm">{p.subject}</p>
                    <p className="text-on-surface-variant text-xs">{p.date} • {p.hours}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-on-surface">{formatUZS(p.amount)}</p>
                    <span className="badge-paid text-[10px]"><CheckCircle size={10} /> {t('common.paid')}</span>
                  </div>
                </div>
                {i < sepPayments.length - 1 && <hr className="divider" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav role="student" />
    </div>
  )
}
