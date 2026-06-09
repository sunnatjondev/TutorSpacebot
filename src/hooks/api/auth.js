import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { normalizeOptionalText } from './core'

export function buildTelegramUserPayload(tgUser, overrides = {}) {
  return {
    telegram_id: overrides.telegram_id ?? tgUser?.id ?? null,
    first_name: normalizeOptionalText(tgUser?.first_name) || 'Foydalanuvchi',
    last_name: normalizeOptionalText(tgUser?.last_name),
    username: normalizeOptionalText(tgUser?.username),
    photo_url: normalizeOptionalText(tgUser?.photo_url),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export async function getUserRowByTelegramId(telegramId) {
  if (!isSupabaseConfigured || !telegramId) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, role, first_name, last_name, username, photo_url, lesson_reminders_enabled, payment_alerts_enabled')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getUserRowByUsername(username) {
  const normalizedUsername = normalizeOptionalText(username)?.replace(/^@/, '')
  if (!isSupabaseConfigured || !normalizedUsername) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, role, first_name, last_name, username, photo_url, telegram_id, lesson_reminders_enabled, payment_alerts_enabled')
    .eq('username', normalizedUsername)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertTelegramUser(tgUser) {
  if (!isSupabaseConfigured || !tgUser?.id) return null

  const { data, error } = await supabase
    .from('users')
    .upsert(
      buildTelegramUserPayload(tgUser),
      { onConflict: 'telegram_id', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) {
    console.error('[Supabase] upsertTelegramUser:', error)
    return null
  }

  return data
}

export async function saveUserRole(telegramUserOrId, role) {
  const telegramId =
    typeof telegramUserOrId === 'object' && telegramUserOrId !== null
      ? telegramUserOrId.id
      : telegramUserOrId

  if (!isSupabaseConfigured || !telegramId) return

  const request =
    typeof telegramUserOrId === 'object' && telegramUserOrId !== null
      ? supabase
          .from('users')
          .upsert(
            buildTelegramUserPayload(telegramUserOrId, { role }),
            { onConflict: 'telegram_id', ignoreDuplicates: false }
          )
      : supabase
          .from('users')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('telegram_id', telegramId)

  const { error } = await request
  if (error) throw error
}

export async function updateNotificationPreferences(telegramId, payload) {
  if (!isSupabaseConfigured || !telegramId) return

  const { error } = await supabase
    .from('users')
    .update(payload)
    .eq('telegram_id', telegramId)

  if (error) throw error
}
