import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setBot } from './bot.js'
import { supabase, requireServiceSupabase } from './db.js'
import { hasSupabase, config } from './config.js'
import { startCronJobs } from './cron.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env') })
dotenv.config({ path: path.resolve(__dirname, '../bot.env') })

const BOT_TOKEN = process.env.BOT_TOKEN
const BOT_USERNAME = process.env.BOT_USERNAME || '@tutorspace_app_bot'
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://tutorspace-app.loca.lt'
const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID || process.env.VITE_ADMIN_TELEGRAM_ID || 0)

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required. Add it to bot/.env or ../bot.env before starting the bot.')
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true })

import { startApiServer } from './server.js'
import { escapeHtml, escapeMarkdown, escapeMarkdownV2, buildTelegramUserPayload } from './helpers.js'
import { t } from './i18n.js'

console.log(`TutorSpace Bot ${BOT_USERNAME} is running`)
console.log('Mini App URL:', WEBAPP_URL)
console.log('Supabase:', hasSupabase ? config.SUPABASE_URL : 'disabled')

startCronJobs(bot, supabase)
setBot(bot)

bot.setMyCommands([
  { command: 'start', description: '🚀 Open TutorSpace App / Ilovani ochish' },
  { command: 'schedule', description: '📅 Schedule & Lessons / Darslar jadvali' },
  { command: 'stats', description: '📊 Statistics / Statistika' },
  { command: 'myref', description: '🔗 Referral program / Referal havola' },
  { command: 'setlang', description: '🌐 Change language / Tilni o\'zgartirish' },
  { command: 'help', description: '❓ Help / Yordam' },
]).catch((e) => console.error('setMyCommands error:', e.message))

async function updatePlanPrices() {
  if (!supabase) return
  try {
    await supabase.from('subscription_plans').update({ price_uzs: config.SOLO_PLAN_PRICE_UZS }).eq('slug', 'solo')
    await supabase.from('subscription_plans').update({ price_uzs: config.CENTER_PLAN_PRICE_UZS }).eq('slug', 'center')
    console.log(`Sync: Updated subscription plan prices in Supabase (Solo=${config.SOLO_PLAN_PRICE_UZS}, Center=${config.CENTER_PLAN_PRICE_UZS})`)
  } catch (e) {
    console.error('Sync: Error updating plan prices:', e)
  }
}
updatePlanPrices()

startApiServer()

async function getUserRow(telegramId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, role, first_name, language')
      .eq('telegram_id', telegramId)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  } catch (err) {
    console.error('getUserRow error:', err)
    return null
  }
}

function sendStatsUnavailable(chatId, lang = 'uz') {
  return bot.sendMessage(chatId, t(lang, 'stats_unavailable'))
}

async function sendAppButton(chatId, firstName, lang = 'uz') {
  const name = escapeHtml(firstName || 'User')
  return bot.sendMessage(chatId, t(lang, 'welcome_app', name), {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: t(lang, 'open_app'), web_app: { url: WEBAPP_URL } }]],
    },
  })
}

bot.onText(/\/start/, async (msg) => {
  const chat = msg.chat
  const user = msg.from
  const text = msg.text || ''
  
  let userRow = await getUserRow(user.id)
  const lang = userRow?.language || 'uz'

  const parts = text.split(' ')
  const startParam = parts.length > 1 ? parts[1] : null

  if (startParam && startParam.startsWith('invite_') && supabase) {
    const inviteToken = startParam.replace('invite_', '')

    try {
      const { data: group } = await supabase
        .from('groups')
        .select('id, name, teacher_id')
        .eq('invite_token', inviteToken)
        .maybeSingle()

      if (!group) {
        await bot.sendMessage(chat.id, t(lang, 'not_found_invite'))
        return
      }

      if (!userRow) {
        const { data: newUser } = await supabase
          .from('users')
          .upsert({ ...buildTelegramUserPayload(user), role: 'student' }, { onConflict: 'telegram_id' })
          .select()
          .single()
        userRow = newUser
      }

      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('student_id', userRow.id)
        .maybeSingle()

      if (!existingMember) {
        await supabase.from('group_members').insert({ group_id: group.id, student_id: userRow.id })
      }

      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()

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
          status: 'unpaid'
        })
      }

      await bot.sendMessage(chat.id, t(lang, 'welcome_student', userRow.first_name, escapeHtml(group.name)), {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: t(lang, 'open_app'), web_app: { url: WEBAPP_URL } }]],
        },
      })
      return
    } catch (err) {
      await bot.sendMessage(chat.id, t(lang, 'error_occurred'))
      return
    }
  }

  if (startParam && startParam.startsWith('parent_') && supabase) {
    const token = startParam.replace('parent_', '')

    try {
      if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
        throw new Error('Invalid parent invitation')
      }

      const now = new Date().toISOString()
      const { data: invite, error: inviteError } = await supabase
        .from('parent_invites')
        .select('token, student_id, student:users!student_id(id, first_name, last_name, telegram_id)')
        .eq('token', token)
        .is('claimed_at', null)
        .gt('expires_at', now)
        .maybeSingle()

      if (inviteError) throw inviteError
      if (!invite?.student) throw new Error('Parent invitation is invalid or expired')
      if (Number(invite.student.telegram_id) === Number(user.id)) {
        const error = new Error('A student cannot claim their own parent invitation')
        error.userMessageKey = 'parent_invite_same_account'
        throw error
      }

      if (!userRow) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .upsert({ ...buildTelegramUserPayload(user), role: 'parent' }, { onConflict: 'telegram_id' })
          .select()
          .single()
        if (createError) throw createError
        userRow = newUser
      } else if (!userRow.role) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ role: 'parent' })
          .eq('id', userRow.id)
          .select()
          .single()
        if (updateError) throw updateError
        userRow = updatedUser
      } else if (userRow.role !== 'parent') {
        const error = new Error('This Telegram account already has another role')
        error.userMessageKey = 'parent_invite_role_conflict'
        throw error
      }

      const { data: claimedInvite, error: claimError } = await supabase
        .from('parent_invites')
        .update({ claimed_at: now, claimed_by: userRow.id })
        .eq('token', token)
        .is('claimed_at', null)
        .gt('expires_at', now)
        .select('student_id')
        .maybeSingle()
      if (claimError) throw claimError
      if (!claimedInvite) throw new Error('Parent invitation is invalid or already used')

      const { error: relationError } = await supabase
        .from('parent_relations')
        .upsert({ parent_id: userRow.id, student_id: claimedInvite.student_id }, { onConflict: 'parent_id,student_id' })
      if (relationError) throw relationError

      const studentName = `${invite.student.first_name} ${invite.student.last_name || ''}`.trim()
      await bot.sendMessage(chat.id, t(lang, 'parent_welcome', studentName), {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: t(lang, 'open_app'), web_app: { url: WEBAPP_URL } }]],
        },
      })
      return
    } catch (err) {
      console.error('Parent invitation error:', err.message)
      await bot.sendMessage(chat.id, t(lang, err.userMessageKey || 'error_occurred'))
      return
    }
  }


  try {
    if (supabase) {
      await supabase.from('users').upsert(
        buildTelegramUserPayload(user),
        { onConflict: 'telegram_id', ignoreDuplicates: false }
      )
    }
  } catch (error) {
    console.error('Failed to upsert user on /start:', error)
  }

  await sendAppButton(chat.id, user.first_name, lang)
})

bot.onText(/\/help/, async (msg) => {
  const userRow = await getUserRow(msg.from.id)
  const lang = userRow?.language || 'uz'
  await bot.sendMessage(msg.chat.id, t(lang, 'help'), { parse_mode: 'Markdown' })
})

bot.onText(/\/stats/, async (msg) => {
  const user = await getUserRow(msg.from.id)
  const lang = user?.language || 'uz'

  if (!supabase) return sendStatsUnavailable(msg.chat.id, lang)
  if (!user) return bot.sendMessage(msg.chat.id, t(lang, 'start_first'))

  if (user.role === 'teacher') {
    const { data: groups } = await supabase.from('groups').select('id, name, group_members(count)').eq('teacher_id', user.id)
    if (!groups?.length) return bot.sendMessage(msg.chat.id, t(lang, 'no_groups'))

    let text = t(lang, 'stats_title', escapeMarkdown(user.first_name))
    let totalStudents = 0
    groups.forEach((group) => {
      const count = group.group_members?.[0]?.count || 0
      totalStudents += Number(count)
      text += t(lang, 'stats_group', escapeMarkdown(group.name), count)
    })
    text += t(lang, 'stats_total', totalStudents, groups.length)
    return bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' })
  }

  const { data: attendance } = await supabase.from('attendance').select('present').eq('student_id', user.id)
  const total = attendance?.length || 0
  const present = attendance?.filter((item) => item.present).length || 0
  const pct = total > 0 ? Math.round((present / total) * 100) : 0

  return bot.sendMessage(msg.chat.id, t(lang, 'stats_student', escapeMarkdown(user.first_name), pct, total), { parse_mode: 'Markdown' })
})

bot.onText(/\/(schedule|jadval|raspisanie|darslar)/, async (msg) => {
  const user = await getUserRow(msg.from.id)
  const lang = user?.language || 'uz'
  const isRu = lang === 'ru'

  if (!supabase) return sendStatsUnavailable(msg.chat.id, lang)
  if (!user) return bot.sendMessage(msg.chat.id, t(lang, 'start_first'))

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const weekEnd = new Date(todayStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  weekEnd.setHours(23, 59, 59, 999)

  try {
    if (user.role === 'teacher') {
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, subject')
        .eq('teacher_id', user.id)

      if (groupsError) throw groupsError
      if (!groups?.length) {
        return bot.sendMessage(msg.chat.id, isRu ? 'У вас пока нет групп.' : 'Sizda hali guruhlar yo\'q.', {
          reply_markup: {
            inline_keyboard: [[{ text: isRu ? '➕ Создать группу' : '➕ Guruh yaratish', web_app: { url: WEBAPP_URL } }]],
          },
        })
      }

      const groupIds = groups.map((g) => g.id)

      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, scheduled_at, duration_min, status, group:groups(name, subject)')
        .in('group_id', groupIds)
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', weekEnd.toISOString())
        .neq('status', 'cancelled')
        .order('scheduled_at')

      if (sessionsError) throw sessionsError

      const todaySessions = (sessions || []).filter((s) => {
        const d = new Date(s.scheduled_at)
        return d >= todayStart && d <= todayEnd
      })

      const upcomingSessions = (sessions || []).filter((s) => {
        const d = new Date(s.scheduled_at)
        return d > todayEnd
      })

      let text = isRu ? '📅 <b>Расписание занятий</b>\n\n' : '📅 <b>Darslar jadvali</b>\n\n'

      if (todaySessions.length > 0) {
        text += isRu ? '<b>Сегодня:</b>\n' : '<b>Bugun:</b>\n'
        todaySessions.forEach((s) => {
          const time = new Date(s.scheduled_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          const groupName = escapeHtml(s.group?.name || 'Guruh')
          const subject = s.group?.subject ? ` (${escapeHtml(s.group.subject)})` : ''
          const statusIcon = s.status === 'done' ? '✅' : s.status === 'ongoing' ? '🟡' : '⏳'
          text += `• <b>${time}</b> — ${groupName}${subject} ${statusIcon}\n`
        })
        text += '\n'
      } else {
        text += isRu ? '<i>Сегодня занятий нет.</i>\n\n' : '<i>Bugun darslar rejalashtirilmagan.</i>\n\n'
      }

      if (upcomingSessions.length > 0) {
        text += isRu ? '<b>Ближайшие уроки на этой неделе:</b>\n' : '<b>Hafta davomidagi yaqin darslar:</b>\n'
        upcomingSessions.slice(0, 5).forEach((s) => {
          const d = new Date(s.scheduled_at)
          const dateStr = d.toLocaleDateString(isRu ? 'ru-RU' : 'uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' })
          const time = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          const groupName = escapeHtml(s.group?.name || 'Guruh')
          text += `• <b>${dateStr}, ${time}</b> — ${groupName}\n`
        })
      }

      return bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: isRu ? '📱 Открыть расписание в приложении' : '📱 Ilovada jadvalni ochish', web_app: { url: WEBAPP_URL } }]],
        },
      })
    } else {
      // Student / Parent
      const { data: memberships, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('student_id', user.id)

      if (memberError) throw memberError
      const groupIds = (memberships || []).map((m) => m.group_id)

      if (!groupIds.length) {
        return bot.sendMessage(msg.chat.id, isRu ? 'Вы пока не добавлены ни в одну группу.' : 'Siz hali hech qaysi guruhga qo\'shilmagansiz.', {
          reply_markup: {
            inline_keyboard: [[{ text: isRu ? '📱 Открыть TutorSpace' : '📱 TutorSpace ilovasi', web_app: { url: WEBAPP_URL } }]],
          },
        })
      }

      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, scheduled_at, duration_min, status, group:groups(name, subject, teacher:users!groups_teacher_id_fkey(first_name, last_name))')
        .in('group_id', groupIds)
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', weekEnd.toISOString())
        .neq('status', 'cancelled')
        .order('scheduled_at')

      if (sessionsError) throw sessionsError

      const todaySessions = (sessions || []).filter((s) => {
        const d = new Date(s.scheduled_at)
        return d >= todayStart && d <= todayEnd
      })

      const upcomingSessions = (sessions || []).filter((s) => {
        const d = new Date(s.scheduled_at)
        return d > todayEnd
      })

      let text = isRu ? '📅 <b>Ваше расписание уроков</b>\n\n' : '📅 <b>Sizning darslar jadvalingiz</b>\n\n'

      if (todaySessions.length > 0) {
        text += isRu ? '<b>Сегодня:</b>\n' : '<b>Bugun:</b>\n'
        todaySessions.forEach((s) => {
          const time = new Date(s.scheduled_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          const groupName = escapeHtml(s.group?.name || s.group?.subject || 'Dars')
          const teacherName = s.group?.teacher ? ` (${escapeHtml(s.group.teacher.first_name || '')})` : ''
          text += `• <b>${time}</b> — ${groupName}${teacherName}\n`
        })
        text += '\n'
      } else {
        text += isRu ? '<i>Сегодня уроков нет.</i>\n\n' : '<i>Bugun darslar yo\'q.</i>\n\n'
      }

      if (upcomingSessions.length > 0) {
        text += isRu ? '<b>Ближайшие уроки:</b>\n' : '<b>Yaqin darslar:</b>\n'
        upcomingSessions.slice(0, 5).forEach((s) => {
          const d = new Date(s.scheduled_at)
          const dateStr = d.toLocaleDateString(isRu ? 'ru-RU' : 'uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' })
          const time = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          const groupName = escapeHtml(s.group?.name || s.group?.subject || 'Dars')
          text += `• <b>${dateStr}, ${time}</b> — ${groupName}\n`
        })
      }

      return bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: isRu ? '📱 Открыть расписание' : '📱 Jadvalni ochish', web_app: { url: WEBAPP_URL } }]],
        },
      })
    }
  } catch (err) {
    console.error('Schedule command error:', err.message)
    return bot.sendMessage(msg.chat.id, t(lang, 'error_occurred'))
  }
})

bot.onText(/\/myref/, async (msg) => {
  const user = await getUserRow(msg.from.id)
  const lang = user?.language || 'uz'
  
  if (user?.role !== 'teacher') {
    return bot.sendMessage(msg.chat.id, lang === 'ru' ? 'Эта команда доступна только учителям.' : 'Bu buyruq faqat o\'qituvchilar uchun mavjud.')
  }

  const link = `https://t.me/${BOT_USERNAME.replace('@', '')}/app?startapp=ref_${msg.from.id}`
  const text = lang === 'ru'
    ? `🔗 *Ваша реферальная ссылка:*\n\n\`${link}\`\n\nПриглашайте коллег и получайте +7 дней к подписке!`
    : `🔗 *Sizning referal havolangiz:*\n\n\`${link}\`\n\nHamkasblarni taklif qiling va obunangizga +7 kun qo'shib oling!`;
    
  return bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' })
})

bot.onText(/\/setlang/, async (msg) => {
  const userRow = await getUserRow(msg.from.id)
  const lang = userRow?.language || 'uz'
  await bot.sendMessage(msg.chat.id, t(lang, 'select_lang'), {
    reply_markup: {
      inline_keyboard: [[
        { text: '🇺🇿 O\'zbek', callback_data: 'lang_uz' },
        { text: '🇷🇺 Русский', callback_data: 'lang_ru' },
      ]],
    },
  })
})

bot.on('callback_query', async (query) => {
  const { data, from, message } = query
  const userRow = await getUserRow(from.id)
  const lang = userRow?.language || 'uz'

  if (data?.startsWith('p2p_paid_')) {
    const txId = data.replace('p2p_paid_', '')
    try {
      requireServiceSupabase()
      await supabase.from('billing_transactions').update({ status: 'preparing' }).eq('id', txId)
      const { data: tx } = await supabase.from('billing_transactions').select('*, teacher:users!billing_transactions_teacher_id_fkey(first_name, last_name, telegram_id, language)').eq('id', txId).single()
      if (!tx) return
      await bot.answerCallbackQuery(query.id, { text: t(tx.teacher?.language || 'uz', 'admin_review'), show_alert: true })
      
      if (ADMIN_TELEGRAM_ID) {
        const adminText = `📝 *Yangi to'lov so'rovi!*\n\nO'qituvchi: [${tx.teacher?.first_name || 'Ismsiz'}](tg://user?id=${tx.teacher?.telegram_id})\nSumma: *${tx.amount.toLocaleString('ru-RU')} UZS*\n\nIltimos, kartangizni tekshiring va tasdiqlang.`
        await bot.sendMessage(ADMIN_TELEGRAM_ID, adminText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Tasdiqlash', callback_data: `p2p_approve_${tx.id}` },
              { text: '❌ Bekor qilish', callback_data: `p2p_reject_${tx.id}` }
            ]]
          }
        })
      }
    } catch (e) { console.error('Payment callback error:', e) }
    return
  }

  if (data?.startsWith('p2p_approve_')) {
    const txId = data.replace('p2p_approve_', '')
    try {
      if (from.id !== ADMIN_TELEGRAM_ID) return bot.answerCallbackQuery(query.id, { text: 'Siz admin emassiz!', show_alert: true })
      requireServiceSupabase()
      const { data: tx } = await supabase.from('billing_transactions').select('*, teacher:users!billing_transactions_teacher_id_fkey(telegram_id, language)').eq('id', txId).single()
      if (!tx || tx.status === 'paid') return
      
      await supabase.from('billing_transactions').update({ status: 'paid', completed_at: new Date().toISOString() }).eq('id', txId)

      const { data: sub } = await supabase.from('subscriptions').select('id, expires_at').eq('id', tx.subscription_id).single()
      if (sub) {
        let newExpires = new Date()
        const currentExpires = new Date(sub.expires_at)
        if (currentExpires > newExpires) newExpires = currentExpires
        newExpires.setDate(newExpires.getDate() + 30)
        let targetPlanId = tx.merchant_prepare_id
        if (!targetPlanId) {
          const { data: fallbackPlan } = await supabase.from('subscription_plans').select('id').eq('price_uzs', tx.amount).limit(1).single()
          if (fallbackPlan) targetPlanId = fallbackPlan.id
        }
        const updatePayload = { status: 'active', expires_at: newExpires.toISOString() }
        if (targetPlanId) updatePayload.plan_id = targetPlanId
        await supabase.from('subscriptions').update(updatePayload).eq('id', sub.id)
      }

      await bot.answerCallbackQuery(query.id, { text: 'To\'lov tasdiqlandi!' })
      await bot.editMessageText(message.text + '\n\n✅ TASDIQLANDI', { chat_id: message.chat.id, message_id: message.message_id })
      await bot.sendMessage(tx.teacher.telegram_id, t(tx.teacher.language || 'uz', 'admin_approved'), { parse_mode: 'Markdown' })
    } catch (e) { console.error('Payment callback error:', e) }
    return
  }

  if (data?.startsWith('p2p_reject_')) {
    const txId = data.replace('p2p_reject_', '')
    try {
      if (from.id !== ADMIN_TELEGRAM_ID) return bot.answerCallbackQuery(query.id, { text: 'Siz admin emassiz!', show_alert: true })
      requireServiceSupabase()
      const { data: tx } = await supabase.from('billing_transactions').select('*, teacher:users!billing_transactions_teacher_id_fkey(telegram_id, language)').eq('id', txId).single()
      if (!tx) return
      
      await supabase.from('billing_transactions').update({ status: 'cancelled' }).eq('id', txId)
      await bot.answerCallbackQuery(query.id, { text: 'To\'lov bekor qilindi' })
      await bot.editMessageText(message.text + '\n\n❌ BEKOR QILINDI', { chat_id: message.chat.id, message_id: message.message_id })
      await bot.sendMessage(tx.teacher.telegram_id, t(tx.teacher.language || 'uz', 'admin_rejected'), { parse_mode: 'Markdown' })
    } catch (e) { console.error('Payment callback error:', e) }
    return
  }

  if (data?.startsWith('lang_')) {
    const newLang = data.replace('lang_', '')
    try {
      if (supabase) await supabase.from('users').update({ language: newLang }).eq('telegram_id', from.id)
      const label = t(newLang, 'lang_saved')
      await bot.answerCallbackQuery(query.id, { text: label })
      if (message) await bot.editMessageText(label, { chat_id: message.chat.id, message_id: message.message_id })
    } catch (error) {
      await bot.answerCallbackQuery(query.id, { text: t(lang, 'lang_error'), show_alert: true })
    }
  }
})

bot.on('web_app_data', async (msg) => {
  try {
    const data = JSON.parse(msg.web_app_data.data)
    const userRow = await getUserRow(msg.from.id)
    const lang = userRow?.language || 'uz'

    if (data.action === 'set_role') {
      const requestedRole = data.role === 'teacher' && Number(msg.from.id) === ADMIN_TELEGRAM_ID ? 'teacher' : 'student'
      if (supabase) await supabase.from('users').update({ role: requestedRole, updated_at: new Date().toISOString() }).eq('telegram_id', msg.from.id)
      const roleLabel = requestedRole === 'teacher' ? t(lang, 'teacher') : t(lang, 'student')
      await bot.sendMessage(msg.chat.id, t(lang, 'role_saved', roleLabel), { parse_mode: 'Markdown' })
    }

    if (data.action === 'payment_reminder') {
      await bot.sendMessage(msg.chat.id, t(lang, 'payment_reminder', data.studentName), { parse_mode: 'Markdown' })
    }
  } catch (error) {
    console.error('web_app_data error:', error)
  }
})

bot.on('pre_checkout_query', async (query) => {
  if (!supabase) return bot.answerPreCheckoutQuery(query.id, false, { error_message: 'Service unavailable' })
  try {
    const txId = query.invoice_payload
    const { data: tx } = await supabase.from('billing_transactions').select('id, status').eq('id', txId).single()
    if (!tx || tx.status !== 'pending') return bot.answerPreCheckoutQuery(query.id, false, { error_message: "To'lov allaqachon qabul qilingan yoki bekor qilingan." })
    await bot.answerPreCheckoutQuery(query.id, true)
  } catch (error) {
    await bot.answerPreCheckoutQuery(query.id, false, { error_message: "Tizimda xatolik yuz berdi. Iltimos keyinroq urinib ko'ring." })
  }
})

bot.on('successful_payment', async (msg) => {
  try {
    const payment = msg.successful_payment
    const txId = payment.invoice_payload
    const { data: tx } = await supabase.from('billing_transactions').select('id, subscription_id, status').eq('id', txId).single()
    if (!tx || tx.status === 'paid') return

    await supabase.from('billing_transactions').update({ status: 'paid', completed_at: new Date().toISOString(), click_trans_id: payment.provider_payment_charge_id }).eq('id', txId)
    const { data: sub } = await supabase.from('subscriptions').select('id, expires_at').eq('id', tx.subscription_id).single()
    
    if (sub) {
      let newExpires = new Date()
      const currentExpires = new Date(sub.expires_at)
      if (currentExpires > newExpires) newExpires = currentExpires
      newExpires.setDate(newExpires.getDate() + 30)
      await supabase.from('subscriptions').update({ status: 'active', expires_at: newExpires.toISOString() }).eq('id', sub.id)
    }

    const userRow = await getUserRow(msg.from.id)
    const lang = userRow?.language || 'uz'
    await bot.sendMessage(msg.chat.id, t(lang, 'subscription_active'), { parse_mode: 'Markdown' })
  } catch (error) {
    console.error('successful_payment error:', error)
  }
})

bot.on('polling_error', (error) => {
  if (error.code !== 'ETELEGRAM' || !error.message?.includes('409')) {
    console.error('Polling error:', error.code, error.message?.slice(0, 160))
  }
})

process.on('SIGINT', () => { bot.stopPolling(); process.exit(0) })
process.on('SIGTERM', () => { bot.stopPolling(); process.exit(0) })
process.on('unhandledRejection', (error) => console.error('Unhandled promise rejection:', error))
