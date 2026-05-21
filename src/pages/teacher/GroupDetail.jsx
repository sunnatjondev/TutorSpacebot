import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Circle, MoreVertical, Plus } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { useTelegram, useTelegramBackButton } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { formatUZS } from '../../utils/currency'
import { mockGroups, mockStudents } from '../../data/mockData'
import { useParams } from 'react-router-dom'

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const { t } = useI18n()

  // Use Telegram back button on sub-pages
  useTelegramBackButton(() => navigate(-1))

  const group = mockGroups.find(g => g.id === Number(id)) || mockGroups[0]
  const students = mockStudents.slice(0, 5)

  const [attendance, setAttendance] = useState(
    students.reduce((acc, s) => ({ ...acc, [s.id]: false }), {})
  )

  const toggleAttendance = (sid) => {
    haptic?.light()
    setAttendance(prev => ({ ...prev, [sid]: !prev[sid] }))
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-outline-variant/40 sticky top-0 z-30 bg-surface-lowest/80 backdrop-blur-xl">
        <button
          onClick={() => { haptic?.light(); navigate(-1) }}
          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft size={18} className="text-on-surface" />
        </button>
        <h1 className="font-bold text-on-surface flex-1 truncate">{group.name}</h1>
        <button className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center">
          <MoreVertical size={18} className="text-on-surface-variant" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-4">
        <div className="flex gap-2 mb-1">
          <span className="chip chip-active text-xs font-bold">{group.subject}</span>
          <span className="chip text-xs">{group.students} {t('teacherGroups.students')}</span>
        </div>

        {/* Attendance */}
        <div className="card">
          <p className="text-xs font-bold tracking-widest text-on-surface-variant mb-3">
            {t('groupDetail.attendance')}
          </p>
          <div className="space-y-0">
            {students.map((s, i) => (
              <div key={s.id}>
                <div className="flex items-center gap-3 py-3">
                  <Avatar name={s.name} size="md" />
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface text-sm">{s.name}</p>
                    <p className="text-on-surface-variant text-xs">{s.subject}</p>
                  </div>
                  <button onClick={() => toggleAttendance(s.id)} className="transition-all duration-200 active:scale-90">
                    {attendance[s.id] ? (
                      <CheckCircle size={24} className="text-paid-green" />
                    ) : (
                      <Circle size={24} className="text-outline" />
                    )}
                  </button>
                </div>
                {i < students.length - 1 && <hr className="divider" />}
              </div>
            ))}
          </div>
        </div>

        {/* Payments */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold tracking-widest text-on-surface-variant">
              {t('groupDetail.paymentStatus')}
            </p>
            <button className="text-primary text-xs font-semibold">{t('common.viewAll')}</button>
          </div>
          <div className="space-y-0">
            {students.map((s, i) => (
              <div key={s.id}>
                <div className="flex items-center gap-3 py-3">
                  <Avatar name={s.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-on-surface text-sm font-semibold">{s.name}</p>
                    <p className="text-on-surface-variant text-xs">{formatUZS(s.amount)}</p>
                  </div>
                  {s.status === 'paid' && <span className="badge-paid">✓ {t('common.paid')}</span>}
                  {s.status === 'unpaid' && <span className="badge-unpaid">{t('common.unpaid')}</span>}
                  {s.status === 'partial' && <span className="badge-partial">{t('common.partial')}</span>}
                </div>
                {i < students.length - 1 && <hr className="divider" />}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => { haptic?.medium(); navigate('/teacher/add-student') }}
          className="btn-secondary"
        >
          <Plus size={18} /> {t('groupDetail.addStudent')}
        </button>
      </div>
    </div>
  )
}
