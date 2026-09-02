import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchStudentDashboard,
  fetchStudentGroups,
  fetchStudentPayments,
  fetchStudentSchedule,
  fetchStudentHomework,
  fetchParentChildren,
  markHomeworkDone as apiMarkHomeworkDone,
  joinTrustedInvite,
} from '../../lib/backend'

export function useParentChildren(telegramId) {
  return useQuery({
    queryKey: ['parent-children', telegramId],
    queryFn: async () => {
      const { children } = await fetchParentChildren()
      return children
    },
    enabled: !!telegramId,
  })
}

export function useStudentDashboard(telegramId, studentId) {
  return useQuery({
    queryKey: ['student-dashboard', telegramId, studentId || 'self'],
    queryFn: () => fetchStudentDashboard(studentId),
    enabled: !!telegramId,
  })
}

export function useStudentGroups(telegramId, studentId) {
  return useQuery({
    queryKey: ['student-groups', telegramId, studentId || 'self'],
    queryFn: async () => {
      const { groups } = await fetchStudentGroups(studentId)
      return groups
    },
    enabled: !!telegramId,
  })
}

export function useStudentHomework(telegramId, studentId) {
  return useQuery({
    queryKey: ['student-homework', telegramId, studentId || 'self'],
    queryFn: async () => {
      const { homework } = await fetchStudentHomework(studentId)
      return homework
    },
    enabled: !!telegramId,
  })
}

export function useStudentPayments(telegramId, studentId) {
  return useQuery({
    queryKey: ['student-payments', telegramId, studentId || 'self'],
    queryFn: async () => {
      const { payments } = await fetchStudentPayments(studentId)
      return payments
    },
    enabled: !!telegramId,
  })
}

export function useStudentSchedule(telegramId, weekStart, studentId) {
  return useQuery({
    queryKey: ['student-schedule', telegramId, weekStart, studentId || 'self'],
    queryFn: async () => {
      const { sessions } = await fetchStudentSchedule(weekStart, studentId)
      return sessions
    },
    enabled: !!telegramId,
  })
}

export function useStudentAllSessions(telegramId, studentId) {
  return useQuery({
    queryKey: ['student-all-sessions', telegramId, studentId],
    queryFn: async () => {
      const { sessions } = await fetchStudentSchedule(undefined, studentId, true)
      return sessions || []
    },
    enabled: !!telegramId,
  })
}


export function useMarkHomeworkDone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ submissionId, done }) => {
      await apiMarkHomeworkDone({ submissionId, done })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-homework'] })
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] })
    },
  })
}

export async function joinGroupByToken(inviteToken) {
  return joinTrustedInvite(inviteToken)
}
