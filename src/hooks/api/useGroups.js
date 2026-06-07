import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { getUserRowByTelegramId, getUserRowByUsername } from './auth'
import { normalizeOptionalText, buildStudentName, getCurrentPeriod } from './core'

export function useGroupDetail(groupId) {
  return useQuery({
    queryKey: ['group-detail', groupId],
    queryFn: async () => {
      if (!isSupabaseConfigured || !groupId) return { group: null, students: [] }

      const [
        { data: group, error: groupError },
        { data: memberships, error: membershipsError },
        { data: paymentRows, error: paymentsError }
      ] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name, subject, color, telegram_group_link, invite_token, group_members(count)')
          .eq('id', groupId)
          .maybeSingle(),
        supabase
          .from('group_members')
          .select('id, student_id, student:users(id, telegram_id, first_name, last_name, username, photo_url)')
          .eq('group_id', groupId),
        supabase
          .from('payments')
          .select('student_id, amount, status, created_at')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false }),
      ])

      if (groupError) throw groupError
      if (membershipsError) throw membershipsError
      if (paymentsError) throw paymentsError

      const paymentByStudentId = new Map()
      ;(paymentRows || []).forEach((payment) => {
        if (!paymentByStudentId.has(payment.student_id)) {
          paymentByStudentId.set(payment.student_id, payment)
        }
      })

      const students = (memberships || []).map((membership) => {
        const payment = paymentByStudentId.get(membership.student_id)
        return {
          id: membership.student?.id || membership.student_id,
          name: [membership.student?.first_name, membership.student?.last_name].filter(Boolean).join(' ') || 'Talaba',
          username: membership.student?.username || null,
          amount: payment?.amount || 0,
          status: payment?.status || 'unpaid',
        }
      })

      return {
        group,
        students,
      }
    },
    enabled: !!groupId,
  })
}

export function useAddStudentToGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, telegramId }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) throw new Error('User not found')

      const { data, error } = await supabase
        .from('group_members')
        .upsert({ group_id: groupId, student_id: user.id }, { onConflict: 'group_id,student_id' })
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] })
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
    },
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ teacherTelegramId, name, contact, groupIds, monthlyRate }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')

      const normalizedName = normalizeOptionalText(name)
      if (!teacherTelegramId || !normalizedName) {
        throw new Error("Talaba ma'lumotlari to'liq emas.")
      }

      const normalizedGroupIds = Array.from(new Set((groupIds || []).filter(Boolean)))
      if (!normalizedGroupIds.length) {
        throw new Error('Kamida bitta guruh tanlang.')
      }

      const teacher = await getUserRowByTelegramId(teacherTelegramId)
      if (!teacher) throw new Error("O'qituvchi topilmadi.")

      const normalizedContact = normalizeOptionalText(contact)
      let student = null

      if (normalizedContact && /^\d+$/.test(normalizedContact)) {
        student = await getUserRowByTelegramId(Number(normalizedContact))
      }

      if (!student && normalizedContact) {
        student = await getUserRowByUsername(normalizedContact)
      }

      if (!student) {
        const usernameCandidate = normalizedContact?.replace(/^@/, '')
        const username = usernameCandidate && /^[a-zA-Z0-9_]{3,}$/.test(usernameCandidate) ? usernameCandidate : null
        const nameParts = normalizedName.split(/\s+/)
        
        const { data: createdStudent, error: studentError } = await supabase
          .from('users')
          .insert({
            telegram_id: null,
            first_name: nameParts.shift() || 'Talaba',
            last_name: nameParts.join(' ') || null,
            username,
            role: 'student',
            updated_at: new Date().toISOString(),
          })
          .select('id, telegram_id, first_name, last_name, username, photo_url')
          .single()

        if (studentError) throw new Error(`Talabani yaratib bo'lmadi: ${studentError.message}`)
        student = createdStudent
      }

      const { data: existingMemberships, error: membershipLookupError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('student_id', student.id)
        .in('group_id', normalizedGroupIds)

      if (membershipLookupError) throw membershipLookupError

      const existingGroupIds = new Set((existingMemberships || []).map((membership) => membership.group_id))
      const newGroupIds = normalizedGroupIds.filter((groupId) => !existingGroupIds.has(groupId))

      if (newGroupIds.length) {
        const { error: membershipError } = await supabase
          .from('group_members')
          .insert(newGroupIds.map((groupId) => ({ group_id: groupId, student_id: student.id })))
        if (membershipError) throw membershipError
      }

      const amount = Number(monthlyRate) || 0
      if (amount > 0) {
        const { month, year } = getCurrentPeriod()
        const { data: existingPayments, error: paymentsLookupError } = await supabase
          .from('payments')
          .select('group_id')
          .eq('student_id', student.id)
          .eq('teacher_id', teacher.id)
          .eq('period_month', month)
          .eq('period_year', year)
          .in('group_id', normalizedGroupIds)

        if (paymentsLookupError) throw paymentsLookupError

        const paidGroupIds = new Set((existingPayments || []).map((payment) => payment.group_id))
        const paymentGroupIds = normalizedGroupIds.filter((groupId) => !paidGroupIds.has(groupId))

        if (paymentGroupIds.length) {
          const { error: paymentError } = await supabase
            .from('payments')
            .insert(paymentGroupIds.map((groupId) => ({
              student_id: student.id,
              group_id: groupId,
              teacher_id: teacher.id,
              amount,
              period_month: month,
              period_year: year,
              status: 'unpaid',
            })))
          if (paymentError) throw paymentError
        }
      }

      return {
        student: {
          id: student.id,
          name: buildStudentName(student.first_name, student.last_name),
          username: student.username || null,
          amount,
          status: amount > 0 ? 'unpaid' : 'unpaid',
        },
        groupIds: normalizedGroupIds,
        primaryGroupId: normalizedGroupIds[0],
      }
    },
    onSuccess: (data, { teacherTelegramId }) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups', teacherTelegramId] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard', teacherTelegramId] })
      data.groupIds.forEach(groupId => {
        queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] })
      })
    },
  })
}

export function useRemoveStudentFromGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, studentId }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('student_id', studentId)
      
      if (error) throw error
    },
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, updates }) => {
      if (!isSupabaseConfigured || !groupId) throw new Error('Guruh topilmadi.')

      const payload = {}
      const normalizedName = normalizeOptionalText(updates?.name)
      const normalizedSubject = normalizeOptionalText(updates?.subject)

      if (normalizedName) payload.name = normalizedName
      if (normalizedSubject) payload.subject = normalizedSubject

      const { data, error } = await supabase
        .from('groups')
        .update(payload)
        .eq('id', groupId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
    },
  })
}

export function useUpdateStudentRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, studentId, amount }) => {
      if (!isSupabaseConfigured || !groupId || !studentId) throw new Error('Xatolik')

      const { month, year } = getCurrentPeriod()

      const { data: group } = await supabase
        .from('groups')
        .select('teacher_id')
        .eq('id', groupId)
        .maybeSingle()

      if (!group?.teacher_id) throw new Error('O\'qituvchi topilmadi')

      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('student_id', studentId)
        .eq('group_id', groupId)
        .eq('period_month', month)
        .eq('period_year', year)
        .maybeSingle()

      let error
      if (existingPayment) {
        const result = await supabase
          .from('payments')
          .update({ amount })
          .eq('id', existingPayment.id)
        error = result.error
      } else {
        const result = await supabase
          .from('payments')
          .insert({
            student_id: studentId,
            group_id: groupId,
            teacher_id: group.teacher_id,
            amount,
            period_month: month,
            period_year: year,
            status: 'unpaid'
          })
        error = result.error
      }

      if (error) throw error
    },
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] })
      queryClient.invalidateQueries({ queryKey: ['teacher-payments'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
    },
  })
}

export function useCreateHomework() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, title, dueDate, description = '' }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const { data, error } = await supabase
        .from('homework')
        .insert({ group_id: groupId, title, due_date: dueDate, description })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-homework'] })
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] })
    },
  })
}

export function useSaveAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, studentId, present }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan')
      const { error } = await supabase
        .from('attendance')
        .upsert({ session_id: sessionId, student_id: studentId, present }, { onConflict: 'session_id,student_id' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['student-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] })
    },
  })
}
