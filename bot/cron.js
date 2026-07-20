import { runAutoBilling } from './crons/autoBilling.js'
import { runHwDeadlineReminder } from './crons/hwDeadlineReminder.js'
import { runPostLessonNotification } from './crons/postLessonNotification.js'
import { runAwardBadges } from './crons/awardBadges.js'
import { runGenerateSessions } from './crons/generateSessions.js'
import { t } from './i18n.js'
export function startCronJobs(bot, supabase) {
  if (!supabase) {
    console.log('Cron disabled: Supabase not configured.')
    return
  }

  console.log('Cron jobs started...')

  const memoryClaims = new Set()
  let warnedAboutNotificationTable = false

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function startSafeInterval(name, task, intervalMs) {
    let running = false

    setInterval(async () => {
      if (running) {
        console.warn(`${name} skipped: previous run still active.`)
        return
      }

      running = true
      try {
        await task()
      } catch (err) {
        console.error(`${name} error:`, err.message)
      } finally {
        running = false
      }
    }, intervalMs)
  }

  async function claimNotification(eventType, entityId, telegramId) {
    const key = `${eventType}:${entityId}:${telegramId}`
    if (memoryClaims.has(key)) return false

    // We now rely on the database UNIQUE constraint for distributed deduplication.
    // However, Supabase auto-generated JS client doesn't expose raw SQL 'ON CONFLICT DO NOTHING' easily for inserts
    // without returning an error. So we attempt insert, and if it fails with 23505 (unique violation), we know it's a dupe.
    
    const { error } = await supabase
      .from('bot_notification_events')
      .insert({
        event_type: eventType,
        entity_id: String(entityId),
        recipient_telegram_id: telegramId,
      })

    if (!error) {
      memoryClaims.add(key)
      return true
    }

    if (error.code === '23505') {
      memoryClaims.add(key) // another instance claimed it, cache the failure
      return false
    }

    if (!warnedAboutNotificationTable) {
      warnedAboutNotificationTable = true
      console.warn(
        'bot_notification_events table is unavailable; using in-memory notification dedupe until restart.',
        error.message
      )
    }

    memoryClaims.add(key)
    return true
  }

  // ==========================================
  // 1. LESSON REMINDERS (Runs every 15 mins)
  // ==========================================
  startSafeInterval('Lesson reminder cron', async () => {
    try {
      const now = new Date()
      // Look for sessions starting between 45 to 60 minutes from now
      const startWindow = new Date(now.getTime() + 45 * 60000)
      const endWindow = new Date(now.getTime() + 60 * 60000)

      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id, scheduled_at,
          group:groups (
            id, name,
            group_members (
              student:users!group_members_student_id_fkey (
                telegram_id, language, lesson_reminders_enabled
              )
            )
          )
        `)
        .gte('scheduled_at', startWindow.toISOString())
        .lt('scheduled_at', endWindow.toISOString())
        .eq('status', 'upcoming')

      if (error) throw error

      for (const session of sessions || []) {
        const timeStr = new Date(session.scheduled_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
        const groupName = escapeHtml(session.group?.name || 'Guruh')
        
        for (const member of session.group?.group_members || []) {
          const student = member.student
          if (student?.telegram_id && student?.lesson_reminders_enabled !== false) {
            try {
              const lang = student.language || 'uz'
              const text = t(lang, 'lesson_reminder', groupName, timeStr)
              
              const claimed = await claimNotification('lesson_reminder', session.id, student.telegram_id)
              if (!claimed) continue

              await bot.sendMessage(student.telegram_id, text, { parse_mode: 'HTML' })
            } catch (err) {
              console.error(`Failed to send lesson reminder to ${student.telegram_id}:`, err.message)
            }
          }
        }
      }
    } catch (err) {
      console.error('Lesson reminder cron error:', err.message)
    }
  }, 15 * 60000) // Every 15 mins

  // ==========================================
  // 2. PAYMENT ALERTS (Runs daily, checked every hour to run at 10:00)
  // ==========================================
  let lastPaymentAlertDate = null

  startSafeInterval('Payment alert cron', async () => {
    try {
      const now = new Date()
      const hour = now.getHours()
      const todayDateStr = now.toDateString()

      // Only run at 10:00 AM once a day
      if (hour !== 10 || lastPaymentAlertDate === todayDateStr) return

      const dayOfMonth = now.getDate()

      // Alert schedule: Days 1, 4, 7, 14, 21, 28
      const alertDays = [1, 4, 7, 14, 21, 28]
      if (!alertDays.includes(dayOfMonth)) return

      const month = now.getMonth() + 1
      const year = now.getFullYear()

      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id, amount, status,
          group:groups(name),
          student:users!payments_student_id_fkey(id, telegram_id, language, payment_alerts_enabled, first_name, last_name)
        `)
        .eq('period_month', month)
        .eq('period_year', year)
        .in('status', ['unpaid', 'partial'])
        .gt('amount', 0)

      if (error) throw error

      for (const payment of payments || []) {
        const student = payment.student
        if (!student) continue

        // 1. Send to student
        if (student.telegram_id && student.payment_alerts_enabled !== false) {
          let text = `💳 <b>To'lov eslatmasi:</b>\n\nSizning joriy oydagi (<b>${month}-${year}</b>) to'lovingiz amalga oshirilmagan.\n`
          text += `Guruh: <b>${escapeHtml(payment.group?.name || 'Guruh')}</b>\n`
          text += `Summa: <b>${payment.amount} UZS</b>\n\n`
          text += `Iltimos, to'lovni o'z vaqtida amalga oshirishni unutmang!`

          try {
            const claimed = await claimNotification(
              'payment_alert',
              `${payment.id}:${year}:${month}:${dayOfMonth}`,
              student.telegram_id
            )
            if (claimed) {
              await bot.sendMessage(student.telegram_id, text, { parse_mode: 'HTML' })
            }
          } catch (err) {
            console.error(`Failed to send payment alert to ${student.telegram_id}:`, err.message)
          }
        }

        // 2. Send to parents
        try {
          const { data: parents } = await supabase
            .from('parent_relations')
            .select('parent:users!parent_id(telegram_id, language)')
            .eq('student_id', student.id)

          if (parents && parents.length > 0) {
            const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Talaba'
            const groupName = payment.group?.name || 'Guruh'
            const amountStr = payment.amount.toLocaleString('ru-RU')

            for (const p of parents) {
              const parentUser = p.parent
              if (parentUser?.telegram_id) {
                try {
                  const claimedParent = await claimNotification(
                    'parent_payment_alert',
                    `${payment.id}:${year}:${month}:${dayOfMonth}`,
                    parentUser.telegram_id
                  )
                  if (claimedParent) {
                    const lang = parentUser.language || 'uz'
                    const parentMsg = t(lang, 'parent_payment_alert', studentName, amountStr, groupName)
                    await bot.sendMessage(parentUser.telegram_id, parentMsg, { parse_mode: 'HTML' })
                  }
                } catch (err) {
                  console.error(`Failed to send payment alert to parent ${parentUser.telegram_id}:`, err.message)
                }
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch/notify parents for payment ${payment.id}:`, err.message)
        }
      }


      lastPaymentAlertDate = todayDateStr
    } catch (err) {
      console.error('Payment alert cron error:', err.message)
    }
  }, 60 * 60000) // Check every hour

  // ==========================================
  // 3. SUBSCRIPTION EXPIRATION ALERTS (Runs every hour)
  // ==========================================
  startSafeInterval('Subscription alert cron', async () => {
    try {
      const now = new Date()
      const warningWindow = new Date()
      warningWindow.setDate(now.getDate() + 3) // 3 days from now

      // 1. Check for expired subscriptions
      const { data: expiredSubs, error: expError } = await supabase
        .from('subscriptions')
        .select('id, teacher_id, teacher:users(telegram_id, language)')
        .in('status', ['active', 'trial'])
        .lt('expires_at', now.toISOString())

      if (!expError && expiredSubs) {
        for (const sub of expiredSubs) {
          await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id)
          if (sub.teacher?.telegram_id) {
            const lang = sub.teacher.language || 'uz'
            const text = t(lang, 'sub_expired')
            await bot.sendMessage(sub.teacher.telegram_id, text, { parse_mode: 'HTML' })
          }
        }
      }

      // 2. Warn for subscriptions expiring in exactly 3 days
      const { data: warningSubs, error: warnError } = await supabase
        .from('subscriptions')
        .select('id, expires_at, teacher_id, teacher:users(telegram_id, language)')
        .in('status', ['active', 'trial'])
        .gt('expires_at', now.toISOString())
        .lt('expires_at', warningWindow.toISOString())

      if (!warnError && warningSubs) {
        for (const sub of warningSubs) {
          if (sub.teacher?.telegram_id) {
            const claimed = await claimNotification('sub_warning', sub.id, sub.teacher.telegram_id)
            if (claimed) {
              const lang = sub.teacher.language || 'uz'
              const dateStr = new Date(sub.expires_at).toLocaleDateString('uz-UZ')
              const text = t(lang, 'sub_warning', dateStr)
              await bot.sendMessage(sub.teacher.telegram_id, text, { parse_mode: 'HTML' })
            }
          }
        }
      }

    } catch (err) {
      console.error('Subscription cron error:', err.message)
    }
  }, 60 * 60000) // Check every hour

  // ==========================================
  // 4. AUTO BILLING (Runs hourly; creates monthly payment rows on billing day)
  // ==========================================
  startSafeInterval('Auto billing cron', async () => {
    await runAutoBilling(bot, supabase, claimNotification)
  }, 60 * 60000)

  // ==========================================
  // 5. HOMEWORK DEADLINE REMINDERS (Runs hourly)
  // ==========================================
  startSafeInterval('Homework deadline reminder cron', async () => {
    await runHwDeadlineReminder(bot, supabase, claimNotification)
  }, 60 * 60000)

  // ==========================================
  // 6. POST LESSON NOTIFICATIONS (Runs every 30 mins)
  // ==========================================
  startSafeInterval('Post Lesson Notification', async () => {
    await runPostLessonNotification(bot, supabase, claimNotification)
  }, 30 * 60000)

  // ==========================================
  // 7. GAMIFICATION BADGES AND SCHEDULE GENERATION (Runs daily)
  // ==========================================
  startSafeInterval('Award Badges', async () => {
    await runAwardBadges(bot, supabase, claimNotification)
    await runGenerateSessions(supabase)
  }, 24 * 60 * 60000)
}
