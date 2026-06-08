import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rflupdbnyrkowxijbkyq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbHVwZGJueXJrb3d4aWpia3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTc0MDcsImV4cCI6MjA5NDA3MzQwN30.COm_SimFRUmZhNMfL39GLGaO4IhLRtQRM3XDYIT4lmc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  try {
    // We can fetch one row to see columns (if any exist) or we can inspect using a select query
    // Let's do a select query on attendance to see what columns the API returns or if it throws a column name error
    console.log('Querying attendance columns via select...')
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Select error:', error)
    } else {
      console.log('Attendance columns:', data.length > 0 ? Object.keys(data[0]) : 'No data in table to show columns')
    }

    // Let's also query the schema columns if we can
    // Postgres RPC is not configured, but wait! We can inspect from Postgrest if we query
    // select * from attendance. Let's inspect the REST API response for /rest/v1/attendance?limit=0
    // Actually, let's just make a select of * and print whatever error we get.
  } catch (err) {
    console.error('Fatal error:', err)
  }
}

run()
