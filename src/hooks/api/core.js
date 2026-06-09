export function normalizeOptionalText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export function getCurrentPeriod() {
  const now = new Date()
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

export function generateInviteToken() {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) {
    return uuid.replace(/-/g, '').slice(0, 12)
  }

  return Math.random().toString(36).slice(2, 14)
}

export function buildStudentName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Talaba'
}
