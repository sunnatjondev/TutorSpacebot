import { randomBytes } from 'node:crypto'
import { supabase, requireServiceSupabase, getUserRowByTelegramId, upsertTrustedTelegramUser, requireUserRow, requireGroupOwner, requireSessionOwner } from '../db.js'
import { signSupabaseAppJwt, verifyTelegramInitData } from '../auth.js'
import { getUrlOrigin, escapeHtml, escapeMarkdown, escapeMarkdownV2, buildTelegramUserPayload, getCurrentPeriod, generateInviteToken, buildStudentName } from '../helpers.js'
import { validate } from '../validation.js'
import { autoCompleteExpiredSessions } from './sessionService.js'

async function resolveTargetStudent(currentUser, requestedStudentId = null) {
  if (currentUser.role === 'parent') {
    if (!requestedStudentId) {
      throw new Error('studentId is required for parent access')
    }
    const { data: relation, error } = await supabase
      .from('parent_relations')
      .select('id')
      .eq('parent_id', currentUser.id)
      .eq('student_id', requestedStudentId)
      .maybeSingle()

    if (error || !relation) {
      throw new Error('Unauthorized child access')
    }
    return requestedStudentId
  }
  return currentUser.id
}

export async function handleParentInviteCreate(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  const studentId = body?.studentId || user.id

  if (user.role === 'parent') throw new Error('Parents cannot create parent invitations')

  if (studentId !== user.id) {
    if (user.role !== 'teacher') throw new Error('Unauthorized to invite a parent for this student')
    const { data: memberships, error: membershipsError } = await supabase
      .from('group_members')
      .select('group:groups(teacher_id)')
      .eq('student_id', studentId)
    if (membershipsError) throw membershipsError
    const ownsStudent = (memberships || []).some((membership) => membership.group?.teacher_id === user.id)
    if (!ownsStudent) throw new Error('Unauthorized to invite a parent for this student')
  } else if (user.role !== 'student') {
    throw new Error('Only students can create their own parent invitation')
  }

  const { data: student, error: studentError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', studentId)
    .maybeSingle()
  if (studentError) throw studentError
  if (!student || student.role !== 'student') throw new Error('Student not found')

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const token = randomBytes(32).toString('base64url')
  const { error } = await supabase.from('parent_invites').insert({
    token,
    student_id: studentId,
    created_by: user.id,
    expires_at: expiresAt,
  })
  if (error) throw error

  return { ok: true, token, expiresAt }
}
export async function handleParentChildren(telegramUser) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  if (user.role !== 'parent') {
    throw new Error('Only parents can access this endpoint')
  }

  const { data: relations, error } = await supabase
    .from('parent_relations')
    .select(`
      student:users!student_id(id, first_name, last_name, telegram_id, username, photo_url)
    `)
    .eq('parent_id', user.id)

  if (error) throw error

  const children = (relations || []).map(r => r.student).filter(Boolean)
  return { ok: true, children }
}

export async function handleStudentDashboard(telegramUser, body) {
  requireServiceSupabase()
  await autoCompleteExpiredSessions(supabase)
  const user = await requireUserRow(telegramUser)
  const targetStudentId = await resolveTargetStudent(user, body?.studentId)

  const [membershipsRes, hwRes, payRes, attRes] = await Promise.all([
    supabase.from('group_members').select('group_id').eq('student_id', targetStudentId),
    supabase.from('homework_submissions').select('status, homework(due_at)').eq('student_id', targetStudentId).eq('status', 'pending'),
    supabase.from('payments').select('amount').eq('student_id', targetStudentId).in('status', ['unpaid', 'partial']),
    supabase.from('attendance').select('present').eq('student_id', targetStudentId),
  ])

  if (membershipsRes.error) throw membershipsRes.error
  if (hwRes.error) throw hwRes.error
  if (payRes.error) throw payRes.error
  if (attRes.error) throw attRes.error

  const groupIds = (membershipsRes.data || []).map((m) => m.group_id)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60000).toISOString()
  const nextLessonRes = groupIds.length
    ? await supabase
        .from('sessions')
        .select('scheduled_at, duration_min, group:groups(name, subject, teacher:users!groups_teacher_id_fkey(first_name, last_name))')
        .in('group_id', groupIds)
        .neq('status', 'done')
        .gte('scheduled_at', twoHoursAgo)
        .order('scheduled_at')
        .limit(1)
    : { data: [], error: null }

  if (nextLessonRes.error) throw nextLessonRes.error

  const homework = hwRes.data || []
  const now = new Date()
  const overdue = homework.filter((i) => i.homework?.due_at && new Date(i.homework.due_at) < now).length
  const balance = -(payRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0)
  const attendanceRows = attRes.data || []
  const attendance = attendanceRows.length
    ? Math.round((attendanceRows.filter((i) => i.present).length / attendanceRows.length) * 100)
    : 0

  return {
    ok: true,
    homeworkCount: homework.length,
    homeworkOverdue: overdue,
    balance,
    attendance,
    nextLesson: nextLessonRes.data?.[0] || null,
  }
}

export async function handleStudentGroups(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  const targetStudentId = await resolveTargetStudent(user, body?.studentId)

  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group:groups(
        id, name, subject, telegram_group_link, color,
        teacher:users!groups_teacher_id_fkey(first_name, last_name),
        group_members(count),
        sessions(id, scheduled_at, status)
      )
    `)
    .eq('student_id', targetStudentId)

  if (error) throw error
  return { ok: true, groups: data || [] }
}

export async function handleStudentPayments(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  const targetStudentId = await resolveTargetStudent(user, body?.studentId)

  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, student_id, teacher_id, group_id, amount, status, method,
      period_year, period_month, note, paid_at, created_at,
      group:groups(name, subject),
      teacher:users!payments_teacher_id_fkey(username, telegram_id)
    `)
    .eq('student_id', targetStudentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return { ok: true, payments: data || [] }
}

export async function handleStudentSchedule(telegramUser, body) {
  requireServiceSupabase()
  await autoCompleteExpiredSessions(supabase)
  const user = await requireUserRow(telegramUser)
  const targetStudentId = await resolveTargetStudent(user, body?.studentId)

  const { data: memberships, error: membershipsError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('student_id', targetStudentId)

  if (membershipsError) throw membershipsError

  const groupIds = (memberships || []).map((m) => m.group_id)
  if (!groupIds.length) return { ok: true, sessions: [] }

  let query = supabase
    .from('sessions')
    .select(`
      id, group_id, scheduled_at, duration_min, status,
      group:groups(name, subject, teacher:users!groups_teacher_id_fkey(first_name, last_name)),
      attendance(present, student_id)
    `)
    .in('group_id', groupIds)
    .neq('status', 'cancelled')
    .order('scheduled_at')

  if (body.weekStart && !body.all) {
    const start = new Date(body.weekStart)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    end.setHours(23, 59, 59, 999)
    query = query.gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString())
  }

  const { data, error } = await query

  if (error) throw error
  return { ok: true, sessions: data || [] }
}

export async function handleStudentHomework(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  const targetStudentId = await resolveTargetStudent(user, body?.studentId)

  const { data, error } = await supabase
    .from('homework_submissions')
    .select('id, status, submitted_at, homework(id, title, due_at, description, group:groups(subject))')
    .eq('student_id', targetStudentId)

  if (error) throw error
  return { ok: true, homework: data || [] }
}

export async function handleStudentHomeworkDone(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  // Verify the submission belongs to this student or their parent
  const { data: sub } = await supabase
    .from('homework_submissions')
    .select('student_id')
    .eq('id', body.submissionId)
    .maybeSingle()
  if (!sub) throw new Error('Submission not found')

  if (sub.student_id !== user.id) {
    // If user is a parent, check if they have a relation to this student
    if (user.role === 'parent') {
      const { data: relation } = await supabase
        .from('parent_relations')
        .select('id')
        .eq('parent_id', user.id)
        .eq('student_id', sub.student_id)
        .maybeSingle()
      if (!relation) throw new Error('Unauthorized')
    } else {
      throw new Error('Unauthorized')
    }
  }

  const { error } = await supabase
    .from('homework_submissions')
    .update({ status: body.done ? 'done' : 'pending', submitted_at: body.done ? new Date().toISOString() : null })
    .eq('id', body.submissionId)

  if (error) throw error
  return { ok: true }
}


// ─── User Settings API ────────────────────────────────────


