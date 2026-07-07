import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTeacherDashboard,
  fetchTeacherGroups,
  fetchTeacherPayments,
  fetchTeacherSchedule,
  createGroup as apiCreateGroup,
  deleteGroup as apiDeleteGroup,
  createSession as apiCreateSession,
  updateSessionStatus as apiUpdateSessionStatus,
  deleteSession as apiDeleteSession,
  markPaymentPaid as apiMarkPaymentPaid,
  createPayment as apiCreatePayment,
  fetchBillingStatus,
  createBillingOrder,
} from '../../lib/backend'

export function useTeacherDashboard(telegramId, month, year) {
  return useQuery({
    queryKey: ['teacher-dashboard', telegramId, month, year],
    queryFn: () => fetchTeacherDashboard(month, year),
    enabled: !!telegramId,
  })
}

export function useTeacherGroups(telegramId) {
  return useQuery({
    queryKey: ['teacher-groups', telegramId],
    queryFn: async () => {
      const { groups } = await fetchTeacherGroups()
      return groups
    },
    enabled: !!telegramId,
  })
}

export function useTeacherPayments(telegramId, filter = 'all') {
  return useQuery({
    queryKey: ['teacher-payments', telegramId, filter],
    queryFn: async () => {
      const { payments } = await fetchTeacherPayments(filter)
      return payments
    },
    enabled: !!telegramId,
  })
}

export function useTeacherSchedule(telegramId, weekStart) {
  return useQuery({
    queryKey: ['teacher-schedule', telegramId, weekStart],
    queryFn: async () => {
      const { sessions } = await fetchTeacherSchedule(weekStart)
      return sessions
    },
    enabled: !!telegramId,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, subject }) => {
      const { group } = await apiCreateGroup({ name, subject })
      return group
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
      await apiDeleteGroup(groupId)
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
      const { session } = await apiCreateSession({ groupId, scheduledAt, durationMin })
      return session
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['student-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['student-groups'] })
    },
  })
}

export function useUpdateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, status, notes }) => {
      const { session } = await apiUpdateSessionStatus({ sessionId, status, notes })
      return session
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
      await apiDeleteSession(sessionId)
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
      await apiMarkPaymentPaid({ paymentId, method, note })
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
      const { payment } = await apiCreatePayment({ studentId, groupId, teacherId, amount, month })
      return payment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-payments'] })
      queryClient.invalidateQueries({ queryKey: ['group-detail'] })
    },
  })
}

// ─── Billing Hooks ──────────────────────────────────────────

export function useBillingStatus(telegramId) {
  return useQuery({
    queryKey: ['billing-status', telegramId],
    queryFn: async () => {
      const data = await fetchBillingStatus()
      if (!data.ok) throw new Error(data.error || 'Failed to fetch billing status')
      return data.subscription
    },
    enabled: !!telegramId,
  })
}

export function useCreateBillingOrder() {
  return useMutation({
    mutationFn: (payload) => createBillingOrder(payload),
  })
}
