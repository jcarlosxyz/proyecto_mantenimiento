/**
 * Supabase Client Configuration
 * CMMS - Sistema de Gestión de Mantenimiento
 * 
 * Este módulo exporta dos clientes:
 * - supabase: Cliente público (usa anon key) - para operaciones del frontend
 * - supabaseAdmin: Cliente admin (usa service_role key) - para operaciones del servidor
 */

require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase Config:', {
  url: supabaseUrl ? 'OK' : 'MISSING',
  anonKey: supabaseAnonKey ? `OK (${supabaseAnonKey.length} chars)` : 'MISSING',
  serviceKey: supabaseServiceRoleKey ? `OK (${supabaseServiceRoleKey.length} chars)` : 'MISSING'
})

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Faltan variables de entorno de Supabase.\n' +
    'Asegúrate de tener SUPABASE_URL y SUPABASE_ANON_KEY en tu archivo .env'
  )
}

/**
 * Cliente público de Supabase
 * Usa la anon key - seguro para uso en el navegador con RLS habilitado
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

/**
 * Cliente admin de Supabase
 * Usa la service_role key - SOLO para uso en el servidor
 * ⚠️ Este cliente bypasea Row Level Security (RLS)
 */
const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

module.exports = { supabase, supabaseAdmin }
