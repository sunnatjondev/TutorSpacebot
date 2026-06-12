import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { isBackendConfigured, joinTrustedInvite } from '../../lib/backend'
import { getUserRowByTelegramId } from './auth'
import { getCurrentPeriod } from './core'

export function useStudentDashboard(telegramId) {
  return useQuery({
    queryKey: ['student-dashboard', telegramId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return null

      const [membershipsRes, hwRes, payRes, attRes] = await Promise.all([
        supabase.from('group_members').select('group_id').eq('student_id', user.id),
        supabase.from('homework_submissions').select('done, homework(due_date)').eq('student_id', user.id).eq('done', false),
        supabase.from('payments').select('amount').eq('student_id', user.id).in('status', ['unpaid', 'pending', 'partial']),
        supabase.from('attendance').select('present').eq('student_id', user.id),
      ])

      if (membershipsRes.error) throw membershipsRes.error
      if (hwRes.error) throw hwRes.error
      if (payRes.error) throw payRes.error
      if (attRes.error) throw attRes.error

      const groupIds = (membershipsRes.data || []).map((membership) => membership.group_id)
      const nextLessonRes = groupIds.length
        ? await supabase
            .from('sessions')
            .select('scheduled_at, duration_min, group:groups(name, subject, teacher:users!groups_teacher_id_fkey(first_name, last_name))')
            .in('group_id', groupIds)
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at')
            .limit(1)
        : { data: [], error: null }

      if (nextLessonRes.error) throw nextLessonRes.error

      const homework = hwRes.data || []
      const now = new Date()
      const overdue = homework.filter((item) => item.homework?.due_date && new Date(item.homework.due_date) < now).length
      const balance = -(payRes.data || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)
      const attendanceRows = attRes.data || []
      const attendance = attendanceRows.length
        ? Math.round((attendanceRows.filter((item) => item.present).length / attendanceRows.length) * 100)
        : 0

      return {
        homeworkCount: homework.length,
        homeworkOverdue: overdue,
        balance,
        attendance,
        nextLesson: nextLessonRes.data?.[0] || null,
      }
    },
    enabled: !!telegramId,
  })
}

export function useStudentGroups(telegramId) {
  return useQuery({
    queryKey: ['student-groups', telegramId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return []

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
        .eq('student_id', user.id)
      
      if (error) throw error
      return data || []
    },
    enabled: !!telegramId,
  })
}

export function useStudentHomework(telegramId) {
  return useQuery({
    queryKey: ['student-homework', telegramId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return []

      const { data, error } = await supabase
        .from('homework_submissions')
        .select('id, done, done_at, homework(id, title, due_date, description, group:groups(subject))')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!telegramId,
  })
}

export function useStudentPayments(telegramId) {
  return useQuery({
    queryKey: ['student-payments', telegramId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return []

      const { data, error } = await supabase
        .from('payments')
        .select(`
          id, student_id, teacher_id, group_id, amount, status, method,
          period_year, period_month, note, paid_at, created_at,
          group:groups(name, subject)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!telegramId,
  })
}

export function useStudentSchedule(telegramId, weekStart) {
  return useQuery({
    queryKey: ['student-schedule', telegramId, weekStart],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return []

      const { data: memberships, error: membershipsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('student_id', user.id)

      if (membershipsError) throw membershipsError

      const groupIds = (memberships || []).map((membership) => membership.group_id)
      if (!groupIds.length) return []

      const start = weekStart ? new Date(weekStart) : new Date()
      const end = new Date(start)
      end.setDate(end.getDate() + 7)

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          group_id,
          scheduled_at,
          duration_min,
          status,
          group:groups(name, subject, teacher:users!groups_teacher_id_fkey(first_name, last_name)),
          attendance(present, student_id)
        `)
        .in('group_id', groupIds)
        .gte('scheduled_at', start.toISOString())
        .lt('scheduled_at', end.toISOString())
        .order('scheduled_at')

      if (error) throw error
      return data || []
    },
    enabled: !!telegramId,
  })
}

export function useMarkHomeworkDone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ submissionId, done }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const { error } = await supabase
        .from('homework_submissions')
        .update({ done, done_at: done ? new Date().toISOString() : null })
        .eq('id', submissionId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-homework'] })
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] })
    },
  })
}

export async function joinGroupByToken(telegramId, inviteToken, tgUser = null) {
  if (isBackendConfigured) {
    return joinTrustedInvite(inviteToken)
  }

  if (!isSupabaseConfigured || !telegramId || !inviteToken) return { success: false }

  let userRow = null
  try {
    userRow = await getUserRowByTelegramId(telegramId)
  } catch (err) {
    console.error('[joinGroupByToken] user lookup error:', err)
  }

  // Not doing full mutations hook here since it's used inside the App.jsx boot phase
  if (!userRow) {
    const { data: newUser, error: createErr } = await supabase
      .from('users')
      .upsert(
        { ...tgUser, telegram_id: telegramId, role: 'student' },
        { onConflict: 'telegram_id', ignoreDuplicates: false }
      )
      .select('id, telegram_id, role, first_name, last_name, username, photo_url')
      .single()

    if (createErr) {
      console.error('[joinGroupByToken] create user error:', createErr)
      return { success: false, error: createErr }
    }
    userRow = newUser
  }

  if (userRow.role !== 'student') {
    const { data: updatedUser, error: roleErr } = await supabase
      .from('users')
      .update({ role: 'student', updated_at: new Date().toISOString() })
      .eq('id', userRow.id)
      .select('id, telegram_id, role, first_name, last_name, username, photo_url')
      .single()

    if (roleErr) {
      console.error('[joinGroupByToken] set student role error:', roleErr)
      return { success: false, error: roleErr }
    }
    userRow = updatedUser
  }

  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .select('id, name, teacher_id')
    .eq('invite_token', inviteToken)
    .maybeSingle()

  if (groupErr || !group) {
    return { success: false, error: { message: 'Guruh topilmadi.' } }
  }

  const { error: memberErr } = await supabase
    .from('group_members')
    .upsert({ group_id: group.id, student_id: userRow.id }, { onConflict: 'group_id,student_id' })

  if (memberErr) {
    return { success: false, error: memberErr }
  }

  const { month, year } = getCurrentPeriod()
  
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('student_id', userRow.id)
    .eq('group_id', group.id)
    .eq('period_month', month)
    .eq('period_year', year)
    .maybeSingle()

  if (!existingPayment) {
    await supabase
      .from('payments')
      .insert({
        student_id: userRow.id,
        group_id: group.id,
        teacher_id: group.teacher_id,
        amount: 0,
        period_month: month,
        period_year: year,
        status: 'unpaid'
      })
  }

  return { success: true, groupName: group.name, role: 'student' }
}
