import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function test() {
  const { data, error } = await supabase.from('homework').select('*').limit(1)
  console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data, checking error...')
  if (error) console.error(error)
  else if (!data || data.length === 0) {
    // Force an error to get column names
    const { error: err2 } = await supabase.from('homework').insert({})
    console.error('Insert error:', err2)
  }
}

test()
