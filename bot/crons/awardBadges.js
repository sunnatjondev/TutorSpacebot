import { t } from '../i18n.js'

export async function runAwardBadges(bot, supabase, claimNotification) {
  try {
    // 1. Award Perfect Attendance Badge (5 sessions in a row)
    // We'll find students who have 5 consecutive 'true' in attendance and don't have 'streak_5' badge yet.
    
    // Fetch all students without 'streak_5' badge
    const { data: studentsWithoutStreak } = await supabase
      .from('users')
      .select(`
        id, telegram_id, language,
        student_badges (badge_type)
      `)
      .eq('role', 'student')
    
    if (studentsWithoutStreak) {
      for (const student of studentsWithoutStreak) {
        if (student.student_badges?.some(b => b.badge_type === 'streak_5')) continue

        // Check last 5 attendances
        const { data: attendances } = await supabase
          .from('attendance')
          .select('present, sessions!inner(status, scheduled_at)')
          .eq('student_id', student.id)
          .eq('sessions.status', 'done')
          .order('sessions(scheduled_at)', { ascending: false })
          .limit(5)

        if (attendances && attendances.length === 5 && attendances.every(a => a.present)) {
          const claimed = await claimNotification('award_streak_5', student.id, student.telegram_id)
          if (!claimed) continue

          await supabase.from('student_badges').insert({
            student_id: student.id,
            badge_type: 'streak_5'
          })

          const lang = student.language || 'uz'
          const msg = lang === 'ru'
            ? '🏆 <b>Поздравляем!</b> Вы получили значок <b>"Идеальная посещаемость"</b> за посещение 5 уроков подряд! Так держать!'
            : '🏆 <b>Tabriklaymiz!</b> 5 ta darsda ketma-ket qatnashganingiz uchun <b>"Ideal davomat"</b> nishonini oldingiz! Barakalla!'
          
          bot.sendMessage(student.telegram_id, msg, { parse_mode: 'HTML' }).catch(() => {})
        }
      }
    }

    // 2. Award Homework Master (Completed 3 homeworks)
    const { data: studentsWithoutHwMaster } = await supabase
      .from('users')
      .select(`
        id, telegram_id, language,
        student_badges (badge_type)
      `)
      .eq('role', 'student')
      
    if (studentsWithoutHwMaster) {
      for (const student of studentsWithoutHwMaster) {
        if (student.student_badges?.some(b => b.badge_type === 'hw_master_3')) continue

        const { data: hwSubs } = await supabase
          .from('homework_submissions')
          .select('status')
          .eq('student_id', student.id)
          .eq('status', 'done')
          .limit(3)

        if (hwSubs && hwSubs.length >= 3) {
          const claimed = await claimNotification('award_hw_master', student.id, student.telegram_id)
          if (!claimed) continue

          await supabase.from('student_badges').insert({
            student_id: student.id,
            badge_type: 'hw_master_3'
          })

          const lang = student.language || 'uz'
          const msg = lang === 'ru'
            ? '🎓 <b>Отличная работа!</b> Вы получили значок <b>"Мастер домашних заданий"</b> за выполнение 3-х ДЗ! Продолжайте в том же духе!'
            : '🎓 <b>Ajoyib!</b> 3 ta uy vazifasini bajarganingiz uchun <b>"Uy vazifasi ustasi"</b> nishonini oldingiz! Shu ruhda davom eting!'
          
          bot.sendMessage(student.telegram_id, msg, { parse_mode: 'HTML' }).catch(() => {})
        }
      }
    }

  } catch (err) {
    console.error('Award badges cron error:', err.message)
  }
}
