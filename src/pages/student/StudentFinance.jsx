import React from 'react'
import { MessageCircle, CheckCircle } from 'lucide-react'
import { BottomNav } from '../../components/layout/BottomNav'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { useStudentPayments } from '../../hooks/useSupabaseData'
import { mockStudentPayments } from '../../data/mockData'

export default function StudentFinance() {
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const { data: payments } = useStudentPayments(user?.id)
  const displayPayments = payments?.length ? payments : mockStudentPayments

  // Total unpaid
  const totalUnpaid = displayPayments
    .filter(p => p.status === 'unpaid' || p.status === 'pending')
    .reduce((s, p) => s + (p.amount || 0), 0)

  // Group by month
  const grouped = displayPayments.reduce((acc, p) => {
    const date = p.created_at || p.date
    const month = date
      ? new Date(date).toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })
      : (p.month || 'Hozirgi')
    if (!acc[month]) acc[month] = []
    acc[month].push(p)
    return acc
  }, {})

  const getSubjectIcon = (name) => {
    if (!name) return '📚'
    const n = name.toLowerCase()
    if (n.includes('mat') || n.includes('calc')) return 'Σ'
    if (n.includes('fiz') || n.includes('phy')) return '⚗'
    if (n.includes('his') || n.includes('tar')) return '📜'
    if (n.includes('chem') || n.includes('kim')) return '🧪'
    return '📚'
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <div className="page-wrapper px-4 pt-6 space-y-5">
        <h1 className="text-[28px] font-extrabold text-on-surface">{t('studentFinance.title')}</h1>

        {/* Outstanding Balance */}
        {totalUnpaid > 0 && (
          <div className="rounded-card p-5 stagger-item"
            style={{ background: 'linear-gradient(135deg, #2a1a1a, #1f1520)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p className="text-on-surface-variant text-sm mb-2">{t('studentFinance.outstanding')}</p>
            <div className="flex items-baseline gap-3 mb-4">
              <p className="text-3xl font-extrabold text-debt-red">{formatUZS(totalUnpaid)}</p>
            </div>
            <button onClick={() => haptic?.light()} className="btn-secondary h-11 text-sm">
              <MessageCircle size={16} /> {t('studentFinance.contactTeacher')}
            </button>
          </div>
        )}

        {/* Payment History */}
        <div>
          <h2 className="text-xl font-bold text-on-surface mb-4">{t('studentFinance.paymentHistory')}</h2>
          {Object.entries(grouped).map(([month, monthPayments]) => (
            <div key={month} className="mb-5">
              <p className="text-on-surface-variant text-sm font-semibold mb-3 capitalize">{month}</p>
              <div className="card space-y-0">
                {monthPayments.map((p, i) => {
                  const subjectName = p.group?.name || p.subject || '—'
                  const isPaid = p.status === 'paid'
                  const dateStr = p.created_at
                    ? new Date(p.created_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })
                    : p.date
                  return (
                    <div key={p.id || i}>
                      <div className="flex items-center gap-3 py-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                          {getSubjectIcon(subjectName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface text-sm truncate">{subjectName}</p>
                          <p className="text-on-surface-variant text-xs">{dateStr} {p.hours ? `• ${p.hours}` : ''}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-on-surface">{formatUZS(p.amount)}</p>
                          {isPaid
                            ? <span className="badge-paid text-[10px]"><CheckCircle size={10} /> {t('common.paid')}</span>
                            : <span className="text-xs font-semibold text-on-surface-variant bg-surface-high px-2 py-0.5 rounded-full">{t('common.pending')}</span>
                          }
                        </div>
                      </div>
                      {i < monthPayments.length - 1 && <hr className="divider" />}
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
