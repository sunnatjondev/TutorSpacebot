import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchGroupDetail,
  fetchGroupHomework,
  createStudent as apiCreateStudent,
  removeStudent as apiRemoveStudent,
  updateGroup as apiUpdateGroup,
  updateStudentRate as apiUpdateStudentRate,
  createHomework as apiCreateHomework,
  saveAttendance as apiSaveAttendance,
  deleteGroupHomework as apiDeleteGroupHomework,
} from '../../lib/backend'

export function useGroupDetail(groupId) {
  return useQuery({
    queryKey: ['group-detail', groupId],
    queryFn: async () => {
      if (!groupId) return { group: null, students: [] }
      const data = await fetchGroupDetail(groupId)
      return { group: data.group, students: data.students }
    },
    enabled: !!groupId,
  })
}

export function useGroupHomework(groupId) {
  return useQuery({
    queryKey: ['group-homework', groupId],
    queryFn: async () => {
      if (!groupId) return []
      const { homework } = await fetchGroupHomework(groupId)
      return homework
    },
    enabled: !!groupId,
  })
}

export function useAddStudentToGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, telegramId, name }) => {
      const result = await apiCreateStudent({
        name: name || 'Talaba',
        contact: String(telegramId),
        groupIds: [groupId],
        monthlyRate: 0,
      })
      return result
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
    mutationFn: async ({ name, contact, groupIds, monthlyRate }) => {
      const result = await apiCreateStudent({ name, contact, groupIds, monthlyRate })
      return result
    },
    onSuccess: (data, { teacherTelegramId }) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups', teacherTelegramId] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard', teacherTelegramId] })
      if (data.groupIds) {
        data.groupIds.forEach((groupId) => {
          queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] })
        })
      }
    },
  })
}

export function useRemoveStudentFromGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, studentId }) => {
      await apiRemoveStudent({ groupId, studentId })
    },
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] })
      queryClient.invalidateQueries({ queryKey: ['teacher-payments'] })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, updates }) => {
      const { group } = await apiUpdateGroup({
        groupId,
        ...updates,
      })
      return group
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
      await apiUpdateStudentRate({ groupId, studentId, amount })
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
      const { homework } = await apiCreateHomework({ groupId, title, dueDate, description })
      return homework
    },
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-homework', groupId] })
      queryClient.invalidateQueries({ queryKey: ['student-homework'] })
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] })
    },
  })
}

export function useSaveAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, studentId, present }) => {
      await apiSaveAttendance({ sessionId, studentId, present })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['student-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] })
    },
  })
}

export function useDeleteGroupHomework() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (homeworkId) => {
      await apiDeleteGroupHomework(homeworkId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-homework'] })
    },
  })
}
