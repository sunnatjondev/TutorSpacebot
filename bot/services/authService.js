import { supabase, requireServiceSupabase, getUserRowByTelegramId, upsertTrustedTelegramUser, requireUserRow, requireGroupOwner, requireSessionOwner } from '../db.js'
import { signSupabaseAppJwt, verifyTelegramInitData } from '../auth.js'
import { getUrlOrigin, escapeHtml, escapeMarkdown, escapeMarkdownV2, buildTelegramUserPayload, getCurrentPeriod, generateInviteToken, buildStudentName } from '../helpers.js'
import { validate } from '../validation.js'
export async function handleAuthSession(telegramUser) {
  const userRow = await upsertTrustedTelegramUser(telegramUser)
  const session = signSupabaseAppJwt(userRow)
  return { ok: true, user: userRow, session }
}

export async function ensureTrialSubscription(teacherId) {
  requireServiceSupabase()
  
  // Check if they already have a subscription
  const { data: existingSub, error: existingSubError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('teacher_id', teacherId)
    .maybeSingle()

  if (existingSubError) {
    throw new Error('SaaS migration is not applied. Run REAL_DATA_MIGRATION.sql in Supabase.')
  }

  if (existingSub) return // Already has a subscription

  // Get the trial plan
  const { data: trialPlan, error: trialPlanError } = await supabase
    .from('subscription_plans')
    .select('id, trial_days')
    .eq('slug', 'trial')
    .maybeSingle()

  if (trialPlanError) {
    throw new Error('SaaS migration is not applied. Run REAL_DATA_MIGRATION.sql in Supabase.')
  }

  if (!trialPlan) return // Trial plan not found

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (trialPlan.trial_days || 14))

  // Create trial subscription
  await supabase.from('subscriptions').insert({
    teacher_id: teacherId,
    plan_id: trialPlan.id,
    status: 'trial',
    expires_at: expiresAt.toISOString()
  })
}

export async function handleAuthRole(telegramUser, body) {
  const requestedRole = ['teacher', 'student', 'parent'].includes(body.role) ? body.role : 'student'
  const userRow = await upsertTrustedTelegramUser(telegramUser, { role: requestedRole })

  if (requestedRole === 'teacher') {
    await ensureTrialSubscription(userRow.id)
  }

  const session = signSupabaseAppJwt(userRow)
  return { ok: true, user: userRow, session }
}

export async function handleInviteJoin(telegramUser, body) {
  requireServiceSupabase()
  const inviteToken = body.inviteToken
  if (!inviteToken) throw new Error('Invite token is required')

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, teacher_id')
    .eq('invite_token', inviteToken)
    .maybeSingle()

  if (groupError) throw groupError
  if (!group) return { ok: false, success: false, message: 'Invite not found' }

  const userRow = await upsertTrustedTelegramUser(telegramUser, { role: 'student' })

  const { error: memberError } = await supabase
    .from('group_members')
    .upsert({ group_id: group.id, student_id: userRow.id }, { onConflict: 'group_id,student_id' })

  if (memberError) throw memberError

  // Create submissions for active homeworks in this group
  const { data: homeworks } = await supabase
    .from('homework')
    .select('id')
    .eq('group_id', group.id)
    .gt('due_at', new Date().toISOString())

  if (homeworks && homeworks.length > 0) {
    const submissions = homeworks.map((hw) => ({
      homework_id: hw.id,
      student_id: userRow.id,
      status: 'pending',
    }))
    await supabase.from('homework_submissions').upsert(submissions, { onConflict: 'homework_id,student_id' })
  }

  const { month, year } = getCurrentPeriod()
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('student_id', userRow.id)
    .eq('group_id', group.id)
    .eq('period_month', month)
    .eq('period_year', year)
    .maybeSingle()

  if (!existingPayment) {
    await supabase.from('payments').insert({
      student_id: userRow.id,
      group_id: group.id,
      teacher_id: group.teacher_id,
      amount: 0,
      period_month: month,
      period_year: year,
      status: 'unpaid',
    })
  }

  const session = signSupabaseAppJwt(userRow)
  return { ok: true, success: true, groupName: group.name, role: 'student', user: userRow, session }
}

// ─── Teacher API ───────────────────────────────────────────

export async function checkTeacherSubscription(userId) {
  requireServiceSupabase()
  
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select(`
      id, status, expires_at,
      plan:subscription_plans(slug, max_groups, max_students)
    `)
    .eq('teacher_id', userId)
    .maybeSingle()
    
  if (error || !sub) {
    return { active: false, plan: null }
  }

  let currentStatus = sub.status
  const expiresAt = new Date(sub.expires_at)
  
  if ((currentStatus === 'active' || currentStatus === 'trial') && expiresAt < new Date()) {
    currentStatus = 'expired'
    await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id)
  }

  return {
    active: currentStatus === 'active' || currentStatus === 'trial',
    status: currentStatus,
    expiresAt,
    plan: sub.plan,
    limits: {
      maxGroups: sub.plan?.max_groups,
      maxStudents: sub.plan?.max_students,
    }
  }
}

