import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Plus } from 'lucide-react'
import { useTelegram, useTelegramBackButton } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'

const groups = ['Fizika 101', 'Calculus Tayyorgarligi', 'Ingliz Adabiyoti']

export default function AddStudent() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const { t } = useI18n()

  useTelegramBackButton(() => navigate(-1))

  const [selectedGroups, setSelectedGroups] = useState(['Fizika 101'])
  const [billingDay, setBillingDay] = useState(1)
  const [form, setForm] = useState({ name: '', contact: '', subject: '', rate: '', notes: '' })

  const toggleGroup = (g) => {
    haptic?.selection()
    setSelectedGroups(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
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
        <h1 className="font-bold text-on-surface text-lg flex-1">{t('addStudent.title')}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 space-y-5">
        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-brand/20 border-2 border-brand/40 flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
            <span className="text-2xl font-extrabold text-primary">TD</span>
          </div>
          <span className="text-on-surface-variant text-sm flex items-center gap-1">
            <Upload size={13} /> {t('addStudent.uploadPhoto')}
          </span>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">👤</span>
            <input
              className="input-field pl-10"
              placeholder={t('addStudent.fullName')}
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">📱</span>
            <input
              className="input-field pl-10"
              placeholder={t('addStudent.contact')}
              value={form.contact}
              onChange={e => setForm(p => ({ ...p, contact: e.target.value }))}
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">🎓</span>
            <input
              className="input-field pl-10"
              placeholder={t('addStudent.subject')}
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            />
          </div>
        </div>

        {/* Assign to Group */}
        <div>
          <p className="font-semibold text-on-surface mb-3">{t('addStudent.assignGroup')}</p>
          <div className="chip-row flex-wrap gap-2">
            {groups.map(g => (
              <button
                key={g}
                onClick={() => toggleGroup(g)}
                className={`chip ${selectedGroups.includes(g) ? 'chip-active' : ''}`}
              >
                {g}
              </button>
            ))}
            <button className="chip" onClick={() => haptic?.light()}>
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* Monthly Rate */}
        <div>
          <p className="font-semibold text-on-surface mb-2">{t('addStudent.monthlyRate')}</p>
          <div className="relative">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs font-semibold">so'm</span>
            <input
              type="number"
              className="input-field pr-14"
              placeholder="200 000"
              value={form.rate}
              onChange={e => setForm(p => ({ ...p, rate: e.target.value }))}
            />
          </div>
        </div>

        {/* Billing Day */}
        <div>
          <p className="font-semibold text-on-surface mb-3">{t('addStudent.billingDay')}</p>
          <div className="card grid grid-cols-7 gap-1 p-3">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <button
                key={d}
                onClick={() => { setBillingDay(d); haptic?.selection() }}
                className={`h-9 w-full rounded-xl text-sm font-semibold transition-all duration-150 ${
                  billingDay === d
                    ? 'bg-brand text-white'
                    : 'text-on-surface-variant hover:bg-surface-high active:scale-90'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="font-semibold text-on-surface mb-2">{t('addStudent.notes')}</p>
          <textarea
            className="w-full rounded-card bg-surface-container border border-outline-variant px-4 py-3 text-on-surface text-sm placeholder-on-surface-variant outline-none focus:border-brand resize-none"
            placeholder={t('addStudent.notesPlaceholder')}
            rows={3}
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="px-4 pb-6 pt-2 border-t border-outline-variant/40">
        <button
          className="btn-primary"
          onClick={() => { haptic?.success(); navigate(-1) }}
        >
          👤 {t('addStudent.submit')}
        </button>
      </div>
    </div>
  )
}
