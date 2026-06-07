import { supabase } from '../../lib/supabase'

export function isRetryableError(error) {
  if (!error) return false

  const message = String(error.message || '').toLowerCase()
  const code = String(error.code || '').toLowerCase()
  const status = Number(error.status || error.statusCode || 0)

  if (status >= 500 || status === 408 || status === 429) return true
  if (code === 'fetcherror' || code === 'ecconnreset' || code === 'etimedout') return true

  return [
    'failed to fetch',
    'networkerror',
    'network request failed',
    'timed out',
    'timeout',
    'connection',
    'gateway',
    'service unavailable',
  ].some((token) => message.includes(token))
}

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
