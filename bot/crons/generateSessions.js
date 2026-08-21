import { config } from '../config.js'

export async function runGenerateSessions(supabase) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Look ahead 7 days
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Fetch active groups with schedule templates
    const { data: groups, error } = await supabase
      .from('groups')
      .select('id, schedule_template')
      .not('schedule_template', 'is', null)

    if (error) throw error

    for (const group of groups || []) {
      const template = group.schedule_template
      if (!Array.isArray(template) || template.length === 0) continue

      // For each of the next 7 days, check if it matches the template
      for (let i = 1; i <= 7; i++) {
        const targetDate = new Date(today)
        targetDate.setDate(targetDate.getDate() + i)
        
        const dayOfWeek = targetDate.getDay() // 0 = Sun, 1 = Mon ...
        
        const schedules = template.filter(t => Number(t.dayOfWeek) === dayOfWeek)
        for (const schedule of schedules) {
          // Parse time
          const [hours, minutes] = (schedule.time || '15:00').split(':')
          
          // Convert teacher's local time (Tashkent UTC+5) to UTC
          const localHours = Number(hours)
          const localMinutes = Number(minutes)
          if (isNaN(localHours) || isNaN(localMinutes)) continue
          const utcHours = localHours - 5 // Tashkent is UTC+5
          targetDate.setUTCHours(utcHours, localMinutes, 0, 0)
          
          const targetDateIso = targetDate.toISOString()

          // Check if session already exists for this group around this time (+/- 2 hours to avoid duplicates)
          const startWindow = new Date(targetDate.getTime() - 2 * 60 * 60000).toISOString()
          const endWindow = new Date(targetDate.getTime() + 2 * 60 * 60000).toISOString()

          const { data: existing } = await supabase
            .from('sessions')
            .select('id')
            .eq('group_id', group.id)
            .gte('scheduled_at', startWindow)
            .lte('scheduled_at', endWindow)
            .limit(1)

          if (!existing || existing.length === 0) {
            // Create session
            await supabase.from('sessions').insert({
              group_id: group.id,
              scheduled_at: targetDateIso,
              duration_min: config.DEFAULT_SESSION_DURATION_MIN,
              status: 'upcoming'
            })
          }
        }
      }
    }
  } catch (err) {
    console.error('generateSessions cron error:', err.message)
  }
}
