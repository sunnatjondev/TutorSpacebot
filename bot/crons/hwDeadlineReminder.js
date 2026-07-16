import { t } from '../i18n.js'

export async function runHwDeadlineReminder(bot, supabase, claimNotification) {
  try {
    const now = new Date()
    // Look for homework due in the next 12 to 24 hours
    const startWindow = new Date(now.getTime() + 12 * 3600000)
    const endWindow = new Date(now.getTime() + 24 * 3600000)

    const { data: homeworks, error } = await supabase
      .from('homework')
      .select(`
        id, title, due_at,
        group:groups (
          id, name,
          group_members (
            student:users!group_members_student_id_fkey(id, telegram_id, language)
          )
        )
      `)
      .gte('due_at', startWindow.toISOString())
      .lt('due_at', endWindow.toISOString())

    if (error) throw error

    for (const hw of homeworks || []) {
      for (const member of hw.group?.group_members || []) {
        const student = member.student
        if (!student?.telegram_id) continue

        // Check if student already submitted this homework
        const { data: submission } = await supabase
          .from('homework_submissions')
          .select('status')
          .eq('homework_id', hw.id)
          .eq('student_id', student.id)
          .maybeSingle()

        if (submission && submission.status === 'done') continue

        // Send reminder
        const claimed = await claimNotification('hw_reminder', hw.id, student.telegram_id)
        if (!claimed) continue

        const lang = student.language || 'uz'
        const msg = t(lang, 'hw_reminder', hw.title || 'Vazifa')
        bot.sendMessage(student.telegram_id, msg).catch(() => {})
      }
    }
  } catch (error) {
    console.error('HW deadline reminder error:', error.message)
  }
}
