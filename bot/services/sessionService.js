import { supabase, requireServiceSupabase, getUserRowByTelegramId, upsertTrustedTelegramUser, requireUserRow, requireGroupOwner, requireSessionOwner } from '../db.js'
import { signSupabaseAppJwt, verifyTelegramInitData } from '../auth.js'
import { checkTeacherSubscription } from './authService.js'
import { getUrlOrigin, escapeHtml, escapeMarkdown, escapeMarkdownV2, buildTelegramUserPayload, getCurrentPeriod, generateInviteToken, buildStudentName } from '../helpers.js'
import { validate } from '../validation.js'
import { config } from '../config.js'

export async function handleSessionCreate(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  const sub = await checkTeacherSubscription(user.id)
  if (!sub.active) throw new Error('subscription_expired')

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

export async function autoCompleteExpiredSessions(supabaseClient = supabase) {
  try {
    if (!supabaseClient) return
    const now = new Date()
    const pastLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: activeSessions, error } = await supabaseClient
      .from('sessions')
      .select('id, scheduled_at, duration_min, status')
      .in('status', ['upcoming', 'ongoing'])
      .lte('scheduled_at', now.toISOString())
      .gte('scheduled_at', pastLimit)

    if (error || !activeSessions || activeSessions.length === 0) return

    const doneIds = []
    const ongoingIds = []

    for (const session of activeSessions) {
      const scheduledAt = new Date(session.scheduled_at)
      const duration = session.duration_min || config.DEFAULT_SESSION_DURATION_MIN || 90
      const endsAt = new Date(scheduledAt.getTime() + duration * 60000)

      if (now >= endsAt) {
        doneIds.push(session.id)
      } else if (now >= scheduledAt && session.status === 'upcoming') {
        ongoingIds.push(session.id)
      }
    }

    if (doneIds.length > 0) {
      await supabaseClient
        .from('sessions')
        .update({ status: 'done' })
        .in('id', doneIds)
    }

    if (ongoingIds.length > 0) {
      await supabaseClient
        .from('sessions')
        .update({ status: 'ongoing' })
        .in('id', ongoingIds)
    }
  } catch (err) {
    console.error('autoCompleteExpiredSessions error:', err.message)
  }
}
