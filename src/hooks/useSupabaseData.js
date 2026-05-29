import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const queryCache = new Map()
const queryCacheMeta = new Map()
const cacheListeners = new Map()
const userRowByTelegramIdCache = new Map()
const userRowByTelegramIdPromises = new Map()
const DEFAULT_RETRY_COUNT = 1
const DEFAULT_RETRY_DELAY_MS = 450

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(error) {
  if (!error) return false

  const message = String(error.message || '').toLowerCase()
  const code = String(error.code || '').toLowerCase()
  const status = Number(error.status || error.statusCode || 0)

  if (status >= 500 || status === 408 || status === 429) return true
  if (code === 'fetcherror' || code === 'ecconnreset' || code === 'etimedout') return true

  return [
    'failed to fetch',
    'networkerror',
    'network request failed',
    'timed out',
    'timeout',
    'connection',
    'gateway',
    'service unavailable',
  ].some((token) => message.includes(token))
}

async function withRetry(operation, options = {}) {
  const retries = options.retries ?? DEFAULT_RETRY_COUNT
  const delayMs = options.delayMs ?? DEFAULT_RETRY_DELAY_MS

  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === retries || !isRetryableError(error)) throw error
      await sleep(delayMs * (attempt + 1))
    }
  }

  throw lastError
}

function subscribeToCache(cacheKey, listener) {
  if (!cacheKey) return () => {}

  if (!cacheListeners.has(cacheKey)) {
    cacheListeners.set(cacheKey, new Set())
  }

  cacheListeners.get(cacheKey).add(listener)

  return () => {
    const listeners = cacheListeners.get(cacheKey)
    if (!listeners) return

    listeners.delete(listener)

    if (!listeners.size) {
      cacheListeners.delete(cacheKey)
    }
  }
}

function emitCacheUpdate(cacheKey, value) {
  const listeners = cacheListeners.get(cacheKey)
  if (!listeners?.size) return

  listeners.forEach((listener) => listener(value))
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function buildTelegramUserPayload(tgUser, overrides = {}) {
  return {
    telegram_id: overrides.telegram_id ?? tgUser?.id ?? null,
    first_name: normalizeOptionalText(tgUser?.first_name) || 'Foydalanuvchi',
    last_name: normalizeOptionalText(tgUser?.last_name),
    username: normalizeOptionalText(tgUser?.username),
    photo_url: normalizeOptionalText(tgUser?.photo_url),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function generateInviteToken() {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) {
    return uuid.replace(/-/g, '').slice(0, 12)
  }

  return Math.random().toString(36).slice(2, 14)
}

function getTeacherGroupsCacheKey(telegramId) {
  return telegramId ? `teacher-groups:${telegramId}` : null
}

function getTeacherDashboardCacheKey(telegramId) {
  return telegramId ? `teacher-dashboard:${telegramId}` : null
}

function getTeacherScheduleCacheKey(telegramId, weekStart) {
  return telegramId && weekStart ? `teacher-schedule:${telegramId}:${weekStart}` : null
}

function getStudentGroupsCacheKey(telegramId) {
  return telegramId ? `student-groups:${telegramId}` : null
}

function getStudentHomeworkCacheKey(telegramId) {
  return telegramId ? `student-homework:${telegramId}` : null
}

function getStudentPaymentsCacheKey(telegramId) {
  return telegramId ? `student-payments:${telegramId}` : null
}

function getStudentAttendanceCacheKey(telegramId) {
  return telegramId ? `student-attendance:${telegramId}` : null
}

function getStudentDashboardCacheKey(telegramId) {
  return telegramId ? `student-dashboard:${telegramId}` : null
}

function getStudentScheduleCacheKey(telegramId, weekStart) {
  return telegramId && weekStart ? `student-schedule:${telegramId}:${weekStart}` : null
}

function getGroupDetailCacheKey(groupId) {
  return groupId ? `group-detail:${groupId}` : null
}

function getTelegramUserCacheKey(telegramId) {
  return telegramId ? String(telegramId) : null
}

function updateSessionCollections(collection = [], sessionId, updater) {
  return collection.map((item) => (item.id === sessionId ? updater(item) : item))
}

function removeSessionFromCollections(collection = [], sessionId) {
  return collection.filter((item) => item.id !== sessionId)
}

function updateSessionInNestedGroups(groups = [], sessionId, updater) {
  return groups.map((group) => ({
    ...group,
    sessions: updateSessionCollections(group.sessions || [], sessionId, updater),
  }))
}

function removeSessionFromNestedGroups(groups = [], sessionId) {
  return groups.map((group) => ({
    ...group,
    sessions: removeSessionFromCollections(group.sessions || [], sessionId),
  }))
}

function updateSessionInStudentGroupRows(rows = [], sessionId, updater) {
  return rows.map((row) => {
    const group = row.group || row
    const updatedGroup = {
      ...group,
      sessions: updateSessionCollections(group.sessions || [], sessionId, updater),
    }
    return row.group ? { ...row, group: updatedGroup } : updatedGroup
  })
}

function removeSessionFromStudentGroupRows(rows = [], sessionId) {
  return rows.map((row) => {
    const group = row.group || row
    const updatedGroup = {
      ...group,
      sessions: removeSessionFromCollections(group.sessions || [], sessionId),
    }
    return row.group ? { ...row, group: updatedGroup } : updatedGroup
  })
}

function setCachedUserRowByTelegramId(telegramId, userRow) {
  const cacheKey = getTelegramUserCacheKey(telegramId)
  if (!cacheKey) return
  if (userRow) {
    userRowByTelegramIdCache.set(cacheKey, userRow)
    return
  }

  userRowByTelegramIdCache.delete(cacheKey)
}

function setCachedQueryValue(cacheKey, value) {
  if (!cacheKey) return
  queryCache.set(cacheKey, value)
  queryCacheMeta.set(cacheKey, Date.now())
  emitCacheUpdate(cacheKey, value)
}

function getCachedQueryValue(cacheKey, fallbackValue) {
  if (!cacheKey || !queryCache.has(cacheKey)) return fallbackValue
  return queryCache.get(cacheKey)
}

function isCachedQueryFresh(cacheKey, staleMs = 0) {
  if (!cacheKey || !staleMs || !queryCache.has(cacheKey)) return false
  const updatedAt = queryCacheMeta.get(cacheKey) || 0
  return Date.now() - updatedAt < staleMs
}

function updateCachedValue(cacheKey, updater) {
  if (!cacheKey) return

  const currentValue = queryCache.get(cacheKey)
  const nextValue = updater(currentValue)

  if (nextValue !== undefined) {
    setCachedQueryValue(cacheKey, nextValue)
  }
}

function updateMatchingCaches(prefix, updater) {
  Array.from(queryCache.keys())
    .filter((cacheKey) => cacheKey.startsWith(prefix))
    .forEach((cacheKey) => updateCachedValue(cacheKey, updater))
}

function removeCachedValue(cacheKey) {
  if (!cacheKey) return

  queryCache.delete(cacheKey)
  queryCacheMeta.delete(cacheKey)
  emitCacheUpdate(cacheKey, undefined)
}

function buildCachedGroup(group) {
  return {
    ...group,
    group_members: group.group_members || [{ count: 0 }],
    sessions: group.sessions || [],
    paidPercent: group.paidPercent ?? 0,
  }
}

function buildStudentName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Talaba'
}

function buildManualStudentPayload({ name, contact }) {
  const normalizedName = normalizeOptionalText(name) || 'Talaba'
  const nameParts = normalizedName.split(/\s+/)
  const firstName = nameParts.shift() || 'Talaba'
  const lastName = nameParts.join(' ') || null
  const normalizedContact = normalizeOptionalText(contact)
  const usernameCandidate = normalizedContact?.replace(/^@/, '')
  const username = usernameCandidate && /^[a-zA-Z0-9_]{3,}$/.test(usernameCandidate) ? usernameCandidate : null

  return {
    telegram_id: null,
    first_name: firstName,
    last_name: lastName,
    username,
    role: 'student',
    updated_at: new Date().toISOString(),
  }
}

async function getUserRowByTelegramId(telegramId) {
  if (!isSupabaseConfigured || !telegramId) return null

  const cacheKey = getTelegramUserCacheKey(telegramId)
  if (!cacheKey) return null

  if (userRowByTelegramIdCache.has(cacheKey)) {
    return userRowByTelegramIdCache.get(cacheKey)
  }

  if (userRowByTelegramIdPromises.has(cacheKey)) {
    return userRowByTelegramIdPromises.get(cacheKey)
  }

  const request = (async () => {
    const { data, error } = await withRetry(() =>
      supabase
        .from('users')
        .select('id, role, first_name, last_name, username, photo_url')
        .eq('telegram_id', telegramId)
        .maybeSingle()
    )

    if (error) throw error

    setCachedUserRowByTelegramId(telegramId, data)
    return data
  })()

  userRowByTelegramIdPromises.set(cacheKey, request)

  try {
    return await request
  } finally {
    userRowByTelegramIdPromises.delete(cacheKey)
  }
}

async function getUserRowByUsername(username) {
  const normalizedUsername = normalizeOptionalText(username)?.replace(/^@/, '')
  if (!isSupabaseConfigured || !normalizedUsername) return null

  const { data, error } = await withRetry(() =>
    supabase
      .from('users')
      .select('id, role, first_name, last_name, username, photo_url, telegram_id')
      .eq('username', normalizedUsername)
      .maybeSingle()
  )

  if (error) throw error
  return data
}

function useSupabaseQuery(queryFn, initialData, deps = [], cacheKey = null, options = {}) {
  const staleMs = options.staleMs ?? 0
  const [data, setData] = useState(() => getCachedQueryValue(cacheKey, initialData))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const latestCacheKey = useRef(cacheKey)
  useEffect(() => {
    latestCacheKey.current = cacheKey
  }, [cacheKey])

  // Track cacheKey transitions to synchronously load cached data on key changes
  const [prevCacheKey, setPrevCacheKey] = useState(cacheKey)
  if (cacheKey !== prevCacheKey) {
    setPrevCacheKey(cacheKey)
    setData(getCachedQueryValue(cacheKey, initialData))
  }

  const fetchQuery = useCallback(async ({ force = false } = {}) => {
    if (!cacheKey) {
      setData(initialData)
      setLoading(false)
      return
    }

    const fetchKey = cacheKey

    if (!isSupabaseConfigured) {
      setError(null)
      setData(getCachedQueryValue(fetchKey, initialData))
      setLoading(false)
      return
    }

    setError(null)

    if (!force && isCachedQueryFresh(fetchKey, staleMs)) {
      setData(getCachedQueryValue(fetchKey, initialData))
      setLoading(false)
      return
    }

    // Only set loading to true if we don't have this key in the cache yet
    setLoading(!queryCache.has(fetchKey))

    try {
      const result = await withRetry(() => queryFn())
      if (latestCacheKey.current !== fetchKey) return

      if (result?.error) throw result.error
      if (result?.data !== undefined) {
        setData(result.data)
        setCachedQueryValue(fetchKey, result.data)
      }
    } catch (err) {
      if (latestCacheKey.current !== fetchKey) return
      setError(err)
      console.error('[Supabase] Query error:', err)
      setData(getCachedQueryValue(fetchKey, initialData))
    } finally {
      if (latestCacheKey.current === fetchKey) {
        setLoading(false)
      }
    }
  }, [cacheKey, staleMs, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchQuery()
  }, [fetchQuery])

  useEffect(() => {
    if (!cacheKey) return undefined

    return subscribeToCache(cacheKey, (nextValue) => {
      setData(nextValue ?? initialData)
    })
  }, [cacheKey, initialData])

  const refetch = useCallback(() => fetchQuery({ force: true }), [fetchQuery])

  return { data, loading, error, refetch }
}

function getCurrentPeriod() {
  const now = new Date()
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

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

export async function upsertTelegramUser(tgUser) {
  if (!isSupabaseConfigured || !tgUser?.id) return null

  const { data, error } = await withRetry(() =>
    supabase
      .from('users')
      .upsert(
        buildTelegramUserPayload(tgUser),
        { onConflict: 'telegram_id', ignoreDuplicates: false }
      )
      .select()
      .single()
  )

  if (error) {
    console.error('[Supabase] upsertTelegramUser:', error)
    return null
  }

  setCachedUserRowByTelegramId(tgUser.id, data)
  return data
}

export async function saveUserRole(telegramUserOrId, role) {
  const telegramId =
    typeof telegramUserOrId === 'object' && telegramUserOrId !== null
      ? telegramUserOrId.id
      : telegramUserOrId

  if (!isSupabaseConfigured || !telegramId) return

  const request =
    typeof telegramUserOrId === 'object' && telegramUserOrId !== null
      ? supabase
          .from('users')
          .upsert(
            buildTelegramUserPayload(telegramUserOrId, { role }),
            { onConflict: 'telegram_id', ignoreDuplicates: false }
          )
      : supabase
          .from('users')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('telegram_id', telegramId)

  const { error } = await request
  if (error) throw error

  const cacheKey = getTelegramUserCacheKey(telegramId)
  if (cacheKey && userRowByTelegramIdCache.has(cacheKey)) {
    userRowByTelegramIdCache.set(cacheKey, {
      ...userRowByTelegramIdCache.get(cacheKey),
      role,
    })
  }
}

export function useTeacherGroups(telegramId) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: [] }

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
      if (!groups.length) return { data: [] }

      const groupIds = new Set(groups.map((group) => group.id))
      const payments = (paymentsRes.data || []).filter((payment) => groupIds.has(payment.group_id))

      return { data: computePaidPercentByGroup(groups, payments) }
    },
    [],
    [telegramId],
    getTeacherGroupsCacheKey(telegramId),
    { staleMs: 20000 }
  )
}

export async function createGroup(telegramId, { name, subject }, tgUser = null) {
  if (!isSupabaseConfigured) return { success: false, error: { message: 'Supabase sozlanmagan' } }
  if (!telegramId) return { success: false, error: { message: 'Telegram foydalanuvchisi aniqlanmadi.' } }

  const tempId = `temp-${Date.now()}`
  const groupsCacheKey = getTeacherGroupsCacheKey(telegramId)
  
  const optimisticGroup = {
    id: tempId,
    name,
    subject: subject || 'General',
    color: 'purple',
    group_members: [{ count: 0 }],
    sessions: [],
    paidPercent: 0,
    created_at: new Date().toISOString(),
    isOptimistic: true,
  }

  // Optimistically insert into cache
  if (groupsCacheKey) {
    updateCachedValue(groupsCacheKey, (currentGroups = []) => {
      if (currentGroups.some((g) => g.id === tempId)) return currentGroups
      return [optimisticGroup, ...currentGroups]
    })
  }

  const cleanupOptimistic = () => {
    if (groupsCacheKey) {
      updateCachedValue(groupsCacheKey, (currentGroups = []) => {
        return currentGroups.filter((g) => g.id !== tempId)
      })
    }
  }

  let userRow = null
  let findErr = null

  try {
    userRow = await getUserRowByTelegramId(telegramId)
  } catch (error) {
    findErr = error
  }

  if (!userRow && !findErr) {
    const { data: newUser, error: createErr } = await withRetry(() =>
      supabase
        .from('users')
        .upsert(
          buildTelegramUserPayload(tgUser, {
            telegram_id: telegramId,
            role: 'teacher',
          }),
          { onConflict: 'telegram_id', ignoreDuplicates: false }
        )
        .select('id')
        .single()
    )

    if (createErr) {
      console.error('[createGroup] auto-create user error:', createErr)
      cleanupOptimistic()
      return { success: false, error: { message: `Foydalanuvchi yaratib bo'lmadi: ${createErr.message}` } }
    }

    userRow = newUser
  }

  if (findErr) {
    console.error('[createGroup] user lookup:', findErr)
    cleanupOptimistic()
    return { success: false, error: { message: `User lookup: ${findErr.message}` } }
  }

  if (!userRow) {
    cleanupOptimistic()
    return { success: false, error: { message: 'Foydalanuvchi topilmadi.' } }
  }

  const { data, error } = await withRetry(() =>
    supabase
      .from('groups')
      .insert({
        name,
        subject,
        teacher_id: userRow.id,
        invite_token: generateInviteToken(),
      })
      .select()
      .single()
  )

  if (error) {
    console.error('[createGroup] insert:', error)
    cleanupOptimistic()
  }

  if (!error && data) {
    const dashboardCacheKey = getTeacherDashboardCacheKey(telegramId)
    const cachedGroup = buildCachedGroup(data)

    updateCachedValue(groupsCacheKey, (currentGroups = []) => {
      const filtered = currentGroups.filter((g) => g.id !== tempId)
      if (filtered.some((group) => group.id === cachedGroup.id)) return filtered
      return [cachedGroup, ...filtered]
    })

    updateCachedValue(dashboardCacheKey, (currentDashboard) => {
      if (!currentDashboard) return currentDashboard
      return {
        ...currentDashboard,
        totalGroups: (currentDashboard.totalGroups || 0) + 1,
      }
    })
  }

  return { success: !error, data, error }
}

export async function deleteGroup(groupId) {
  if (!isSupabaseConfigured) return { success: false }
  const cachedDetail = queryCache.get(getGroupDetailCacheKey(groupId))
  const removedStudents = cachedDetail?.group?.group_members?.[0]?.count || 0

  const { error } = await withRetry(() => supabase.from('groups').delete().eq('id', groupId))

  if (!error) {
    updateMatchingCaches('teacher-groups:', (currentGroups = []) => currentGroups.filter((group) => group.id !== groupId))
    updateMatchingCaches('teacher-dashboard:', (currentDashboard) => {
      if (!currentDashboard) return currentDashboard
      return {
        ...currentDashboard,
        totalGroups: Math.max((currentDashboard.totalGroups || 0) - 1, 0),
        totalStudents: Math.max((currentDashboard.totalStudents || 0) - removedStudents, 0),
        todaySessions: (currentDashboard.todaySessions || []).filter((session) => session.group?.id !== groupId),
      }
    })
    removeCachedValue(getGroupDetailCacheKey(groupId))
  }

  return { success: !error, error }
}

export function useGroupDetail(groupId) {
  return useSupabaseQuery(
    async () => {
      if (!groupId) return { data: { group: null, students: [] } }

      const [{ data: group, error: groupError }, { data: memberships, error: membershipsError }, { data: paymentRows, error: paymentsError }] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name, subject, color, telegram_group_link, group_members(count)')
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
        data: {
          group,
          students,
        },
      }
    },
    { group: null, students: [] },
    [groupId],
    getGroupDetailCacheKey(groupId),
    { staleMs: 20000 }
  )
}

export async function addStudentToGroup(groupId, telegramId) {
  if (!isSupabaseConfigured) return { success: false }

  const user = await getUserRowByTelegramId(telegramId)
  if (!user) return { success: false, error: 'User not found' }

  const { data, error } = await withRetry(() =>
    supabase
      .from('group_members')
      .upsert({ group_id: groupId, student_id: user.id }, { onConflict: 'group_id,student_id' })
      .select()
  )

  return { success: !error, data, error }
}

export async function createStudent(teacherTelegramId, { name, contact, groupIds, monthlyRate }) {
  if (!isSupabaseConfigured) return { success: false, error: { message: 'Supabase sozlanmagan' } }

  const normalizedName = normalizeOptionalText(name)
  if (!teacherTelegramId || !normalizedName) {
    return { success: false, error: { message: "Talaba ma'lumotlari to'liq emas." } }
  }

  const normalizedGroupIds = Array.from(new Set((groupIds || []).filter(Boolean)))
  if (!normalizedGroupIds.length) {
    return { success: false, error: { message: 'Kamida bitta guruh tanlang.' } }
  }

  const teacher = await getUserRowByTelegramId(teacherTelegramId)
  if (!teacher) {
    return { success: false, error: { message: "O'qituvchi topilmadi." } }
  }

  const normalizedContact = normalizeOptionalText(contact)
  let student = null

  if (normalizedContact && /^\d+$/.test(normalizedContact)) {
    student = await getUserRowByTelegramId(Number(normalizedContact))
  }

  if (!student && normalizedContact) {
    student = await getUserRowByUsername(normalizedContact)
  }

  if (!student) {
    const { data: createdStudent, error: studentError } = await withRetry(() =>
      supabase
        .from('users')
        .insert(buildManualStudentPayload({ name: normalizedName, contact: normalizedContact }))
        .select('id, telegram_id, first_name, last_name, username, photo_url')
        .single()
    )

    if (studentError) {
      console.error('[createStudent] create user:', studentError)
      return { success: false, error: { message: `Talabani yaratib bo'lmadi: ${studentError.message}` } }
    }

    student = createdStudent
  }

  const { data: existingMemberships, error: membershipLookupError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('student_id', student.id)
    .in('group_id', normalizedGroupIds)

  if (membershipLookupError) {
    console.error('[createStudent] membership lookup:', membershipLookupError)
    return { success: false, error: { message: membershipLookupError.message } }
  }

  const existingGroupIds = new Set((existingMemberships || []).map((membership) => membership.group_id))
  const newGroupIds = normalizedGroupIds.filter((groupId) => !existingGroupIds.has(groupId))

  if (newGroupIds.length) {
    const { error: membershipError } = await withRetry(() =>
      supabase
        .from('group_members')
        .insert(newGroupIds.map((groupId) => ({ group_id: groupId, student_id: student.id })))
    )

    if (membershipError) {
      console.error('[createStudent] add to group:', membershipError)
      return { success: false, error: { message: membershipError.message } }
    }
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

    if (paymentsLookupError) {
      console.error('[createStudent] payment lookup:', paymentsLookupError)
      return { success: false, error: { message: paymentsLookupError.message } }
    }

    const paidGroupIds = new Set((existingPayments || []).map((payment) => payment.group_id))
    const paymentGroupIds = normalizedGroupIds.filter((groupId) => !paidGroupIds.has(groupId))

    if (paymentGroupIds.length) {
      const { error: paymentError } = await withRetry(() =>
        supabase
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
      )

      if (paymentError) {
        console.error('[createStudent] create payment:', paymentError)
        return { success: false, error: { message: paymentError.message } }
      }
    }
  }

  const studentView = {
    id: student.id,
    name: buildStudentName(student.first_name, student.last_name),
    username: student.username || null,
    amount,
    status: amount > 0 ? 'unpaid' : 'unpaid',
  }

  updateCachedValue(getTeacherGroupsCacheKey(teacherTelegramId), (currentGroups = []) =>
    currentGroups.map((group) =>
      normalizedGroupIds.includes(group.id)
        ? {
            ...group,
            group_members: [{ count: (group.group_members?.[0]?.count || 0) + (newGroupIds.includes(group.id) ? 1 : 0) }],
          }
        : group
    )
  )

  updateCachedValue(getTeacherDashboardCacheKey(teacherTelegramId), (currentDashboard) => {
    if (!currentDashboard) return currentDashboard
    return {
      ...currentDashboard,
      totalStudents: (currentDashboard.totalStudents || 0) + newGroupIds.length,
    }
  })

  normalizedGroupIds.forEach((groupId) => {
    updateCachedValue(getGroupDetailCacheKey(groupId), (currentDetail) => {
      if (!currentDetail?.group) return currentDetail

      const alreadyInList = currentDetail.students?.some((item) => item.id === studentView.id)
      return {
        ...currentDetail,
        group: {
          ...currentDetail.group,
          group_members: [{ count: (currentDetail.group.group_members?.[0]?.count || 0) + (newGroupIds.includes(groupId) ? 1 : 0) }],
        },
        students: alreadyInList ? currentDetail.students : [...(currentDetail.students || []), studentView],
      }
    })
  })

  return {
    success: true,
    data: {
      student: studentView,
      groupIds: normalizedGroupIds,
      primaryGroupId: normalizedGroupIds[0],
    },
  }
}

export async function removeStudentFromGroup(groupId, studentId) {
  if (!isSupabaseConfigured) return { success: false }

  const affectedTeacherGroupEntries = Array.from(queryCache.entries()).filter(([cacheKey]) => cacheKey.startsWith('teacher-groups:'))
  const affectedTeacherDashboardEntries = Array.from(queryCache.entries()).filter(([cacheKey]) => cacheKey.startsWith('teacher-dashboard:'))
  const groupDetailCacheKey = getGroupDetailCacheKey(groupId)
  const currentGroupDetail = queryCache.get(groupDetailCacheKey)

  updateMatchingCaches('teacher-groups:', (currentGroups = []) =>
    currentGroups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            group_members: [{ count: Math.max((group.group_members?.[0]?.count || 0) - 1, 0) }],
          }
        : group
    )
  )

  updateMatchingCaches('teacher-dashboard:', (currentDashboard) => {
    if (!currentDashboard) return currentDashboard
    return {
      ...currentDashboard,
      totalStudents: Math.max((currentDashboard.totalStudents || 0) - 1, 0),
    }
  })

  updateCachedValue(groupDetailCacheKey, (currentDetail) => {
    if (!currentDetail?.group) return currentDetail
    return {
      ...currentDetail,
      group: {
        ...currentDetail.group,
        group_members: [{ count: Math.max((currentDetail.group.group_members?.[0]?.count || 0) - 1, 0) }],
      },
      students: (currentDetail.students || []).filter((student) => student.id !== studentId),
    }
  })

  const { error } = await withRetry(() =>
    supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('student_id', studentId)
  )

  if (error) {
    affectedTeacherGroupEntries.forEach(([cacheKey, value]) => {
      setCachedQueryValue(cacheKey, value)
    })
    affectedTeacherDashboardEntries.forEach(([cacheKey, value]) => {
      setCachedQueryValue(cacheKey, value)
    })
    if (currentGroupDetail !== undefined) {
      setCachedQueryValue(groupDetailCacheKey, currentGroupDetail)
    }
  }

  return { success: !error, error }
}

export async function updateGroup(groupId, updates) {
  if (!isSupabaseConfigured || !groupId) return { success: false, error: { message: 'Guruh topilmadi.' } }

  const payload = {}
  const normalizedName = normalizeOptionalText(updates?.name)
  const normalizedSubject = normalizeOptionalText(updates?.subject)

  if (normalizedName) payload.name = normalizedName
  if (normalizedSubject) payload.subject = normalizedSubject

  const { data, error } = await withRetry(() =>
    supabase
      .from('groups')
      .update(payload)
      .eq('id', groupId)
      .select()
      .single()
  )

  if (!error && data) {
    updateMatchingCaches('teacher-groups:', (currentGroups = []) =>
      currentGroups.map((group) => (group.id === groupId ? { ...group, ...data } : group))
    )
    updateCachedValue(getGroupDetailCacheKey(groupId), (currentDetail) => {
      if (!currentDetail?.group) return currentDetail
      return {
        ...currentDetail,
        group: {
          ...currentDetail.group,
          ...data,
        },
      }
    })
  }

  return { success: !error, data, error }
}

export function useTeacherPayments(telegramId, filter = 'all') {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: [] }

      let query = supabase
        .from('payments')
        .select('*, student:users!payments_student_id_fkey(first_name, last_name), group:groups(name, subject)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (filter === 'paid') query = query.eq('status', 'paid')
      if (filter === 'unpaid') query = query.eq('status', 'unpaid')

      return query
    },
    [],
    [telegramId, filter]
  )
}

export async function markPaymentPaid(paymentId, method = 'cash', note = '') {
  if (!isSupabaseConfigured) return { success: false, error: { message: 'Supabase sozlanmagan' } }

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

  return { success: !error, data, error }
}

export function useTeacherSchedule(telegramId, weekStart) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: [] }

      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('teacher_id', user.id)

      if (groupsError) throw groupsError

      const groupIds = (groups || []).map((group) => group.id)
      if (!groupIds.length) return { data: [] }

      const start = weekStart ? new Date(weekStart) : new Date()
      const end = new Date(start)
      end.setDate(end.getDate() + 7)

      return supabase
        .from('sessions')
        .select('id, group_id, scheduled_at, duration_min, status, group:groups(name, subject), attendance(count)')
        .in('group_id', groupIds)
        .gte('scheduled_at', start.toISOString())
        .lt('scheduled_at', end.toISOString())
        .order('scheduled_at')
    },
    [],
    [telegramId, weekStart],
    getTeacherScheduleCacheKey(telegramId, weekStart)
  )
}

export async function createSession({ groupId, scheduledAt, durationMin = 90 }) {
  if (!isSupabaseConfigured) return { success: false }

  const { data, error } = await supabase
    .from('sessions')
    .insert({ group_id: groupId, scheduled_at: scheduledAt, duration_min: durationMin, status: 'upcoming' })
    .select()
    .single()

  return { success: !error, data, error }
}

export async function updateSessionStatus(sessionId, status) {
  if (!isSupabaseConfigured || !sessionId || !status) return { success: false }

  const { data, error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', sessionId)
    .select('id, status')
    .single()

  if (!error && data) {
    updateMatchingCaches('teacher-schedule:', (sessions = []) =>
      updateSessionCollections(sessions, sessionId, (session) => ({ ...session, status: data.status }))
    )
    updateMatchingCaches('student-schedule:', (sessions = []) =>
      updateSessionCollections(sessions, sessionId, (session) => ({ ...session, status: data.status }))
    )
    updateMatchingCaches('teacher-groups:', (groups = []) =>
      updateSessionInNestedGroups(groups, sessionId, (session) => ({ ...session, status: data.status }))
    )
    updateMatchingCaches('student-groups:', (rows = []) =>
      updateSessionInStudentGroupRows(rows, sessionId, (session) => ({ ...session, status: data.status }))
    )
    updateMatchingCaches('teacher-dashboard:', (dashboard) => {
      if (!dashboard) return dashboard
      return {
        ...dashboard,
        todaySessions: updateSessionCollections(dashboard.todaySessions || [], sessionId, (session) => ({
          ...session,
          status: data.status,
        })),
      }
    })
  }

  return { success: !error, data, error }
}

export async function deleteSession(sessionId) {
  if (!isSupabaseConfigured || !sessionId) return { success: false }

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (!error) {
    updateMatchingCaches('teacher-schedule:', (sessions = []) => removeSessionFromCollections(sessions, sessionId))
    updateMatchingCaches('student-schedule:', (sessions = []) => removeSessionFromCollections(sessions, sessionId))
    updateMatchingCaches('teacher-groups:', (groups = []) => removeSessionFromNestedGroups(groups, sessionId))
    updateMatchingCaches('student-groups:', (rows = []) => removeSessionFromStudentGroupRows(rows, sessionId))
    updateMatchingCaches('teacher-dashboard:', (dashboard) => {
      if (!dashboard) return dashboard
      return {
        ...dashboard,
        todaySessions: removeSessionFromCollections(dashboard.todaySessions || [], sessionId),
      }
    })
  }

  return { success: !error, error }
}

export async function createHomework({ groupId, title, dueDate, description = '' }) {
  if (!isSupabaseConfigured) return { success: false }

  const { data, error } = await supabase
    .from('homework')
    .insert({ group_id: groupId, title, due_date: dueDate, description })
    .select()
    .single()

  return { success: !error, data, error }
}

export async function saveAttendance(sessionId, studentId, present) {
  if (!isSupabaseConfigured) return { success: false }

  const { error } = await supabase
    .from('attendance')
    .upsert({ session_id: sessionId, student_id: studentId, present }, { onConflict: 'session_id,student_id' })

  return { success: !error, error }
}

export function useStudentSchedule(telegramId, weekStart) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: [] }

      const { data: memberships, error: membershipsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('student_id', user.id)

      if (membershipsError) throw membershipsError

      const groupIds = (memberships || []).map((membership) => membership.group_id)
      if (!groupIds.length) return { data: [] }

      const start = weekStart ? new Date(weekStart) : new Date()
      const end = new Date(start)
      end.setDate(end.getDate() + 7)

      return supabase
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
    },
    [],
    [telegramId, weekStart],
    getStudentScheduleCacheKey(telegramId, weekStart)
  )
}

export function useStudentGroups(telegramId) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: [] }

      return supabase
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
    },
    [],
    [telegramId],
    getStudentGroupsCacheKey(telegramId),
    { staleMs: 20000 }
  )
}

export function useStudentHomework(telegramId) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: [] }

      return supabase
        .from('homework_submissions')
        .select('id, done, done_at, homework(id, title, due_date, description, group:groups(subject))')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
    },
    [],
    [telegramId],
    getStudentHomeworkCacheKey(telegramId),
    { staleMs: 15000 }
  )
}

export async function markHomeworkDone(submissionId, done) {
  if (!isSupabaseConfigured) return { success: false }

  const { error } = await supabase
    .from('homework_submissions')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', submissionId)

  return { success: !error, error }
}

export function useStudentPayments(telegramId) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: [] }

      return supabase
        .from('payments')
        .select('*, group:groups(name, subject)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
    },
    [],
    [telegramId],
    getStudentPaymentsCacheKey(telegramId),
    { staleMs: 15000 }
  )
}

export function useStudentAttendance(telegramId) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: 0 }

      const { data, error } = await supabase
        .from('attendance')
        .select('present')
        .eq('student_id', user.id)

      if (error) throw error

      const total = data.length
      const present = data.filter((item) => item.present).length

      return { data: total > 0 ? Math.round((present / total) * 100) : 0 }
    },
    0,
    [telegramId],
    getStudentAttendanceCacheKey(telegramId),
    { staleMs: 15000 }
  )
}

export function useTeacherDashboard(telegramId) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: null }

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
          .select('amount, status, student:users!payments_student_id_fkey(first_name, last_name)')
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
        data: {
          totalGroups: groups.length,
          totalStudents,
          todaySessions: sessionsRes.data || [],
          unpaid: unpaidRes.data || [],
        },
      }
    },
    null,
    [telegramId],
    getTeacherDashboardCacheKey(telegramId),
    { staleMs: 20000 }
  )
}

export function useStudentDashboard(telegramId) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: null }

      const [membershipsRes, hwRes, payRes, attRes] = await Promise.all([
        supabase
          .from('group_members')
          .select('group_id')
          .eq('student_id', user.id),
        supabase
          .from('homework_submissions')
          .select('done, homework(due_date)')
          .eq('student_id', user.id)
          .eq('done', false),
        supabase
          .from('payments')
          .select('amount')
          .eq('student_id', user.id)
          .in('status', ['unpaid', 'pending', 'partial']),
        supabase
          .from('attendance')
          .select('present')
          .eq('student_id', user.id),
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
        data: {
          homeworkCount: homework.length,
          homeworkOverdue: overdue,
          balance,
          attendance,
          nextLesson: nextLessonRes.data?.[0] || null,
        },
      }
    },
    null,
    [telegramId],
    getStudentDashboardCacheKey(telegramId),
    { staleMs: 20000 }
  )
}

export async function joinGroupByToken(telegramId, inviteToken, tgUser = null) {
  if (!isSupabaseConfigured || !telegramId || !inviteToken) return { success: false }

  let userRow = null
  try {
    userRow = await getUserRowByTelegramId(telegramId)
  } catch (err) {
    console.error('[joinGroupByToken] user lookup error:', err)
  }

  if (!userRow) {
    const { data: newUser, error: createErr } = await supabase
      .from('users')
      .upsert(
        buildTelegramUserPayload(tgUser, { telegram_id: telegramId, role: 'student' }),
        { onConflict: 'telegram_id', ignoreDuplicates: false }
      )
      .select()
      .single()

    if (createErr) {
      console.error('[joinGroupByToken] create user error:', createErr)
      return { success: false, error: createErr }
    }
    userRow = newUser
  }

  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .select('id, name, teacher_id')
    .eq('invite_token', inviteToken)
    .maybeSingle()

  if (groupErr || !group) {
    console.error('[joinGroupByToken] group lookup:', groupErr)
    return { success: false, error: { message: 'Guruh topilmadi.' } }
  }

  const { error: memberErr } = await supabase
    .from('group_members')
    .upsert({ group_id: group.id, student_id: userRow.id }, { onConflict: 'group_id,student_id' })

  if (memberErr) {
    console.error('[joinGroupByToken] member add error:', memberErr)
    return { success: false, error: memberErr }
  }

  const { month, year } = getCurrentPeriod()
  
  // Find or insert payment row
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

  updateMatchingCaches('teacher-groups:', (groups = []) =>
    groups.map((g) =>
      g.id === group.id
        ? { ...g, group_members: [{ count: (g.group_members?.[0]?.count || 0) + 1 }] }
        : g
    )
  )

  removeCachedValue(getGroupDetailCacheKey(group.id))
  removeCachedValue(getTeacherDashboardCacheKey(telegramId))

  return { success: true, groupName: group.name, role: userRow.role }
}

export async function updateStudentRate(groupId, studentId, amount) {
  if (!isSupabaseConfigured || !groupId || !studentId) return { success: false }

  const { month, year } = getCurrentPeriod()

  // Get the teacher_id from group
  const { data: group } = await supabase
    .from('groups')
    .select('teacher_id')
    .eq('id', groupId)
    .maybeSingle()

  if (!group) return { success: false, error: { message: 'Guruh topilmadi.' } }

  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('student_id', studentId)
    .eq('group_id', groupId)
    .eq('period_month', month)
    .eq('period_year', year)
    .maybeSingle()

  let error = null
  if (existingPayment) {
    const res = await supabase
      .from('payments')
      .update({ amount: Number(amount) || 0 })
      .eq('id', existingPayment.id)
    error = res.error
  } else {
    const res = await supabase
      .from('payments')
      .insert({
        student_id: studentId,
        group_id: groupId,
        teacher_id: group.teacher_id,
        amount: Number(amount) || 0,
        period_month: month,
        period_year: year,
        status: 'unpaid',
      })
    error = res.error
  }

  if (!error) {
    removeCachedValue(getGroupDetailCacheKey(groupId))
    updateMatchingCaches('teacher-groups:', (groups = []) => groups)
  }

  return { success: !error, error }
}
