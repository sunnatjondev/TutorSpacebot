import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { config, hasSupabase } from './config.js'
import { buildTelegramUserPayload } from './helpers.js'

export const supabase = hasSupabase
  ? createClient(config.SUPABASE_URL, config.SUPABASE_KEY, {
      realtime: { transport: ws },
    })
  : null

export function requireServiceSupabase() {
  if (!supabase || !config.SUPABASE_SERVICE_KEY) {
    throw new Error('Backend Supabase service key is not configured')
  }
}

export async function getUserRowByTelegramId(telegramId) {
  requireServiceSupabase()
  if (!telegramId) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, role, first_name, last_name, username, photo_url, telegram_id, lesson_reminders_enabled, payment_alerts_enabled')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getUserRowByUsername(username) {
  const normalizedUsername = typeof username === 'string' ? username.trim().replace(/^@/, '') : null
  if (!normalizedUsername) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, role, first_name, last_name, username, photo_url, telegram_id')
    .eq('username', normalizedUsername)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertTrustedTelegramUser(telegramUser, overrides = {}) {
  requireServiceSupabase()

  const { data: existing } = await supabase
    .from('users')
    .select('role')
    .eq('telegram_id', telegramUser.id)
    .maybeSingle()

  const payload = {
    ...buildTelegramUserPayload(telegramUser),
    role: existing?.role || overrides.role || null,
    ...overrides,
  }

  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'telegram_id', ignoreDuplicates: false })
    .select('id, telegram_id, role, first_name, last_name, username, photo_url, lesson_reminders_enabled, payment_alerts_enabled')
    .single()

  if (error) throw error
  return data
}

export async function requireUserRow(telegramUser) {
  const userRow = await upsertTrustedTelegramUser(telegramUser)
  if (!userRow) throw new Error('User not found')
  return userRow
}

export async function requireGroupOwner(userId, groupId) {
  if (!groupId) throw new Error('groupId is required')

  const { data: group } = await supabase
    .from('groups')
    .select('id, teacher_id')
    .eq('id', groupId)
    .maybeSingle()
  if (!group) throw new Error('Group not found')
  if (group.teacher_id !== userId) throw new Error('Unauthorized: you do not own this group')
  return group
}

export async function requireSessionOwner(userId, sessionId) {
  if (!sessionId) throw new Error('sessionId is required')

  const { data: session } = await supabase
    .from('sessions')
    .select('id, group_id, groups(teacher_id)')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) throw new Error('Session not found')
  if (session.groups?.teacher_id !== userId) throw new Error('Unauthorized: you do not own this session')
  return session
}


export async function requireGroupMember(studentId, groupId) {
  if (!studentId) throw new Error('studentId is required')
  if (!groupId) throw new Error('groupId is required')

  const { data: membership, error } = await supabase
    .from('group_members')
    .select('id')
    .eq('student_id', studentId)
    .eq('group_id', groupId)
    .maybeSingle()

  if (error) throw error
  if (!membership) throw new Error('Student is not a member of this group')
  return membership
}
