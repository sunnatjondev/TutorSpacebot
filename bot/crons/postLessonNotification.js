import { t } from '../i18n.js'

export async function runPostLessonNotification(bot, supabase, claimNotification) {
  try {
    const now = new Date()

    // Find sessions that ended in the last 2 hours and have 'upcoming' status (which means teacher forgot to mark them done)
    // Actually, sessions don't have "ended_at", they have scheduled_at and duration_min.
    
    // We will find sessions where scheduled_at + duration_min < now
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id, scheduled_at, duration_min, status,
        group:groups (
          id, name,
          teacher:users!groups_teacher_id_fkey(telegram_id, language)
        )
      `)
      .eq('status', 'upcoming')

    if (error) throw error

    for (const session of sessions || []) {
      const scheduledAt = new Date(session.scheduled_at)
      const duration = session.duration_min || 90
      const endsAt = new Date(scheduledAt.getTime() + duration * 60000)

      // If the session ended more than 30 minutes ago
      if (now > new Date(endsAt.getTime() + 30 * 60000)) {
        const teacher = session.group?.teacher
        if (!teacher?.telegram_id) continue

        // Notify teacher to fill attendance
        const claimed = await claimNotification('post_lesson', session.id, teacher.telegram_id)
        if (!claimed) continue

        const lang = teacher.language || 'uz'
        const msg = lang === 'ru' 
          ? `Урок в группе "${session.group.name}" завершился. Не забудьте отметить посещаемость!` 
          : `"${session.group.name}" guruhida dars yakunlandi. Davomatni belgilashni unutmang!`
        
        bot.sendMessage(teacher.telegram_id, msg).catch(() => {})
      }
    }
  } catch (error) {
    console.error('Post-lesson notification error:', error.message)
  }
}
