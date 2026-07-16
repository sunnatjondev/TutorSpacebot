import { randomBytes } from 'node:crypto'

export function getUrlOrigin(value) {
  try {
    return value ? new URL(value).origin : null
  } catch {
    return null
  }
}

export function normalizeOptionalText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeMarkdown(value) {
  return String(value ?? '').replace(/([_*`\[\]\\])/g, '\\$1')
}

export function escapeMarkdownV2(value) {
  return String(value ?? '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1')
}

export function buildTelegramUserPayload(user) {
  return {
    telegram_id: user?.id ?? null,
    first_name: normalizeOptionalText(user?.first_name) || 'Foydalanuvchi',
    last_name: normalizeOptionalText(user?.last_name),
    username: normalizeOptionalText(user?.username),
    updated_at: new Date().toISOString(),
  }
}

export function getCurrentPeriod() {
  const now = new Date()
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

export function generateInviteToken() {
  return randomBytes(8).toString('hex')
}

export function buildStudentName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Talaba'
}
