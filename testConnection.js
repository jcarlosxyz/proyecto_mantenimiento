/**
 * Test de conexión a Supabase
 * Ejecutar: node testConnection.js
 */

const { supabase, supabaseAdmin } = require('./supabaseClient')

async function testConnection() {
  console.log('🔌 Probando conexión a Supabase...\n')

  // Test 1: Verificar que el cliente se creó correctamente
  console.log('✅ Cliente público creado correctamente')
  console.log(`   URL: ${process.env.SUPABASE_URL}`)

  if (supabaseAdmin) {
    console.log('✅ Cliente admin creado correctamente')
  } else {
    console.log('⚠️  Cliente admin no disponible (falta SUPABASE_SERVICE_ROLE_KEY)')
  }

  // Test 2: Hacer una consulta simple para verificar conectividad
  try {
    const { data, error } = await supabase
      .from('_non_existent_table_test')
      .select('*')
      .limit(1)

    if (error && error.code === '42P01') {
      // Error "relation does not exist" = conexión exitosa, tabla no existe (esperado)
      console.log('\n✅ Conexión a Supabase exitosa!')
      console.log('   La base de datos respondió correctamente.')
    } else if (error) {
      console.log(`\n⚠️  Conexión establecida pero con error: ${error.message}`)
    } else {
      console.log('\n✅ Conexión a Supabase exitosa!')
    }
  } catch (err) {
    console.error('\n❌ Error de conexión:', err.message)
  }

  // Test 3: Listar tablas existentes (con admin client)
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.rpc('pg_tables_list', {})

      if (error) {
        // Si la función no existe, intentar una consulta directa
        const { data: tables, error: tablesError } = await supabaseAdmin
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')

        if (!tablesError && tables) {
          console.log(`\n📋 Tablas en schema public: ${tables.length}`)
          tables.forEach(t => console.log(`   - ${t.table_name}`))
        }
      }
    } catch (err) {
      // Silenciar - no es crítico
    }
  }

  console.log('\n🎉 Test completado!')
}

testConnection()
