require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function test() {
  const { data, error } = await supabase.from('planes_mantenimiento').select('*').order('created_at', { ascending: false }).limit(2)
  console.log('Planes Mantenimiento:', JSON.stringify(data, null, 2))
  if (error) console.log('Error:', error)
}
test()
