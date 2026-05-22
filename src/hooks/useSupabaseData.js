import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const queryCache = new Map()
const cacheListeners = new Map()

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

function getGroupDetailCacheKey(groupId) {
  return groupId ? `group-detail:${groupId}` : null
}

function updateCachedValue(cacheKey, updater) {
  if (!cacheKey) return

  const currentValue = queryCache.get(cacheKey)
  const nextValue = updater(currentValue)

  if (nextValue !== undefined) {
    queryCache.set(cacheKey, nextValue)
    emitCacheUpdate(cacheKey, nextValue)
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
    telegram_id: -(Date.now() + Math.floor(Math.random() * 1000)),
    first_name: firstName,
    last_name: lastName,
    username,
    role: 'student',
    updated_at: new Date().toISOString(),
  }
}

async function getUserRowByTelegramId(telegramId) {
  if (!isSupabaseConfigured || !telegramId) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, role, first_name, last_name, username, photo_url')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function getUserRowByUsername(username) {
  const normalizedUsername = normalizeOptionalText(username)?.replace(/^@/, '')
  if (!isSupabaseConfigured || !normalizedUsername) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, role, first_name, last_name, username, photo_url, telegram_id')
    .eq('username', normalizedUsername)
    .maybeSingle()

  if (error) throw error
  return data
}

function useSupabaseQuery(queryFn, initialData, deps = [], cacheKey = null) {
  const [data, setData] = useState(() => (cacheKey && queryCache.has(cacheKey) ? queryCache.get(cacheKey) : initialData))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setData(cacheKey && queryCache.has(cacheKey) ? queryCache.get(cacheKey) : initialData)
      setLoading(false)
      return
    }

    setLoading(!(cacheKey && queryCache.has(cacheKey)))
    setError(null)

    try {
      const result = await queryFn()
      if (result?.error) throw result.error
      if (result?.data !== undefined) {
        setData(result.data)
        if (cacheKey) queryCache.set(cacheKey, result.data)
      }
    } catch (err) {
      setError(err)
      console.error('[Supabase] Query error:', err)
      setData(cacheKey && queryCache.has(cacheKey) ? queryCache.get(cacheKey) : initialData)
    } finally {
      setLoading(false)
    }
  }, [cacheKey, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    if (!cacheKey) return undefined

    return subscribeToCache(cacheKey, (nextValue) => {
      setData(nextValue ?? initialData)
    })
  }, [cacheKey, initialData])

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

  const { data, error } = await supabase
    .from('users')
    .upsert(
      buildTelegramUserPayload(tgUser),
      { onConflict: 'telegram_id', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) {
    console.error('[Supabase] upsertTelegramUser:', error)
    return null
  }

  return data
}

export async function saveUserRole(telegramId, role) {
  if (!isSupabaseConfigured || !telegramId) return
  await supabase.from('users').update({ role }).eq('telegram_id', telegramId)
}

export function useTeacherGroups(telegramId) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: [] }

      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, subject, color, created_at, group_members(count), sessions(id, scheduled_at, status)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (groupsError) throw groupsError

      const groupIds = (groups || []).map((group) => group.id)
      if (!groupIds.length) return { data: [] }

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('group_id, student_id, status, period_month, period_year')
        .eq('teacher_id', user.id)
        .in('group_id', groupIds)

      if (paymentsError) throw paymentsError

      return { data: computePaidPercentByGroup(groups || [], payments || []) }
    },
    [],
    [telegramId],
    getTeacherGroupsCacheKey(telegramId)
  )
}

export async function createGroup(telegramId, { name, subject }, tgUser = null) {
  if (!isSupabaseConfigured) return { success: false, error: { message: 'Supabase sozlanmagan' } }
  if (!telegramId) return { success: false, error: { message: 'Telegram foydalanuvchisi aniqlanmadi.' } }

  let userRow = null
  let findErr = null

  try {
    userRow = await getUserRowByTelegramId(telegramId)
  } catch (error) {
    findErr = error
  }

  if (!userRow && !findErr) {
    const { data: newUser, error: createErr } = await supabase
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

    if (createErr) {
      console.error('[createGroup] auto-create user error:', createErr)
      return { success: false, error: { message: `Foydalanuvchi yaratib bo'lmadi: ${createErr.message}` } }
    }

    userRow = newUser
  }

  if (findErr) {
    console.error('[createGroup] user lookup:', findErr)
    return { success: false, error: { message: `User lookup: ${findErr.message}` } }
  }

  if (!userRow) {
    return { success: false, error: { message: 'Foydalanuvchi topilmadi.' } }
  }

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

  if (error) console.error('[createGroup] insert:', error)

  if (!error && data) {
    const groupsCacheKey = getTeacherGroupsCacheKey(telegramId)
    const dashboardCacheKey = getTeacherDashboardCacheKey(telegramId)
    const cachedGroup = buildCachedGroup(data)

    updateCachedValue(groupsCacheKey, (currentGroups = []) => {
      if (currentGroups.some((group) => group.id === cachedGroup.id)) return currentGroups
      return [cachedGroup, ...currentGroups]
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

  const { error } = await supabase.from('groups').delete().eq('id', groupId)

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

      const [{ data: group, error: groupError }, { data: memberships, error: membershipsError }] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name, subject, color, telegram_group_link, group_members(count)')
          .eq('id', groupId)
          .maybeSingle(),
        supabase
          .from('group_members')
          .select('id, student_id, student:users(id, telegram_id, first_name, last_name, username, photo_url)')
          .eq('group_id', groupId),
      ])

      if (groupError) throw groupError
      if (membershipsError) throw membershipsError

      const studentIds = (memberships || []).map((membership) => membership.student_id)
      let payments = []

      if (studentIds.length) {
        const { data: paymentRows, error: paymentsError } = await supabase
          .from('payments')
          .select('student_id, amount, status, created_at')
          .eq('group_id', groupId)
          .in('student_id', studentIds)
          .order('created_at', { ascending: false })

        if (paymentsError) throw paymentsError
        payments = paymentRows || []
      }

      const paymentByStudentId = new Map()
      payments.forEach((payment) => {
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
    getGroupDetailCacheKey(groupId)
  )
}

export async function addStudentToGroup(groupId, telegramId) {
  if (!isSupabaseConfigured) return { success: false }

  const user = await getUserRowByTelegramId(telegramId)
  if (!user) return { success: false, error: 'User not found' }

  const { data, error } = await supabase
    .from('group_members')
    .upsert({ group_id: groupId, student_id: user.id }, { onConflict: 'group_id,student_id' })
    .select()

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
    const { data: createdStudent, error: studentError } = await supabase
      .from('users')
      .insert(buildManualStudentPayload({ name: normalizedName, contact: normalizedContact }))
      .select('id, telegram_id, first_name, last_name, username, photo_url')
      .single()

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
    const { error: membershipError } = await supabase
      .from('group_members')
      .insert(newGroupIds.map((groupId) => ({ group_id: groupId, student_id: student.id })))

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

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('student_id', studentId)

  if (error) {
    affectedTeacherGroupEntries.forEach(([cacheKey, value]) => {
      queryCache.set(cacheKey, value)
      emitCacheUpdate(cacheKey, value)
    })
    affectedTeacherDashboardEntries.forEach(([cacheKey, value]) => {
      queryCache.set(cacheKey, value)
      emitCacheUpdate(cacheKey, value)
    })
    if (currentGroupDetail !== undefined) {
      queryCache.set(groupDetailCacheKey, currentGroupDetail)
      emitCacheUpdate(groupDetailCacheKey, currentGroupDetail)
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

  const { data, error } = await supabase
    .from('groups')
    .update(payload)
    .eq('id', groupId)
    .select()
    .single()

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
    [telegramId, weekStart]
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
    [telegramId]
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
    [telegramId]
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
    [telegramId]
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
    [telegramId]
  )
}

export function useTeacherDashboard(telegramId) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: null }

      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, group_members(count)')
        .eq('teacher_id', user.id)

      if (groupsError) throw groupsError

      const groupIds = (groups || []).map((group) => group.id)
      const totalStudents = (groups || []).reduce((sum, group) => sum + (group.group_members?.[0]?.count || 0), 0)

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)

      const sessionsPromise = groupIds.length
        ? supabase
            .from('sessions')
            .select('id, scheduled_at, status, group:groups(name, subject)')
            .in('group_id', groupIds)
            .gte('scheduled_at', todayStart.toISOString())
            .lt('scheduled_at', todayEnd.toISOString())
            .order('scheduled_at')
        : Promise.resolve({ data: [], error: null })

      const unpaidPromise = supabase
        .from('payments')
        .select('amount, status, student:users!payments_student_id_fkey(first_name, last_name)')
        .eq('teacher_id', user.id)
        .in('status', ['unpaid', 'partial'])

      const [todayRes, unpaidRes] = await Promise.all([sessionsPromise, unpaidPromise])

      if (todayRes.error) throw todayRes.error
      if (unpaidRes.error) throw unpaidRes.error

      return {
        data: {
          totalGroups: (groups || []).length,
          totalStudents,
          todaySessions: todayRes.data || [],
          unpaid: unpaidRes.data || [],
        },
      }
    },
    null,
    [telegramId],
    getTeacherDashboardCacheKey(telegramId)
  )
}

export function useStudentDashboard(telegramId) {
  return useSupabaseQuery(
    async () => {
      const user = await getUserRowByTelegramId(telegramId)
      if (!user) return { data: null }

      const { data: memberships, error: membershipsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('student_id', user.id)

      if (membershipsError) throw membershipsError

      const groupIds = (memberships || []).map((membership) => membership.group_id)

      const nextLessonPromise = groupIds.length
        ? supabase
            .from('sessions')
            .select('scheduled_at, duration_min, group:groups(name, subject, teacher:users!groups_teacher_id_fkey(first_name, last_name))')
            .in('group_id', groupIds)
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at')
            .limit(1)
        : Promise.resolve({ data: [], error: null })

      const [hwRes, payRes, attRes, nextLessonRes] = await Promise.all([
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
        nextLessonPromise,
      ])

      if (hwRes.error) throw hwRes.error
      if (payRes.error) throw payRes.error
      if (attRes.error) throw attRes.error
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
    [telegramId]
  )
}
