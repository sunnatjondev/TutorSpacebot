import { supabase, requireServiceSupabase, getUserRowByTelegramId, upsertTrustedTelegramUser, requireUserRow, requireGroupOwner, requireSessionOwner } from '../db.js'
import { signSupabaseAppJwt, verifyTelegramInitData } from '../auth.js'
import { getUrlOrigin, escapeHtml, escapeMarkdown, escapeMarkdownV2, buildTelegramUserPayload, getCurrentPeriod, generateInviteToken, buildStudentName } from '../helpers.js'
import { validate } from '../validation.js'
export async function handleUserSettings(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  const payload = {}
  if (body.lesson_reminders_enabled !== undefined) payload.lesson_reminders_enabled = body.lesson_reminders_enabled
  if (body.payment_alerts_enabled !== undefined) payload.payment_alerts_enabled = body.payment_alerts_enabled

  if (Object.keys(payload).length) {
    const { error } = await supabase.from('users').update(payload).eq('id', user.id)
    if (error) throw error
  }

  return { ok: true }
}

export async function handleUserDelete(telegramUser) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  const deleteRows = async (table, column, value, options = {}) => {
    const { optional = false } = options
    const { error } = await supabase.from(table).delete().eq(column, value)
    if (!error) return

    const missingTable = error.code === '42P01' || /does not exist/i.test(error.message || '')
    if (optional && missingTable) {
      console.warn(`Skipping missing optional table ${table} during account deletion`)
      return
    }
    throw error
  }

  const { data: ownedGroups, error: ownedGroupsError } = await supabase
    .from('groups')
    .select('id')
    .eq('teacher_id', user.id)
  if (ownedGroupsError) throw ownedGroupsError

  const ownedGroupIds = (ownedGroups || []).map((group) => group.id)

  if (ownedGroupIds.length) {
    const { data: ownedSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .in('group_id', ownedGroupIds)
    if (sessionsError) throw sessionsError

    const ownedSessionIds = (ownedSessions || []).map((session) => session.id)
    if (ownedSessionIds.length) {
      const { error: attendanceError } = await supabase
        .from('attendance')
        .delete()
        .in('session_id', ownedSessionIds)
      if (attendanceError) throw attendanceError
    }

    const { data: ownedHomework, error: homeworkError } = await supabase
      .from('homework')
      .select('id')
      .in('group_id', ownedGroupIds)
    if (homeworkError) throw homeworkError

    const ownedHomeworkIds = (ownedHomework || []).map((homework) => homework.id)
    if (ownedHomeworkIds.length) {
      const { error: submissionsError } = await supabase
        .from('homework_submissions')
        .delete()
        .in('homework_id', ownedHomeworkIds)
      if (submissionsError) throw submissionsError
    }

    for (const groupId of ownedGroupIds) {
      await deleteRows('homework', 'group_id', groupId)
      await deleteRows('sessions', 'group_id', groupId)
      await deleteRows('group_members', 'group_id', groupId)
      await deleteRows('payments', 'group_id', groupId)
    }
  }

  await deleteRows('billing_transactions', 'teacher_id', user.id, { optional: true })
  await deleteRows('subscriptions', 'teacher_id', user.id, { optional: true })
  await deleteRows('student_badges', 'student_id', user.id, { optional: true })
  await deleteRows('homework_submissions', 'student_id', user.id)
  await deleteRows('attendance', 'student_id', user.id)
  await deleteRows('group_members', 'student_id', user.id)
  await deleteRows('payments', 'student_id', user.id)
  await deleteRows('payments', 'teacher_id', user.id)
  await deleteRows('groups', 'teacher_id', user.id)

  const { error } = await supabase.from('users').delete().eq('id', user.id)
  if (error) throw error
  return { ok: true }
}

// Group Attendance Queries

export async function handleGroupDayAttendance(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  await requireGroupOwner(user.id, body.groupId)

  const startOfDay = new Date(body.date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(body.date)
  endOfDay.setHours(23, 59, 59, 999)

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, notes, attendance(student_id, present)')
    .eq('group_id', body.groupId)
    .gte('scheduled_at', startOfDay.toISOString())
    .lte('scheduled_at', endOfDay.toISOString())
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return { ok: true, sessions: sessions || [] }
}

export async function handleGroupMonthlyStats(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  await requireGroupOwner(user.id, body.groupId)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const attendanceEnd = now < endOfMonth ? now : endOfMonth

  const { data: monthSessions, error } = await supabase
    .from('sessions')
    .select('id, attendance(present)')
    .eq('group_id', body.groupId)
    .gte('scheduled_at', startOfMonth.toISOString())
    .lte('scheduled_at', attendanceEnd.toISOString())
    .neq('status', 'cancelled')

  if (error) throw error

  let totalAttendanceMarks = 0
  let presentAttendanceMarks = 0
  const totalClasses = monthSessions?.length || 0

  monthSessions?.forEach((session) => {
    session.attendance?.forEach((att) => {
      totalAttendanceMarks++
      if (att.present) presentAttendanceMarks++
    })
  })

  const averageAttendance = totalAttendanceMarks > 0
    ? Math.round((presentAttendanceMarks / totalAttendanceMarks) * 100)
    : 0

  return { ok: true, totalClasses, averageAttendance }
}

// Telegram Payments API



