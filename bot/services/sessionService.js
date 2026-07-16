import { supabase, requireServiceSupabase, getUserRowByTelegramId, upsertTrustedTelegramUser, requireUserRow, requireGroupOwner, requireSessionOwner } from '../db.js'
import { signSupabaseAppJwt, verifyTelegramInitData } from '../auth.js'
import { getUrlOrigin, escapeHtml, escapeMarkdown, escapeMarkdownV2, buildTelegramUserPayload, getCurrentPeriod, generateInviteToken, buildStudentName } from '../helpers.js'
import { validate } from '../validation.js'
import { config } from '../config.js'

export async function handleSessionCreate(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  await requireGroupOwner(user.id, body.groupId)

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      group_id: body.groupId,
      scheduled_at: body.scheduledAt,
      duration_min: body.durationMin || config.DEFAULT_SESSION_DURATION_MIN,
      status: 'upcoming',
    })
    .select('id, group_id, scheduled_at, duration_min, status')
    .single()

  if (error) throw error
  return { ok: true, session: data }
}

export async function handleSessionUpdate(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  await requireSessionOwner(user.id, body.sessionId)

  const updatePayload = {}
  if (body.status !== undefined) updatePayload.status = body.status
  if (body.notes !== undefined) updatePayload.notes = body.notes

  const { data, error } = await supabase
    .from('sessions')
    .update(updatePayload)
    .eq('id', body.sessionId)
    .select('id, status')
    .single()

  if (error) throw error
  return { ok: true, session: data }
}

export async function handleSessionDelete(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  await requireSessionOwner(user.id, body.sessionId)

  const { error } = await supabase.from('sessions').delete().eq('id', body.sessionId)
  if (error) throw error
  return { ok: true }
}

// ─── Payment API ───────────────────────────────────────────

