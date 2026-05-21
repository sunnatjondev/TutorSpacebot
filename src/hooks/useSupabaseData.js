import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import * as mock from '../data/mockData'

/**
 * Upsert a Telegram user into Supabase users table.
 * Returns the user record (with role). Falls back gracefully if not configured.
 */
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

  if (error) {
    console.error('[Supabase] upsertTelegramUser error:', error)
    return null
  }
  return data
}

/**
 * Save role for a user (called after role selection)
 */
export async function saveUserRole(userId, role) {
  if (!isSupabaseConfigured) return
  await supabase.from('users').update({ role }).eq('id', userId)
}

// ─── Generic hook ─────────────────────────────────────────────────────────────

function useSupabaseQuery(queryFn, mockData, deps = []) {
  const [data, setData] = useState(mockData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    try {
      const result = await queryFn()
      if (result?.error) throw result.error
      setData(result?.data ?? mockData)
    } catch (e) {
      setError(e)
      console.error('[Supabase] Query error:', e)
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

// ─── Teacher hooks ─────────────────────────────────────────────────────────────

export function useTeacherGroups(teacherId) {
  return useSupabaseQuery(
    async () => supabase
      .from('groups')
      .select(`
        *,
        group_members(count),
        sessions(scheduled_at, status)
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false }),
    mock.mockGroups,
    [teacherId]
  )
}

export function useGroupDetail(groupId) {
  return useSupabaseQuery(
    async () => supabase
      .from('group_members')
      .select(`
        student:users(id, first_name, last_name, telegram_id),
        payments(amount, status, period_month, period_year)
      `)
      .eq('group_id', groupId),
    mock.mockStudents,
    [groupId]
  )
}

export function useTeacherPayments(teacherId, filter = 'all') {
  return useSupabaseQuery(
    async () => {
      let q = supabase
        .from('payments')
        .select(`
          *,
          student:users!payments_student_id_fkey(first_name, last_name),
          group:groups(name, subject)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })

      if (filter === 'paid') q = q.eq('status', 'paid')
      if (filter === 'unpaid') q = q.eq('status', 'unpaid')

      return q
    },
    mock.mockFinanceStudents,
    [teacherId, filter]
  )
}

export function useTeacherSchedule(teacherId, weekStart) {
  return useSupabaseQuery(
    async () => supabase
      .from('sessions')
      .select(`
        *,
        group:groups(name, subject, teacher_id),
        attendance(count)
      `)
      .eq('groups.teacher_id', teacherId)
      .gte('scheduled_at', weekStart?.toISOString())
      .order('scheduled_at'),
    mock.mockSchedule,
    [teacherId, weekStart]
  )
}

export async function markPaymentPaid(paymentId, method, note) {
  if (!isSupabaseConfigured) return { success: true }
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      method,
      note,
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
  return { success: !error, error }
}

export async function saveAttendance(sessionId, studentId, present) {
  if (!isSupabaseConfigured) return { success: true }
  const { error } = await supabase
    .from('attendance')
    .upsert({ session_id: sessionId, student_id: studentId, present }, { onConflict: 'session_id,student_id' })
  return { success: !error, error }
}

// ─── Student hooks ─────────────────────────────────────────────────────────────

export function useStudentGroups(studentId) {
  return useSupabaseQuery(
    async () => supabase
      .from('group_members')
      .select(`
        group:groups(
          id, name, subject, telegram_group_link,
          teacher:users!groups_teacher_id_fkey(first_name, last_name),
          group_members(count),
          sessions(scheduled_at, status)
        )
      `)
      .eq('student_id', studentId),
    mock.mockStudentGroups,
    [studentId]
  )
}

export function useStudentHomework(studentId) {
  return useSupabaseQuery(
    async () => supabase
      .from('homework_submissions')
      .select(`
        *,
        homework(id, title, due_date, group:groups(subject))
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
    mock.mockHomework,
    [studentId]
  )
}

export function useStudentPayments(studentId) {
  return useSupabaseQuery(
    async () => supabase
      .from('payments')
      .select('*, group:groups(name, subject)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
    mock.mockStudentPayments,
    [studentId]
  )
}

export function useStudentAttendance(studentId) {
  return useSupabaseQuery(
    async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('present')
        .eq('student_id', studentId)

      if (error) throw error
      const total = data.length
      const present = data.filter(a => a.present).length
      return { data: total > 0 ? Math.round((present / total) * 100) : 92 }
    },
    92, // fallback
    [studentId]
  )
}
