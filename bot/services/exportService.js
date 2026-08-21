import { supabase, requireServiceSupabase, requireUserRow } from '../db.js'
import { checkTeacherSubscription } from './authService.js'

export async function handleTeacherExport(telegramUser, body) {
  requireServiceSupabase()
  const user = await requireUserRow(telegramUser)
  
  if (user.role !== 'teacher') throw new Error('Only teachers can export data')
  
  // Feature Gate: Only Center plans can export data
  const subscription = await checkTeacherSubscription(user.id)
  if (subscription?.plan?.slug !== 'center') {
    throw { status: 403, message: 'Export is only available on the Center plan.' }
  }

  const exportType = body.type || 'payments' // 'payments' or 'students'

  if (exportType === 'payments') {
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id, amount, status, method, period_month, period_year, paid_at,
        student:users!payments_student_id_fkey(first_name, last_name, username),
        group:groups(name, subject)
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Generate CSV
    const header = ['ID', 'Student Name', 'Username', 'Group', 'Subject', 'Amount', 'Status', 'Method', 'Period', 'Paid At']
    const rows = (payments || []).map(p => {
      const studentName = p.student ? `${p.student.first_name || ''} ${p.student.last_name || ''}`.trim() : 'Unknown'
      const username = p.student?.username || ''
      const groupName = p.group?.name || ''
      const subject = p.group?.subject || ''
      const period = `${String(p.period_month).padStart(2, '0')}/${p.period_year}`
      const paidAt = p.paid_at ? new Date(p.paid_at).toLocaleString('ru-RU') : ''
      
      // Escape commas and quotes for CSV
      return [
        p.id,
        `"${studentName.replace(/"/g, '""')}"`,
        username,
        `"${groupName.replace(/"/g, '""')}"`,
        `"${subject.replace(/"/g, '""')}"`,
        p.amount,
        p.status,
        p.method || '',
        period,
        paidAt
      ].join(',')
    })

    const csvContent = [header.join(','), ...rows].join('\n')
    
    // Convert to Base64 to safely transmit over JSON
    const base64Csv = Buffer.from(csvContent, 'utf-8').toString('base64')

    return { ok: true, data: base64Csv, filename: `payments_export_${new Date().getTime()}.csv` }
  }

  throw { status: 400, message: 'Invalid export type' }
}
