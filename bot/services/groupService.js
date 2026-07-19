import { supabase, requireServiceSupabase, getUserRowByTelegramId, getUserRowByUsername, upsertTrustedTelegramUser, requireUserRow, requireGroupOwner, requireSessionOwner, requireGroupMember } from '../db.js'
import { checkTeacherSubscription } from './authService.js'
import { normalizeOptionalText, getCurrentPeriod, generateInviteToken, buildStudentName } from '../helpers.js'
import { getBot } from '../bot.js'
import { t } from '../i18n.js'

export async function handleGroupCreate(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  if (user.role !== 'teacher') throw new Error('Only teachers can create groups')
  if (!body.name || !body.name.trim()) throw new Error('Group name is required')

  const sub = await checkTeacherSubscription(user.id)
  if (!sub.active) throw new Error('subscription_expired')
  
  if (sub.limits.maxGroups) {
    const { count } = await supabase.from('groups').select('id', { count: 'exact', head: true }).eq('teacher_id', user.id)
    if (count >= sub.limits.maxGroups) throw new Error('plan_limit_reached')
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: body.name,
      subject: body.subject || null,
      teacher_id: user.id,
      invite_token: generateInviteToken(),
    })
    .select('id, teacher_id, name, subject, invite_token, color, created_at')
    .single()

  if (error) throw error
  return { ok: true, group: data }
}

export async function handleGroupDelete(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  const { error } = await supabase.from('groups').delete().eq('id', body.groupId).eq('teacher_id', user.id)
  if (error) throw error
  return { ok: true }
}

export async function handleGroupUpdate(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  const payload = {}
  if (body.name) payload.name = body.name.trim()
  if (body.subject) payload.subject = body.subject
  if (body.color) payload.color = body.color
  if (body.telegram_group_link !== undefined) payload.telegram_group_link = body.telegram_group_link
  if (body.billing_day !== undefined) payload.billing_day = body.billing_day
  if (body.price_per_month !== undefined) payload.price_per_month = body.price_per_month
  if (body.schedule_template !== undefined) payload.schedule_template = body.schedule_template

  const { data, error } = await supabase
    .from('groups')
    .update(payload)
    .eq('id', body.groupId)
    .eq('teacher_id', user.id)
    .select('id, teacher_id, name, subject, color, telegram_group_link, billing_day, price_per_month, schedule_template, invite_token, created_at')
    .single()

  if (error) throw error
  return { ok: true, group: data }
}

export async function handleGroupDetail(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  const groupId = body.groupId
  await requireGroupOwner(user.id, groupId)

  const [
    { data: group, error: groupError },
    { data: memberships, error: membershipsError },
    { data: paymentRows, error: paymentsError },
  ] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, subject, color, telegram_group_link, billing_day, price_per_month, schedule_template, invite_token, group_members(count)')
      .eq('id', groupId)
      .maybeSingle(),
    supabase
      .from('group_members')
      .select('id, student_id, joined_at, student:users(id, telegram_id, first_name, last_name, username, photo_url)')
      .eq('group_id', groupId),
    supabase
      .from('payments')
      .select('id, student_id, amount, status, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false }),
  ])

  if (groupError) throw groupError
  if (membershipsError) throw membershipsError
  if (paymentsError) throw paymentsError

  const paymentByStudentId = new Map()
  ;(paymentRows || []).forEach((p) => {
    if (!paymentByStudentId.has(p.student_id)) {
      paymentByStudentId.set(p.student_id, p)
    }
  })

  const students = (memberships || []).map((m) => {
    const payment = paymentByStudentId.get(m.student_id)
    return {
      id: m.student?.id || m.student_id,
      name: buildStudentName(m.student?.first_name, m.student?.last_name),
      username: m.student?.username || null,
      amount: payment?.amount || 0,
      status: payment?.status || 'unpaid',
      payment_id: payment?.id || null,
      joined_at: m.joined_at,
    }
  })

  return { ok: true, group, students }
}

export async function handleGroupHomework(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  await requireGroupOwner(user.id, body.groupId)

  const { data, error } = await supabase
    .from('homework')
    .select('id, title, due_at, description, created_at, homework_submissions(status)')
    .eq('group_id', body.groupId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const homework = (data || []).map(item => {
    const submissions = item.homework_submissions || []
    const doneCount = submissions.filter(s => s.status === 'done' || s.status === 'graded').length
    return {
      id: item.id,
      title: item.title,
      due_at: item.due_at,
      description: item.description,
      created_at: item.created_at,
      doneCount,
      totalCount: submissions.length
    }
  })

  return { ok: true, homework }
}

export async function handleGroupHomeworkDelete(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  // Verify that the teacher owns the group
  const { data: homework } = await supabase
    .from('homework')
    .select('group_id, groups(teacher_id)')
    .eq('id', body.homeworkId)
    .single()

  if (!homework || homework.groups?.teacher_id !== user.id) {
    throw new Error('Homework not found or unauthorized')
  }

  const { error } = await supabase.from('homework').delete().eq('id', body.homeworkId)
  if (error) throw error
  return { ok: true }
}

export async function handleHomeworkCreate(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  await requireGroupOwner(user.id, body.groupId)

  const { data, error } = await supabase
    .from('homework')
    .insert({
      group_id: body.groupId,
      title: body.title,
      due_at: body.dueDate || null,
      description: body.description || '',
    })
    .select('id, group_id, title, description, due_at, created_at')
    .single()

  if (error) throw error

  // Query group members to create submissions
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('student_id')
    .eq('group_id', body.groupId)

  if (membersError) throw membersError

  if (members && members.length > 0) {
    const submissions = members.map((m) => ({
      homework_id: data.id,
      student_id: m.student_id,
      status: 'pending',
    }))
    const { error: subError } = await supabase.from('homework_submissions').insert(submissions)
    if (subError) throw subError
  }

  return { ok: true, homework: data }
}

export async function handleAttendanceSave(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  const session = await requireSessionOwner(user.id, body.sessionId)
  await requireGroupMember(body.studentId, session.group_id)

  const { error } = await supabase
    .from('attendance')
    .upsert(
      { session_id: body.sessionId, student_id: body.studentId, present: body.present },
      { onConflict: 'session_id,student_id' }
    )

  if (error) throw error

  // If the student is marked absent, notify parents
  if (!body.present) {
    try {
      const [
        { data: groupData },
        { data: studentData }
      ] = await Promise.all([
        supabase.from('groups').select('name').eq('id', session.group_id).single(),
        supabase.from('users').select('first_name, last_name').eq('id', body.studentId).single()
      ])

      if (groupData && studentData) {
        const studentName = `${studentData.first_name} ${studentData.last_name || ''}`.trim()
        const groupName = groupData.name

        // Find connected parents
        const { data: parents } = await supabase
          .from('parent_relations')
          .select('parent:users!parent_relations_parent_id_fkey(telegram_id, language)')
          .eq('student_id', body.studentId)

        const bot = getBot()
        if (bot && parents && parents.length > 0) {
          for (const p of parents) {
            const parentUser = p.parent
            if (parentUser?.telegram_id) {
              const lang = parentUser.language || 'uz'
              const message = t(lang, 'parent_absent_alert', studentName, groupName)
              bot.sendMessage(parentUser.telegram_id, message, { parse_mode: 'HTML' }).catch(() => {})
            }
          }
        }
      }
    } catch (notifyErr) {
      console.error('Failed to notify parents about absence:', notifyErr.message)
    }
  }

  return { ok: true }
}


// ─── Student Management API ───────────────────────────────

export async function handleStudentCreate(telegramUser, body) {
  requireServiceSupabase()
  const teacher = await requireUserRow(telegramUser)
  if (teacher.role !== 'teacher') throw new Error('Only teachers can add students')

  const sub = await checkTeacherSubscription(teacher.id)
  if (!sub.active) throw new Error('subscription_expired')

  if (sub.limits.maxStudents) {
    const { data: groups } = await supabase.from('groups').select('id').eq('teacher_id', teacher.id)
    if (groups && groups.length > 0) {
      const groupIds = groups.map(g => g.id)
      const { data: members } = await supabase.from('group_members').select('student_id').in('group_id', groupIds)
      const uniqueStudents = new Set((members || []).map(m => m.student_id)).size
      if (uniqueStudents >= sub.limits.maxStudents) throw new Error('plan_limit_reached')
    }
  }

  const normalizedName = normalizeOptionalText(body.name)
  if (!normalizedName) throw new Error("Talaba ismi kerak")

  const normalizedGroupIds = Array.from(new Set((body.groupIds || []).filter(Boolean)))
  if (!normalizedGroupIds.length) throw new Error('Kamida bitta guruh tanlang.')

  const { data: ownedGroups, error: ownedGroupsError } = await supabase
    .from('groups')
    .select('id')
    .eq('teacher_id', teacher.id)
    .in('id', normalizedGroupIds)

  if (ownedGroupsError) throw ownedGroupsError

  const ownedGroupIds = new Set((ownedGroups || []).map((group) => group.id))
  if (ownedGroupIds.size !== normalizedGroupIds.length) {
    throw new Error('Unauthorized: one or more groups do not belong to you')
  }

  const normalizedContact = normalizeOptionalText(body.contact)
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

  // Add to groups
  const { data: existingMemberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('student_id', student.id)
    .in('group_id', normalizedGroupIds)

  const existingGroupIds = new Set((existingMemberships || []).map((m) => m.group_id))
  const newGroupIds = normalizedGroupIds.filter((gid) => !existingGroupIds.has(gid))

  if (newGroupIds.length) {
    const { error: membershipError } = await supabase
      .from('group_members')
      .insert(newGroupIds.map((gid) => ({ group_id: gid, student_id: student.id })))
    if (membershipError) throw membershipError

    // Create submissions for active homeworks in the newly joined groups
    const { data: activeHomeworks } = await supabase
      .from('homework')
      .select('id, group_id')
      .in('group_id', newGroupIds)
      .gt('due_at', new Date().toISOString())

    if (activeHomeworks && activeHomeworks.length > 0) {
      const submissions = activeHomeworks.map((hw) => ({
        homework_id: hw.id,
        student_id: student.id,
        status: 'pending',
      }))
      await supabase.from('homework_submissions').insert(submissions)
    }
  }

  // Create payment rows
  const amount = Number(body.monthlyRate) || 0
  if (amount > 0) {
    const { month, year } = getCurrentPeriod()
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('group_id')
      .eq('student_id', student.id)
      .eq('teacher_id', teacher.id)
      .eq('period_month', month)
      .eq('period_year', year)
      .in('group_id', normalizedGroupIds)

    const paidGroupIds = new Set((existingPayments || []).map((p) => p.group_id))
    const paymentGroupIds = normalizedGroupIds.filter((gid) => !paidGroupIds.has(gid))

    if (paymentGroupIds.length) {
      await supabase.from('payments').insert(
        paymentGroupIds.map((gid) => ({
          student_id: student.id,
          group_id: gid,
          teacher_id: teacher.id,
          amount,
          period_month: month,
          period_year: year,
          status: 'unpaid',
        }))
      )
    }
  }

  return {
    ok: true,
    student: {
      id: student.id,
      name: buildStudentName(student.first_name, student.last_name),
      username: student.username || null,
      amount,
      status: 'unpaid',
    },
    groupIds: normalizedGroupIds,
    primaryGroupId: normalizedGroupIds[0],
  }
}

export async function handleStudentRemove(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  await requireGroupOwner(user.id, body.groupId)

  const { error: memberError } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', body.groupId)
    .eq('student_id', body.studentId)

  if (memberError) throw memberError

  // Clean up unpaid payments
  await supabase
    .from('payments')
    .delete()
    .eq('group_id', body.groupId)
    .eq('student_id', body.studentId)
    .eq('status', 'unpaid')

  return { ok: true }
}

export async function handleStudentRate(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  const group = await requireGroupOwner(user.id, body.groupId)
  await requireGroupMember(body.studentId, body.groupId)

  const { month, year } = getCurrentPeriod()

  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('student_id', body.studentId)
    .eq('group_id', body.groupId)
    .eq('period_month', month)
    .eq('period_year', year)
    .maybeSingle()

  if (existingPayment) {
    const { error } = await supabase.from('payments').update({ amount: body.amount }).eq('id', existingPayment.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('payments').insert({
      student_id: body.studentId,
      group_id: body.groupId,
      teacher_id: group.teacher_id,
      amount: body.amount,
      period_month: month,
      period_year: year,
      status: 'unpaid',
    })
    if (error) throw error
  }

  return { ok: true }
}

// ─── Session API ───────────────────────────────────────────


