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
        
        const schedule = template.find(t => Number(t.dayOfWeek) === dayOfWeek)
        if (schedule) {
          // Parse time
          const [hours, minutes] = (schedule.time || '15:00').split(':')
          targetDate.setHours(Number(hours), Number(minutes), 0, 0)
          
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
            .maybeSingle()

          if (!existing) {
            // Create session
            await supabase.from('sessions').insert({
              group_id: group.id,
              scheduled_at: targetDateIso,
              duration_min: 90,
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
