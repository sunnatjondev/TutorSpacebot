import React, { useState } from 'react'
import { BookOpen, Wallet, CheckCircle, Circle, AlertTriangle } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { BottomNav } from '../../components/layout/BottomNav'
import { useTelegram } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { mockStudentUser, mockHomework } from '../../data/mockData'

export default function StudentDashboard() {
  const { user } = useTelegram()
  const { t } = useI18n()
  const s = mockStudentUser
  const [homework, setHomework] = useState(mockHomework)

  const toggleHw = (id) => {
    setHomework(prev => prev.map(h => h.id === id ? { ...h, done: !h.done } : h))
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <TopBar user={user} />
      <div className="page-wrapper px-4 pt-5 space-y-4">
        {/* Greeting */}
        <div className="animate-slide-down">
          <h1 className="text-2xl font-extrabold text-on-surface">
            {t('studentHome.greeting', { name: s.name.split(' ')[0] })}
          </h1>
          <p className="text-on-surface-variant text-sm mt-0.5">{t('studentHome.subtitle')}</p>
        </div>

        {/* Next Lesson Hero */}
        <div
          className="rounded-card p-5 stagger-item"
          style={{ background: 'linear-gradient(135deg, #5a52e0 0%, #7c74ff 60%, #a099ff 100%)', boxShadow: '0 8px 32px rgba(108,99,255,0.4)' }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold tracking-widest text-white/80 bg-white/15 px-3 py-1 rounded-full">
              {t('studentHome.nextLesson')}
            </span>
            <span className="text-xs font-semibold text-white/90 bg-white/15 px-3 py-1 rounded-full">
              {s.nextLesson.inTime}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-3 leading-tight">{s.nextLesson.subject}</h2>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">
              {s.nextLesson.teacher[0]}
            </div>
            <p className="text-white/90 text-sm font-medium">
              {s.nextLesson.teacher} · {s.nextLesson.time}
            </p>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 gap-3 stagger-item">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center">
                <CheckCircle size={18} className="text-primary" />
              </div>
              <div className="w-10 h-10">
                <svg viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(108,99,255,0.15)" strokeWidth="4"/>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#6C63FF" strokeWidth="4"
                    strokeDasharray={`${s.attendance * 0.88} 88`}
                    strokeLinecap="round" transform="rotate(-90 18 18)" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant font-medium tracking-wide">{t('studentHome.attendance')}</p>
            <p className="text-2xl font-extrabold text-on-surface">{s.attendance}<span className="text-sm font-medium text-on-surface-variant">%</span></p>
          </div>

          <div className="card">
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-error-container/30 flex items-center justify-center">
                <BookOpen size={18} className="text-error" />
              </div>
              {s.homeworkOverdue > 0 && (
                <span className="badge-unpaid text-[10px]">{s.homeworkOverdue} muddati o'tgan</span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant font-medium tracking-wide">{t('studentHome.homework')}</p>
            <p className="text-2xl font-extrabold text-on-surface">{s.homeworkCount}</p>
          </div>
        </div>

        {/* Balance */}
        <div
          className="card stagger-item"
          style={{ background: 'linear-gradient(135deg, #1f1f28, #2a1a1a)', border: '1px solid rgba(248,113,113,0.25)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-error-container/20 flex items-center justify-center">
              <Wallet size={18} className="text-error" />
            </div>
            <span className="badge-debt text-xs">{t('common.debt').toUpperCase()}</span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium tracking-wide mb-1">{t('studentHome.balance')}</p>
          <p className="text-3xl font-extrabold text-debt-red">{formatUZS(s.balance)}</p>
          <p className="text-on-surface-variant text-xs mt-1">{t('studentHome.debtContact')}</p>
        </div>

        {/* Upcoming Tasks */}
        <div className="stagger-item">
          <div className="section-header">
            <h2 className="section-title">{t('studentHome.upcomingTasks')}</h2>
            <button className="text-primary text-sm font-semibold">{t('common.viewAll')}</button>
          </div>
          <div className="card space-y-0">
            {homework.map((hw, i) => (
              <div key={hw.id}>
                <div className="flex items-start gap-3 py-3">
                  <button onClick={() => toggleHw(hw.id)} className="mt-0.5 active:scale-90 transition-transform">
                    {hw.done ? <CheckCircle size={22} className="text-paid-green" /> : <Circle size={22} className="text-outline" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold tracking-wide text-on-surface-variant bg-surface-high px-2 py-0.5 rounded-full">{hw.subject}</span>
                      {hw.overdue ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-partial-orange">
                          <AlertTriangle size={10} /> {hw.due}
                        </span>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant">{hw.due}</span>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${
                      hw.done ? 'line-through text-on-surface-variant' : 'text-on-surface'
                    } ${hw.overdue ? 'border border-debt-red/30 rounded-xl px-2 py-1 bg-debt-red/5' : ''}`}>
                      {hw.title}
                    </p>
                  </div>
                </div>
                {i < homework.length - 1 && <hr className="divider" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav role="student" />
    </div>
  )
}
