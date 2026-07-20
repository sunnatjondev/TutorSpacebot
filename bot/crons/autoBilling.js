import { t } from '../i18n.js'

export async function runAutoBilling(bot, supabase, claimNotification) {
  try {
    const today = new Date()
    const dayOfMonth = today.getDate()
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()

    // Find active groups where billing_day = today (null billing_day means 1st of month by default, but let's assume they set it)
    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        id, name, teacher_id, billing_day, price_per_month,
        group_members (
          student:users!group_members_student_id_fkey(id, telegram_id, language, first_name, last_name)
        )
      `)
      .not('price_per_month', 'is', null)

    if (error) throw error

    for (const group of groups || []) {
      const bDay = group.billing_day || 1
      if (bDay !== dayOfMonth) continue

      const amount = group.price_per_month || 0
      if (amount <= 0) continue

      for (const member of group.group_members || []) {
        const student = member.student
        if (!student) continue

        // Check if payment already exists for this month/year
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('student_id', student.id)
          .eq('group_id', group.id)
          .eq('period_month', currentMonth)
          .eq('period_year', currentYear)
          .maybeSingle()

        if (!existingPayment) {
          // Prevent double insertion using claim (using eventType 'auto_bill_create')
          const claimed = await claimNotification('auto_bill_create', `${group.id}_${currentMonth}_${currentYear}`, student.id)
          if (!claimed) continue

          const { error: insertError } = await supabase.from('payments').insert({
            student_id: student.id,
            group_id: group.id,
            teacher_id: group.teacher_id,
            amount,
            period_month: currentMonth,
            period_year: currentYear,
            status: 'unpaid'
          })

          if (!insertError) {
            // Notify student
            if (student.telegram_id) {
              const lang = student.language || 'uz'
              const msg = t(lang, 'auto_billed', amount.toLocaleString('ru-RU'), group.name)
              bot.sendMessage(student.telegram_id, msg).catch(() => {})
            }

            // Notify parents
            try {
              const { data: parents } = await supabase
                .from('parent_relations')
                .select('parent:users!parent_id(telegram_id, language)')
                .eq('student_id', student.id)

              if (parents && parents.length > 0) {
                const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Talaba'
                const groupName = group.name
                const amountStr = amount.toLocaleString('ru-RU')

                for (const p of parents) {
                  const parentUser = p.parent
                  if (parentUser?.telegram_id) {
                    try {
                      const claimedParent = await claimNotification(
                        'parent_payment_alert',
                        `${group.id}_${currentMonth}_${currentYear}_${student.id}`,
                        parentUser.telegram_id
                      )
                      if (claimedParent) {
                        const lang = parentUser.language || 'uz'
                        const parentMsg = t(lang, 'parent_payment_alert', studentName, amountStr, groupName)
                        await bot.sendMessage(parentUser.telegram_id, parentMsg, { parse_mode: 'HTML' })
                      }
                    } catch (err) {
                      console.error(`Failed to send payment alert to parent ${parentUser?.telegram_id}:`, err.message)
                    }
                  }
                }
              }
            } catch (notifyErr) {
              console.error('Failed to notify parents about auto billing:', notifyErr.message)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Auto billing error:', error.message)
  }
}
