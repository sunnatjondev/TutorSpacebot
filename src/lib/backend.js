// ─── TutorSpace Backend API Client ─────────────────────────
// All data flows through the Railway backend.
// The backend verifies Telegram initData and talks to Supabase
// using service_role key — no direct Supabase access from frontend.

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL
const backendUrl = rawBackendUrl ? rawBackendUrl.replace(/\/+$/, '') : ''

export const isBackendConfigured = Boolean(backendUrl)

export function getTelegramInitData() {
  return window?.Telegram?.WebApp?.initData || ''
}

async function requestBackend(path, payload = {}) {
  if (!isBackendConfigured) {
    throw new Error('Backend URL is not configured (VITE_BACKEND_URL)')
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error('Telegram initData is unavailable — open via Telegram')
  }

  const response = await fetch(`${backendUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, initData }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Backend request failed (${response.status})`)
  }

  return data
}

// ─── Auth ──────────────────────────────────────────────────

export async function fetchTrustedSession() {
  return requestBackend('/api/auth/session')
}

export function fetchTrustedUser() {
  return fetchTrustedSession()
}

export async function saveTrustedRole(role) {
  return requestBackend('/api/auth/role', { role })
}

export async function joinTrustedInvite(inviteToken) {
  return requestBackend('/api/invites/join', { inviteToken })
}

// ─── Teacher API ───────────────────────────────────────────

export function fetchTeacherDashboard() {
  return requestBackend('/api/teacher/dashboard')
}

export function fetchTeacherGroups() {
  return requestBackend('/api/teacher/groups')
}

export function fetchTeacherPayments(filter = 'all') {
  return requestBackend('/api/teacher/payments', { filter })
}

export function fetchTeacherSchedule(weekStart) {
  return requestBackend('/api/teacher/schedule', { weekStart })
}

// ─── Group Management ─────────────────────────────────────

export function createGroup({ name, subject }) {
  return requestBackend('/api/groups/create', { name, subject })
}

export function deleteGroup(groupId) {
  return requestBackend('/api/groups/delete', { groupId })
}

export function updateGroup({ groupId, name, subject }) {
  return requestBackend('/api/groups/update', { groupId, name, subject })
}

export function fetchGroupDetail(groupId) {
  return requestBackend('/api/groups/detail', { groupId })
}

export function fetchGroupHomework(groupId) {
  return requestBackend('/api/groups/homework', { groupId })
}

export function createHomework({ groupId, title, dueDate, description }) {
  return requestBackend('/api/groups/homework/create', { groupId, title, dueDate, description })
}

export function saveAttendance({ sessionId, studentId, present }) {
  return requestBackend('/api/groups/attendance', { sessionId, studentId, present })
}

export function deleteGroupHomework(homeworkId) {
  return requestBackend('/api/groups/homework/delete', { homeworkId })
}

// ─── Student Management ───────────────────────────────────

export function createStudent({ name, contact, groupIds, monthlyRate }) {
  return requestBackend('/api/students/create', { name, contact, groupIds, monthlyRate })
}

export function removeStudent({ groupId, studentId }) {
  return requestBackend('/api/students/remove', { groupId, studentId })
}

export function updateStudentRate({ groupId, studentId, amount }) {
  return requestBackend('/api/students/rate', { groupId, studentId, amount })
}

// ─── Sessions ─────────────────────────────────────────────

export function createSession({ groupId, scheduledAt, durationMin }) {
  return requestBackend('/api/sessions/create', { groupId, scheduledAt, durationMin })
}

export function updateSessionStatus({ sessionId, status }) {
  return requestBackend('/api/sessions/update', { sessionId, status })
}

export function deleteSession(sessionId) {
  return requestBackend('/api/sessions/delete', { sessionId })
}

// ─── Payments ─────────────────────────────────────────────

export function markPaymentPaid({ paymentId, method, note }) {
  return requestBackend('/api/payments/mark-paid', { paymentId, method, note })
}

export function createPayment({ studentId, groupId, teacherId, amount, month }) {
  return requestBackend('/api/payments/create', { studentId, groupId, teacherId, amount, month })
}

// ─── Student-side API ─────────────────────────────────────

export function fetchStudentDashboard() {
  return requestBackend('/api/student/dashboard')
}

export function fetchStudentGroups() {
  return requestBackend('/api/student/groups')
}

export function fetchStudentPayments() {
  return requestBackend('/api/student/payments')
}

export function fetchStudentSchedule(weekStart) {
  return requestBackend('/api/student/schedule', { weekStart })
}

export function fetchStudentHomework() {
  return requestBackend('/api/student/homework')
}

export function markHomeworkDone({ submissionId, done }) {
  return requestBackend('/api/student/homework/done', { submissionId, done })
}

// ─── Group Attendance Queries ─────────────────────────────

export function fetchGroupDayAttendance({ groupId, date }) {
  return requestBackend('/api/groups/day-attendance', { groupId, date })
}

export function fetchGroupMonthlyStats(groupId) {
  return requestBackend('/api/groups/monthly-stats', { groupId })
}

// ─── User Settings ────────────────────────────────────────

export function updateUserSettings(payload) {
  return requestBackend('/api/user/settings', payload)
}

export function deleteUserAccount() {
  return requestBackend('/api/user/delete')
}
