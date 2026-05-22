import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Plus } from 'lucide-react'
import { useTelegram, useTelegramBackButton } from '../../hooks/useTelegram'
import { useI18n } from '../../i18n/index.jsx'
import { createStudent, useTeacherGroups } from '../../hooks/useSupabaseData'

export default function AddStudent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, haptic } = useTelegram()
  const { t } = useI18n()
  const { data: groups } = useTeacherGroups(user?.id)

  const initialGroupId = location.state?.groupId || null
  const availableGroups = groups || []

  useTelegramBackButton(() => navigate(-1))

  const [selectedGroupIds, setSelectedGroupIds] = useState(initialGroupId ? [initialGroupId] : [])
  const [billingDay, setBillingDay] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', contact: '', subject: '', rate: '', notes: '' })

  const canSubmit = useMemo(() => form.name.trim() && selectedGroupIds.length > 0, [form.name, selectedGroupIds])

  const toggleGroup = (groupId) => {
    haptic?.selection()
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((value) => value !== groupId) : [...prev, groupId]
    )
  }

  const handleSubmit = async () => {
    if (!canSubmit || saving) return

    setSaving(true)
    setError(null)
    haptic?.medium()

    const result = await createStudent(user?.id, {
      name: form.name,
      contact: form.contact,
      groupIds: selectedGroupIds,
      monthlyRate: form.rate,
      billingDay,
      subject: form.subject,
      notes: form.notes,
    })

    setSaving(false)

    if (!result.success) {
      setError(result.error?.message || "Talabani saqlab bo'lmadi.")
      haptic?.error?.()
      return
    }

    haptic?.success?.()

    const targetGroupId = initialGroupId || result.data?.primaryGroupId
    if (targetGroupId) {
      navigate(`/teacher/groups/${targetGroupId}`, { replace: true })
      return
    }

    navigate('/teacher/groups', { replace: true })
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-outline-variant/40 sticky top-0 z-30 bg-surface-lowest/80 backdrop-blur-xl">
        <button
          onClick={() => {
            haptic?.light()
            navigate(-1)
          }}
          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft size={18} className="text-on-surface" />
        </button>
        <h1 className="font-bold text-on-surface text-lg flex-1">{t('addStudent.title')}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 space-y-5">
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-brand/20 border-2 border-brand/40 flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
            <span className="text-2xl font-extrabold text-primary">TD</span>
          </div>
          <span className="text-on-surface-variant text-sm flex items-center gap-1">
            <Upload size={13} /> {t('addStudent.uploadPhoto')}
          </span>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">👤</span>
            <input
              className="input-field pl-10"
              placeholder={t('addStudent.fullName')}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">📱</span>
            <input
              className="input-field pl-10"
              placeholder={t('addStudent.contact')}
              value={form.contact}
              onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">🎓</span>
            <input
              className="input-field pl-10"
              placeholder={t('addStudent.subject')}
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <p className="font-semibold text-on-surface mb-3">{t('addStudent.assignGroup')}</p>
          <div className="chip-row flex-wrap gap-2">
            {availableGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => toggleGroup(group.id)}
                className={`chip ${selectedGroupIds.includes(group.id) ? 'chip-active' : ''}`}
              >
                {group.name}
              </button>
            ))}
          </div>
          {!availableGroups.length && (
            <p className="text-on-surface-variant text-xs mt-2">Avval kamida bitta guruh yarating</p>
          )}
        </div>

        <div>
          <p className="font-semibold text-on-surface mb-2">{t('addStudent.monthlyRate')}</p>
          <div className="relative">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs font-semibold">so'm</span>
            <input
              type="number"
              className="input-field pr-14"
              placeholder="200 000"
              value={form.rate}
              onChange={(event) => setForm((prev) => ({ ...prev, rate: event.target.value }))}
            />
          </div>
        </div>

        <div>
          <p className="font-semibold text-on-surface mb-3">{t('addStudent.billingDay')}</p>
          <div className="card grid grid-cols-7 gap-1 p-3">
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
              <button
                key={day}
                onClick={() => {
                  setBillingDay(day)
                  haptic?.selection()
                }}
                className={`h-9 w-full rounded-xl text-sm font-semibold transition-all duration-150 ${
                  billingDay === day
                    ? 'bg-brand text-white'
                    : 'text-on-surface-variant hover:bg-surface-high active:scale-90'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold text-on-surface mb-2">{t('addStudent.notes')}</p>
          <textarea
            className="w-full rounded-card bg-surface-container border border-outline-variant px-4 py-3 text-on-surface text-sm placeholder-on-surface-variant outline-none focus:border-brand resize-none"
            placeholder={t('addStudent.notesPlaceholder')}
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </div>
      </div>

      <div className="px-4 pb-6 pt-2 border-t border-outline-variant/40">
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
        >
          👤 {saving ? t('common.loading') : t('addStudent.submit')}
        </button>
      </div>
    </div>
  )
}
