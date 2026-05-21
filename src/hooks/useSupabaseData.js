import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import * as mock from '../data/mockData'

// ─── Auth ──────────────────────────────────────────────────────────────────────

export async function upsertTelegramUser(tgUser) {
  if (!isSupabaseConfigured || !tgUser) return null
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        telegram_id: tgUser.id,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name || null,
        username: tgUser.username || null,
        photo_url: tgUser.photo_url || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'telegram_id', ignoreDuplicates: false }
    )
    .select()
    .single()
  if (error) { console.error('[Supabase] upsertTelegramUser:', error); return null }
  return data
}

export async function saveUserRole(telegramId, role) {
  if (!isSupabaseConfigured) return
  await supabase.from('users').update({ role }).eq('telegram_id', telegramId)
}

// ─── Generic query hook ────────────────────────────────────────────────────────

function useSupabaseQuery(queryFn, fallback, deps = []) {
  const [data, setData] = useState(fallback)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    try {
      const result = await queryFn()
      if (result?.error) throw result.error
      if (result?.data !== undefined) setData(result.data)
    } catch (e) {
      setError(e)
      console.error('[Supabase] Query error:', e)
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, refetch }
}

// ─── Teacher: Groups ───────────────────────────────────────────────────────────

export function useTeacherGroups(telegramId) {
  return useSupabaseQuery(
    async () => {
      // First get the user's db id
      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', telegramId).single()
      if (!user) return { data: [] }
      return supabase
        .from('groups')
        .select('*, group_members(count)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
    },
    mock.mockGroups,
    [telegramId]
  )
}

export async function createGroup(telegramId, { name, subject }) {
  if (!isSupabaseConfigured) return { success: false, error: { message: 'Supabase sozlanmagan' } }

  // Find user's internal UUID by telegram_id
  const { data: userRow, error: findErr } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (findErr) {
    console.error('[createGroup] user lookup:', findErr)
    return { success: false, error: { message: `User lookup: ${findErr.message}` } }
  }
  if (!userRow) {
    console.error('[createGroup] no user for telegram_id:', telegramId)
    return { success: false, error: { message: `Bazada foydalanuvchi topilmadi. Ilovani qayta oching.` } }
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({ name, subject, teacher_id: userRow.id })
    .select()
    .single()

  if (error) console.error('[createGroup] insert:', error)
  return { success: !error, data, error }
}

export async function deleteGroup(groupId) {
  if (!isSupabaseConfigured) return { success: false }
  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  return { success: !error, error }
}

// ─── Teacher: Group Detail / Students ─────────────────────────────────────────

export function useGroupDetail(groupId) {
  return useSupabaseQuery(
    async () => supabase
      .from('group_members')
      .select('id, student:users(id, telegram_id, first_name, last_name, username, photo_url), payments(amount, status)')
      .eq('group_id', groupId),
    mock.mockStudents,
    [groupId]
  )
}

export async function addStudentToGroup(groupId, telegramId) {
  if (!isSupabaseConfigured) return { success: false }
  // Find user by telegram_id
  const { data: user } = await supabase
    .from('users').select('id').eq('telegram_id', telegramId).single()
  if (!user) return { success: false, error: 'User not found' }
  const { data, error } = await supabase
    .from('group_members')
    .upsert({ group_id: groupId, student_id: user.id }, { onConflict: 'group_id,student_id' })
    .select()
  return { success: !error, data, error }
}

export async function removeStudentFromGroup(groupId, studentId) {
  if (!isSupabaseConfigured) return { success: false }
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('student_id', studentId)
  return { success: !error, error }
}

// ─── Teacher: Payments ────────────────────────────────────────────────────────

export function useTeacherPayments(telegramId, filter = 'all') {
  return useSupabaseQuery(
    async () => {
      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', telegramId).single()
      if (!user) return { data: [] }

      let q = supabase
        .from('payments')
        .select('*, student:users!payments_student_id_fkey(first_name, last_name), group:groups(name, subject)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (filter === 'paid') q = q.eq('status', 'paid')
      if (filter === 'unpaid') q = q.eq('status', 'unpaid')
      return q
    },
    mock.mockFinanceStudents,
    [telegramId, filter]
  )
}

export async function markPaymentPaid(paymentId, method = 'cash', note = '') {
  if (!isSupabaseConfigured) return { success: true }
  const { error } = await supabase
    .from('payments')
    .update({ status: 'paid', method, note, paid_at: new Date().toISOString() })
    .eq('id', paymentId)
  return { success: !error, error }
}

export async function createPayment({ studentId, groupId, teacherId, amount, month }) {
  if (!isSupabaseConfigured) return { success: false }
  const { data, error } = await supabase
    .from('payments')
    .insert({ student_id: studentId, group_id: groupId, teacher_id: teacherId, amount, period_month: month, status: 'unpaid' })
    .select().single()
  return { success: !error, data, error }
}

// ─── Teacher: Schedule ────────────────────────────────────────────────────────

export function useTeacherSchedule(telegramId, weekStart) {
  return useSupabaseQuery(
    async () => {
      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', telegramId).single()
      if (!user) return { data: [] }
      return supabase
        .from('sessions')
        .select('*, group:groups(name, subject, teacher_id), attendance(count)')
        .eq('groups.teacher_id', user.id)
        .gte('scheduled_at', weekStart?.toISOString?.() ?? new Date().toISOString())
        .order('scheduled_at')
    },
    mock.mockSchedule,
    [telegramId, weekStart]
  )
}

export async function createSession({ groupId, scheduledAt, durationMin = 90 }) {
  if (!isSupabaseConfigured) return { success: false }
  const { data, error } = await supabase
    .from('sessions')
    .insert({ group_id: groupId, scheduled_at: scheduledAt, duration_min: durationMin, status: 'upcoming' })
    .select().single()
  return { success: !error, data, error }
}

// ─── Teacher: Homework ────────────────────────────────────────────────────────

export async function createHomework({ groupId, title, dueDate, description = '' }) {
  if (!isSupabaseConfigured) return { success: false }
  const { data, error } = await supabase
    .from('homework')
    .insert({ group_id: groupId, title, due_date: dueDate, description })
    .select().single()
  return { success: !error, data, error }
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function saveAttendance(sessionId, studentId, present) {
  if (!isSupabaseConfigured) return { success: true }
  const { error } = await supabase
    .from('attendance')
    .upsert({ session_id: sessionId, student_id: studentId, present }, { onConflict: 'session_id,student_id' })
  return { success: !error, error }
}

// ─── Student: Groups ──────────────────────────────────────────────────────────

export function useStudentGroups(telegramId) {
  return useSupabaseQuery(
    async () => {
      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', telegramId).single()
      if (!user) return { data: [] }
      return supabase
        .from('group_members')
        .select(`
          group:groups(
            id, name, subject, telegram_group_link, color,
            teacher:users!groups_teacher_id_fkey(first_name, last_name),
            group_members(count)
          )
        `)
        .eq('student_id', user.id)
    },
    mock.mockStudentGroups,
    [telegramId]
  )
}

// ─── Student: Homework ────────────────────────────────────────────────────────

export function useStudentHomework(telegramId) {
  return useSupabaseQuery(
    async () => {
      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', telegramId).single()
      if (!user) return { data: [] }
      return supabase
        .from('homework_submissions')
        .select('*, homework(id, title, due_date, description, group:groups(subject))')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
    },
    mock.mockHomework,
    [telegramId]
  )
}

export async function markHomeworkDone(submissionId, done) {
  if (!isSupabaseConfigured) return { success: true }
  const { error } = await supabase
    .from('homework_submissions')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', submissionId)
  return { success: !error, error }
}

// ─── Student: Payments ────────────────────────────────────────────────────────

export function useStudentPayments(telegramId) {
  return useSupabaseQuery(
    async () => {
      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', telegramId).single()
      if (!user) return { data: [] }
      return supabase
        .from('payments')
        .select('*, group:groups(name, subject)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
    },
    mock.mockStudentPayments,
    [telegramId]
  )
}

// ─── Student: Attendance % ────────────────────────────────────────────────────

export function useStudentAttendance(telegramId) {
  return useSupabaseQuery(
    async () => {
      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', telegramId).single()
      if (!user) return { data: 92 }
      const { data, error } = await supabase
        .from('attendance').select('present').eq('student_id', user.id)
      if (error) throw error
      const total = data.length
      const present = data.filter(a => a.present).length
      return { data: total > 0 ? Math.round((present / total) * 100) : 92 }
    },
    92,
    [telegramId]
  )
}

// ─── Teacher Dashboard stats ──────────────────────────────────────────────────

export function useTeacherDashboard(telegramId) {
  return useSupabaseQuery(
    async () => {
      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', telegramId).single()
      if (!user) return { data: null }

      const [groupsRes, todayRes, unpaidRes] = await Promise.all([
        supabase.from('groups').select('id, group_members(count)').eq('teacher_id', user.id),
        supabase.from('sessions')
          .select('*, group:groups(name, subject)')
          .eq('groups.teacher_id', user.id)
          .gte('scheduled_at', new Date().toISOString().split('T')[0])
          .lt('scheduled_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]),
        supabase.from('payments')
          .select('amount, student:users!payments_student_id_fkey(first_name, last_name)')
          .eq('teacher_id', user.id)
          .eq('status', 'unpaid'),
      ])

      const groups = groupsRes.data || []
      const totalStudents = groups.reduce((s, g) => s + (g.group_members?.[0]?.count || 0), 0)

      return {
        data: {
          totalGroups: groups.length,
          totalStudents,
          todaySessions: todayRes.data || [],
          unpaid: unpaidRes.data || [],
        }
      }
    },
    null,
    [telegramId]
  )
}

// ─── Student Dashboard ────────────────────────────────────────────────────────

export function useStudentDashboard(telegramId) {
  return useSupabaseQuery(
    async () => {
      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', telegramId).single()
      if (!user) return { data: null }

      const [hwRes, payRes, attRes, nextRes] = await Promise.all([
        supabase.from('homework_submissions')
          .select('done, homework(due_date)')
          .eq('student_id', user.id).eq('done', false),
        supabase.from('payments')
          .select('amount').eq('student_id', user.id).eq('status', 'unpaid'),
        supabase.from('attendance')
          .select('present').eq('student_id', user.id),
        supabase.from('sessions')
          .select('scheduled_at, duration_min, group:groups(name, subject, teacher:users!groups_teacher_id_fkey(first_name, last_name))')
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at').limit(1).single(),
      ])

      const hw = hwRes.data || []
      const now = new Date()
      const overdue = hw.filter(h => h.homework?.due_date && new Date(h.homework.due_date) < now).length
      const balance = -(payRes.data || []).reduce((s, p) => s + (p.amount || 0), 0)
      const att = attRes.data || []
      const attendance = att.length > 0
        ? Math.round(att.filter(a => a.present).length / att.length * 100)
        : 92

      return {
        data: {
          homeworkCount: hw.length,
          homeworkOverdue: overdue,
          balance,
          attendance,
          nextLesson: nextRes.data || null,
        }
      }
    },
    null,
    [telegramId]
  )
}
