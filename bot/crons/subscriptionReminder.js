import { t } from '../i18n.js'
import { config } from '../config.js'

export async function runSubscriptionReminder(bot, supabase, claimNotification) {
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
      .select('id, expires_at, teacher_id, auto_renew, teacher:users(telegram_id, language)')
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
            const appUrl = config.WEBAPP_URL || 'https://tutorspace-app.loca.lt'
            
            let text = t(lang, 'sub_warning', dateStr)
            
            // If they don't have auto renew enabled, remind them to renew
            if (!sub.auto_renew) {
                text += lang === 'ru' 
                    ? `\n\n⚠️ Нажмите кнопку ниже, чтобы продлить её в 1 клик.`
                    : `\n\n⚠️ Obunani uzaytirish uchun quyidagi tugmani bosing.`;
            } else {
                text += lang === 'ru'
                    ? `\n\n✅ У вас включено автопродление. Оплата будет списана автоматически.`
                    : `\n\n✅ Sizda avtomatik uzaytirish yoqilgan. To'lov avtomatik yechiladi.`;
            }

            try {
                await bot.sendMessage(sub.teacher.telegram_id, text, { 
                  parse_mode: 'HTML',
                  reply_markup: !sub.auto_renew ? {
                    inline_keyboard: [[{ 
                      text: lang === 'ru' ? '🔄 Продлить подписку' : '🔄 Obunani uzaytirish', 
                      web_app: { url: `${appUrl}/teacher/subscription` } 
                    }]]
                  } : undefined
                })
            } catch (err) {
                console.error(`runSubscriptionReminder failed to send warning to ${sub.teacher.telegram_id}`, err.message)
            }
          }
        }
      }
    }

  } catch (err) {
    console.error('Subscription cron error:', err.message)
  }
}
