import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchStudentDashboard,
  fetchStudentGroups,
  fetchStudentPayments,
  fetchStudentSchedule,
  fetchStudentHomework,
  markHomeworkDone as apiMarkHomeworkDone,
  joinTrustedInvite,
} from '../../lib/backend'

export function useStudentDashboard(telegramId) {
  return useQuery({
    queryKey: ['student-dashboard', telegramId],
    queryFn: () => fetchStudentDashboard(),
    enabled: !!telegramId,
  })
}

export function useStudentGroups(telegramId) {
  return useQuery({
    queryKey: ['student-groups', telegramId],
    queryFn: async () => {
      const { groups } = await fetchStudentGroups()
      return groups
    },
    enabled: !!telegramId,
  })
}

export function useStudentHomework(telegramId) {
  return useQuery({
    queryKey: ['student-homework', telegramId],
    queryFn: async () => {
      const { homework } = await fetchStudentHomework()
      return homework
    },
    enabled: !!telegramId,
  })
}

export function useStudentPayments(telegramId) {
  return useQuery({
    queryKey: ['student-payments', telegramId],
    queryFn: async () => {
      const { payments } = await fetchStudentPayments()
      return payments
    },
    enabled: !!telegramId,
  })
}

export function useStudentSchedule(telegramId, weekStart) {
  return useQuery({
    queryKey: ['student-schedule', telegramId, weekStart],
    queryFn: async () => {
      const { sessions } = await fetchStudentSchedule(weekStart)
      return sessions
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
