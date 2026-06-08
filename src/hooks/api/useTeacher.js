import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { getUserRowByTelegramId } from './auth'
import { getCurrentPeriod, generateInviteToken } from './core'

function computePaidPercentByGroup(groups, payments) {
  const { month, year } = getCurrentPeriod()

  return groups.map((group) => {
    const totalStudents = group.group_members?.[0]?.count || 0
    if (!totalStudents) return { ...group, paidPercent: 0 }

    const paidStudents = new Set(
      payments
        .filter((payment) =>
          payment.group_id === group.id &&
          payment.status === 'paid' &&
          payment.period_month === month &&
          payment.period_year === year
        )
        .map((payment) => payment.student_id)
    )

    return {
      ...group,
      paidPercent: Math.round((paidStudents.size / totalStudents) * 100),
    }
  })
}

export function useTeacherDashboard(telegramId) {
  return useQuery({
    queryKey: ['teacher-dashboard', telegramId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return null

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)

      const [groupsRes, unpaidRes] = await Promise.all([
        supabase
          .from('groups')
          .select('id, group_members(count)')
          .eq('teacher_id', user.id),
        supabase
          .from('payments')
          .select('amount, status, student:users!payments_student_id_fkey(first_name, last_name, username)')
          .eq('teacher_id', user.id)
          .in('status', ['unpaid', 'partial']),
      ])

      if (groupsRes.error) throw groupsRes.error
      if (unpaidRes.error) throw unpaidRes.error

      const groups = groupsRes.data || []
      const groupIds = groups.map((group) => group.id)
      const totalStudents = groups.reduce((sum, group) => sum + (group.group_members?.[0]?.count || 0), 0)

      const sessionsRes = groupIds.length
        ? await supabase
            .from('sessions')
            .select('id, scheduled_at, status, group:groups(id, name, subject)')
            .in('group_id', groupIds)
            .gte('scheduled_at', todayStart.toISOString())
            .lt('scheduled_at', todayEnd.toISOString())
            .order('scheduled_at')
        : { data: [], error: null }

      if (sessionsRes.error) throw sessionsRes.error

      return {
        totalGroups: groups.length,
        totalStudents,
        todaySessions: sessionsRes.data || [],
        unpaid: unpaidRes.data || [],
      }
    },
    enabled: !!telegramId,
  })
}

export function useTeacherGroups(telegramId) {
  return useQuery({
    queryKey: ['teacher-groups', telegramId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return []

      const [groupsRes, paymentsRes] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name, subject, color, created_at, group_members(count), sessions(id, scheduled_at, status)')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('group_id, student_id, status, period_month, period_year')
          .eq('teacher_id', user.id),
      ])

      if (groupsRes.error) throw groupsRes.error
      if (paymentsRes.error) throw paymentsRes.error

      const groups = groupsRes.data || []
      if (!groups.length) return []

      const groupIds = new Set(groups.map((group) => group.id))
      const payments = (paymentsRes.data || []).filter((payment) => groupIds.has(payment.group_id))

      return computePaidPercentByGroup(groups, payments)
    },
    enabled: !!telegramId,
  })
}

export function useTeacherPayments(telegramId, filter = 'all') {
  return useQuery({
    queryKey: ['teacher-payments', telegramId, filter],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return []

      let query = supabase
        .from('payments')
        .select('*, student:users!payments_student_id_fkey(first_name, last_name, username), group:groups(name, subject)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (filter === 'paid') query = query.eq('status', 'paid')
      if (filter === 'unpaid') query = query.eq('status', 'unpaid')

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!telegramId,
  })
}

export function useTeacherSchedule(telegramId, weekStart) {
  return useQuery({
    queryKey: ['teacher-schedule', telegramId, weekStart],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return []

      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('teacher_id', user.id)

      if (groupsError) throw groupsError

      const groupIds = (groups || []).map((group) => group.id)
      if (!groupIds.length) return []

      const start = weekStart ? new Date(weekStart) : new Date()
      const end = new Date(start)
      end.setDate(end.getDate() + 7)

      const { data, error } = await supabase
        .from('sessions')
        .select('id, group_id, scheduled_at, duration_min, status, group:groups(name, subject), attendance(count)')
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

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ telegramId, name, subject }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const userRow = await getUserRowByTelegramId(telegramId)
      if (!userRow) throw new Error('Foydalanuvchi topilmadi.')

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name,
          subject,
          teacher_id: userRow.id,
          invite_token: generateInviteToken(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data, { telegramId }) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups', telegramId] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard', telegramId] })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (groupId) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const { error } = await supabase.from('groups').delete().eq('id', groupId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
    },
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, scheduledAt, durationMin = 90 }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const { data, error } = await supabase
        .from('sessions')
        .insert({ group_id: groupId, scheduled_at: scheduledAt, duration_min: durationMin, status: 'upcoming' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['student-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['student-groups'] })
    },
  })
}

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, status }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const { data, error } = await supabase
        .from('sessions')
        .update({ status })
        .eq('id', sessionId)
        .select('id, status')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['student-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['student-groups'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
    },
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (sessionId) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['student-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['student-groups'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
    },
  })
}

export function useMarkPaymentPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ paymentId, method = 'cash', note = '' }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', method, note, paid_at: new Date().toISOString() })
        .eq('id', paymentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-payments'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['student-payments'] })
      queryClient.invalidateQueries({ queryKey: ['group-detail'] })
    },
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, groupId, teacherId, amount, month }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const { data, error } = await supabase
        .from('payments')
        .insert({
          student_id: studentId,
          group_id: groupId,
          teacher_id: teacherId,
          amount,
          period_month: month,
          period_year: new Date().getFullYear(),
          status: 'unpaid',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-payments'] })
      queryClient.invalidateQueries({ queryKey: ['group-detail'] })
    },
  })
}
