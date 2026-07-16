import { supabase, requireServiceSupabase, requireUserRow, requireGroupOwner, requireGroupMember } from '../db.js'
import { checkTeacherSubscription } from './authService.js'
import { getBot } from '../bot.js'
import { config } from '../config.js'
export async function handlePaymentMarkPaid(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)

  // Verify the teacher owns the payment
  const { data: payment } = await supabase
    .from('payments')
    .select('id, teacher_id')
    .eq('id', body.paymentId)
    .maybeSingle()
  if (!payment) throw new Error('Payment not found')
  if (payment.teacher_id !== user.id) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      method: body.method || 'cash',
      note: body.note || '',
      paid_at: new Date().toISOString(),
    })
    .eq('id', body.paymentId)

  if (error) throw error
  return { ok: true }
}

export async function handlePaymentCreate(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  await requireGroupOwner(user.id, body.groupId)
  await requireGroupMember(body.studentId, body.groupId)

  const { data, error } = await supabase
    .from('payments')
    .insert({
      student_id: body.studentId,
      group_id: body.groupId,
      teacher_id: user.id,
      amount: body.amount,
      period_month: body.month,
      period_year: body.year || new Date().getFullYear(),
      status: 'unpaid',
    })
    .select('id, student_id, teacher_id, group_id, amount, status, period_month, period_year, created_at')
    .single()

  if (error) throw error
  return { ok: true, payment: data }
}

// ─── Student-side API ──────────────────────────────────────

export async function handleBillingCreateOrder(telegramUser, body) {
  requireServiceSupabase()
  const teacher = await requireUserRow(telegramUser)
  
  if (teacher.role !== 'teacher') throw new Error('Unauthorized')

  const planId = body.planId // e.g. 'solo'
  
  const { data: plan } = await supabase.from('subscription_plans').select('id, name_uz, name_ru, price_uzs').eq('slug', planId).maybeSingle()
  if (!plan) throw new Error('Invalid plan')
  
  const { data: sub } = await supabase.from('subscriptions').select('id').eq('teacher_id', teacher.id).maybeSingle()
  if (!sub) throw new Error('Subscription not found')

  const { data: tx, error } = await supabase.from('billing_transactions').insert({
    teacher_id: teacher.id,
    subscription_id: sub.id,
    amount: plan.price_uzs,
    status: 'pending',
    merchant_prepare_id: plan.id // Use this to store target plan ID
  }).select('id').single()

  if (error) throw error

  // Send message to teacher
  const cardNumber = config.PAYMENT_CARD_NUMBER
  const messageUz = `💳 *To'lov ma'lumotlari*\n\nTarif: *${plan.name_uz || 'Premium'}*\nSumma: *${plan.price_uzs.toLocaleString('ru-RU')} UZS*\nKarta: *${cardNumber}*\n\nIltimos, ushbu kartaga pul o'tkazing va quyidagi tugmani bosing:`
  const messageRu = `💳 *Реквизиты для оплаты*\n\nТариф: *${plan.name_ru || 'Premium'}*\nСумма: *${plan.price_uzs.toLocaleString('ru-RU')} UZS*\nКарта: *${cardNumber}*\n\nПожалуйста, переведите средства на эту карту и нажмите кнопку ниже:`

  const text = teacher.language === 'ru' ? messageRu : messageUz
  const btnText = teacher.language === 'ru' ? '✅ Я перевёл деньги' : '✅ Men pul o\'tkazdim'

  const bot = getBot()
  if (bot) {
    await bot.sendMessage(telegramUser.id, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: btnText, callback_data: `p2p_paid_${tx.id}` }
        ]]
      }
    })
  }
  
  return { ok: true, orderId: tx.id }
}

export async function handleBillingStatus(telegramUser) {
  requireServiceSupabase()
  const teacher = await requireUserRow(telegramUser)
  
  const subscription = await checkTeacherSubscription(teacher.id)
  
  return { ok: true, subscription }
}
