import { supabase, requireServiceSupabase, requireUserRow } from '../db.js'
import { checkTeacherSubscription } from './authService.js'
import { buildStudentName, getCurrentPeriod } from '../helpers.js'
import { getBot } from '../bot.js'
export async function handleTeacherDashboard(telegramUser, body = {}) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  const subscription = await checkTeacherSubscription(user.id)

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
  const groupIds = groups.map((g) => g.id)
  const totalStudents = groups.reduce((sum, g) => sum + (g.group_members?.[0]?.count || 0), 0)

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

  const todaySessions = sessionsRes.data || []
  const unpaidAmount = unpaidRes.data.reduce((sum, p) => sum + (p.amount || 0), 0)

  // Monthly stats with target month and year filters
  const targetYear = Number(body.year) || todayStart.getFullYear()
  const targetMonth = Number(body.month) || (todayStart.getMonth() + 1) // 1-indexed

  const monthStart = new Date(targetYear, targetMonth - 1, 1)
  const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59)
  const now = new Date()
  const attendanceEnd = now < monthEnd ? now : monthEnd

  const attendanceRes = groupIds.length
    ? await supabase
        .from('sessions')
        .select(`
          group_id, 
          id, 
          attendance(
            present, 
            student_id, 
            student:users(first_name, last_name, username)
          )
        `)
        .in('group_id', groupIds)
        .gte('scheduled_at', monthStart.toISOString())
        .lte('scheduled_at', attendanceEnd.toISOString())
        .neq('status', 'cancelled')
    : { data: [], error: null }

  const overdueRes = groupIds.length
    ? await supabase
        .from('sessions')
        .select('id, scheduled_at, status, group_id, groups(name)')
        .in('group_id', groupIds)
        .eq('status', 'upcoming')
        .lt('scheduled_at', todayStart.toISOString())
        .order('scheduled_at', { ascending: false })
    : { data: [], error: null }

  const homeworkRes = groupIds.length
    ? await supabase
        .from('homework')
        .select('id, title, due_at, group:groups(name)')
        .in('group_id', groupIds)
        .gte('due_at', now.toISOString())
        .order('due_at', { ascending: true })
        .limit(3)
    : { data: [], error: null }

  let totalAttendanceRecords = 0
  let totalPresent = 0
  const groupStats = {}

  if (attendanceRes.data) {
    attendanceRes.data.forEach(session => {
      const records = session.attendance || []
      const gid = session.group_id
      if (!groupStats[gid]) {
        groupStats[gid] = { 
          total: 0, 
          present: 0,
          studentMap: {}
        }
      }
      
      const sessionTotal = records.length
      const sessionPresent = records.filter(a => a.present).length
      
      groupStats[gid].total += sessionTotal
      groupStats[gid].present += sessionPresent

      records.forEach(r => {
        if (!r.student) return
        const sid = r.student_id
        if (!groupStats[gid].studentMap[sid]) {
          const sname = `${r.student.first_name || ''} ${r.student.last_name || ''}`.trim() || r.student.username || 'Ism yo\'q'
          groupStats[gid].studentMap[sid] = {
            name: sname,
            presentCount: 0,
            totalCount: 0
          }
        }
        groupStats[gid].studentMap[sid].totalCount++
        if (r.present) {
          groupStats[gid].studentMap[sid].presentCount++
        }
      })
      
      totalAttendanceRecords += sessionTotal
      totalPresent += sessionPresent
    })
  }

  const attendancePercent = totalAttendanceRecords > 0 ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 0
  const groupAttendance = Object.keys(groupStats).map(gid => {
    const studentsArr = Object.keys(groupStats[gid].studentMap).map(sid => {
      const s = groupStats[gid].studentMap[sid]
      return {
        studentId: sid,
        name: s.name,
        presentCount: s.presentCount,
        totalCount: s.totalCount,
        percent: s.totalCount > 0 ? Math.round((s.presentCount / s.totalCount) * 100) : 0
      }
    }).sort((a, b) => a.percent - b.percent)

    return {
      groupId: gid,
      percent: groupStats[gid].total > 0 ? Math.round((groupStats[gid].present / groupStats[gid].total) * 100) : 0,
      present: groupStats[gid].present,
      total: groupStats[gid].total,
      students: studentsArr
    }
  })

  return {
    ok: true,
    totalGroups: groups.length,
    totalStudents,
    unpaidCount: unpaidRes.data.length,
    unpaidAmount,
    todaySessions,
    unpaidStudents: unpaidRes.data,
    subscription,
    attendancePercent,
    attendancePresent: totalPresent,
    attendanceTotalRecords: totalAttendanceRecords,
    groupAttendance,
    overdueSessions: overdueRes.data || [],
    upcomingHomeworks: homeworkRes.data || []
  }
}

export async function handleTeacherGroups(telegramUser) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  const [groupsRes, paymentsRes] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, subject, color, created_at, group_members(count), sessions(id, scheduled_at, status, attendance(present))')
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
  if (!groups.length) return { ok: true, groups: [] }

  const { month, year } = getCurrentPeriod()
  const groupIds = new Set(groups.map((g) => g.id))
  const payments = (paymentsRes.data || []).filter((p) => groupIds.has(p.group_id))

  const enriched = groups.map((group) => {
    const totalStudents = group.group_members?.[0]?.count || 0
    
    // Calculate attendance percent
    let totalAttendance = 0
    let presentAttendance = 0
    group.sessions?.forEach((session) => {
      if (session.status === 'cancelled') return
      const records = session.attendance || []
      totalAttendance += records.length
      presentAttendance += records.filter((r) => r.present).length
    })
    const attendancePercent = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0

    if (!totalStudents) return { ...group, paidPercent: 0, attendancePercent: 0 }

    const paidStudents = new Set(
      payments.filter((p) =>
        p.group_id === group.id &&
        p.status === 'paid' &&
        p.period_month === month &&
        p.period_year === year
      ).map((p) => p.student_id)
    )

    return { 
      ...group, 
      paidPercent: Math.round((paidStudents.size / totalStudents) * 100),
      attendancePercent 
    }
  })

  return { ok: true, groups: enriched }
}

export async function handleTeacherPayments(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  const filter = body.filter || 'all'

  let query = supabase
    .from('payments')
    .select(`
      id, student_id, teacher_id, group_id, amount, status, method,
      period_year, period_month, note, paid_at, created_at,
      student:users!payments_student_id_fkey(first_name, last_name, username),
      group:groups(name, subject)
    `)
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  if (filter === 'paid') query = query.eq('status', 'paid')
  if (filter === 'unpaid') query = query.eq('status', 'unpaid')

  const { data, error } = await query
  if (error) throw error
  return { ok: true, payments: data || [] }
}

export async function handleTeacherSchedule(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id')
    .eq('teacher_id', user.id)

  if (groupsError) throw groupsError

  const groupIds = (groups || []).map((g) => g.id)
  if (!groupIds.length) return { ok: true, sessions: [] }

  const start = body.weekStart ? new Date(body.weekStart) : new Date()
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  const { data, error } = await supabase
    .from('sessions')
    .select('id, group_id, scheduled_at, duration_min, status, group:groups(name, subject, color, group_members(count))')
    .in('group_id', groupIds)
    .gte('scheduled_at', start.toISOString())
    .lt('scheduled_at', end.toISOString())
    .order('scheduled_at')

  if (error) throw error
  return { ok: true, sessions: data || [] }
}

export async function handleTeacherRemindDebtors(telegramUser, body) {
  requireServiceSupabase()
  const teacher = await requireUserRow(telegramUser)

  const { month, year } = getCurrentPeriod()
  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      id, amount, student:users!payments_student_id_fkey(id, telegram_id, first_name, last_name, username, language),
      group:groups(name)
    `)
    .eq('teacher_id', teacher.id)
    .eq('status', 'unpaid')
    .eq('period_month', month)
    .eq('period_year', year)

  if (error) throw error
  if (!payments || !payments.length) return { ok: true, sentCount: 0, failedCount: 0, failedStudents: [] }

  const teacherName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'O\'qituvchi'
  let sentCount = 0
  const failedStudents = []

  const bot = getBot()

  for (const payment of payments) {
    const student = payment.student
    if (!student) continue

    const studentName = [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Talaba'
    const groupName = payment.group?.name || 'Guruh'
    const amountStr = (payment.amount || 0).toLocaleString('ru-RU')

    const lang = student.language || 'uz'
    const text = lang === 'ru'
      ? `🔔 *Напоминание об оплате*\n\nЗдравствуйте, *${studentName}*.\nУ вас есть неоплаченный счет за обучение в группе *${groupName}* (Преподаватель: *${teacherName}*).\nСумма к оплате: *${amountStr} UZS*.\nПожалуйста, произведите оплату.`
      : `🔔 *To'lov eslatmasi*\n\nAssalomu alaykum, *${studentName}*.\nSizda *${groupName}* guruhi uchun to'lov kutilmoqda (O'qituvchi: *${teacherName}*).\nTo'lov summasi: *${amountStr} UZS*.\nIltimos, to'lovni vaqtida amalga oshiring.`

    let sent = false
    if (student.telegram_id && bot) {
      try {
        await bot.sendMessage(student.telegram_id, text, { parse_mode: 'Markdown' })
        sent = true
        sentCount++
      } catch (e) {
        console.error(`Failed to send bot message to ${student.telegram_id}:`, e)
      }
    }

    if (!sent) {
      failedStudents.push({
        id: payment.id,
        name: studentName,
        username: student.username || null,
        amount: payment.amount,
        text: text.replace(/\*/g, '')
      })
    }
  }

  return { ok: true, sentCount, failedCount: failedStudents.length, failedStudents }
}

export async function handleTeacherRemindStudent(telegramUser, body) {
  requireServiceSupabase()
  const teacher = await requireUserRow(telegramUser)
  const { paymentId } = body

  if (!paymentId) throw new Error('paymentId is required')

  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      id, amount, student:users!payments_student_id_fkey(id, telegram_id, first_name, last_name, username, language),
      group:groups(name)
    `)
    .eq('id', paymentId)
    .eq('teacher_id', teacher.id)
    .single()

  if (error) throw error
  if (!payment) throw new Error('Payment not found')

  const student = payment.student
  if (!student) throw new Error('Student not found')

  const teacherName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'O\'qituvchi'
  const studentName = [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Talaba'
  const groupName = payment.group?.name || 'Guruh'
  const amountStr = (payment.amount || 0).toLocaleString('ru-RU')

  const lang = student.language || 'uz'
  const text = lang === 'ru'
    ? `🔔 *Напоминание об оплате*\n\nЗдравствуйте, *${studentName}*.\nУ вас есть неоплаченный счет за обучение в группе *${groupName}* (Преподаватель: *${teacherName}*).\nСумма к оплате: *${amountStr} UZS*.\nПожалуйста, произведите оплату.`
    : `🔔 *To'lov eslatmasi*\n\nAssalomu alaykum, *${studentName}*.\nSizda *${groupName}* guruhi uchun to'lov kutilmoqda (O'qituvchi: *${teacherName}*).\nTo'lov summasi: *${amountStr} UZS*.\nIltimos, to'lovni vaqtida amalga oshiring.`

  let sent = false
  const bot = getBot()

  if (student.telegram_id && bot) {
    try {
      await bot.sendMessage(student.telegram_id, text, { parse_mode: 'Markdown' })
      sent = true
    } catch (e) {
      console.error(`Failed to send single bot message to ${student.telegram_id}:`, e)
    }
  }

  return { ok: true, sent, text: text.replace(/\*/g, '') }
}


