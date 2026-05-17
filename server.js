/**
 * Servidor API REST - CMMS Sistema de Gestión de Mantenimiento
 * 
 * Módulo 1: Gestión de Activos
 * 
 * Ejecutar: node server.js
 * URL base: http://localhost:3000
 */

const express  = require('express')
const cors     = require('cors')
const http     = require('http')
require('dotenv').config()

const { initWSS } = require('./lib/wsServer')

const app  = express()
const PORT = process.env.PORT || 3000

// ============================================================
// Middleware
// ============================================================
app.use(cors())
app.use(express.json())

// Log de requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`)
  next()
})

// ============================================================
// Rutas
// ============================================================

// Ruta raíz - Info de la API
app.get('/', (req, res) => {
  res.json({
    nombre: 'CMMS API - Sistema de Gestión de Mantenimiento',
    version: '1.0.0',
    modulos: {
      activos: {
        base: '/api/activos',
        endpoints: [
          { metodo: 'GET',    ruta: '/api/activos',              descripcion: 'Listar activos (con filtros y paginación)' },
          { metodo: 'GET',    ruta: '/api/activos/:id',          descripcion: 'Obtener activo por ID' },
          { metodo: 'GET',    ruta: '/api/activos/tag/:tag',     descripcion: 'Obtener activo por TAG' },
          { metodo: 'POST',   ruta: '/api/activos',              descripcion: 'Crear nuevo activo' },
          { metodo: 'PUT',    ruta: '/api/activos/:id',          descripcion: 'Actualizar activo' },
          { metodo: 'PATCH',  ruta: '/api/activos/:id/estado',   descripcion: 'Cambiar estado del activo' },
          { metodo: 'DELETE', ruta: '/api/activos/:id',          descripcion: 'Eliminar activo' }
        ]
      },
      ordenes: {
        base: '/api/ordenes',
        endpoints: [
          { metodo: 'GET',    ruta: '/api/ordenes',              descripcion: 'Listar órdenes de trabajo' },
          { metodo: 'GET',    ruta: '/api/ordenes/:id',          descripcion: 'Obtener OT por ID o número' },
          { metodo: 'POST',   ruta: '/api/ordenes',              descripcion: 'Crear nueva OT' },
          { metodo: 'PUT',    ruta: '/api/ordenes/:id',          descripcion: 'Actualizar/Cerrar OT' },
          { metodo: 'DELETE', ruta: '/api/ordenes/:id',          descripcion: 'Eliminar OT' }
        ]
      },
      materiales: {
        base: '/api/materiales',
        endpoints: [
          { metodo: 'GET',    ruta: '/api/materiales',           descripcion: 'Listar catálogo de materiales' },
          { metodo: 'GET',    ruta: '/api/materiales/:id',       descripcion: 'Obtener material por ID' },
          { metodo: 'POST',   ruta: '/api/materiales',           descripcion: 'Crear nuevo material' },
          { metodo: 'PUT',    ruta: '/api/materiales/:id',       descripcion: 'Actualizar material/stock' },
          { metodo: 'DELETE', ruta: '/api/materiales/:id',       descripcion: 'Eliminar material' }
        ]
      },
      consumo_materiales: {
        base: '/api/ordenes-materiales',
        endpoints: [
          { metodo: 'GET',    ruta: '/api/ordenes-materiales',   descripcion: 'Listar materiales usados (filtros: ?orden_id=UUID)' },
          { metodo: 'POST',   ruta: '/api/ordenes-materiales',   descripcion: 'Registrar consumo de material en una OT (descuenta stock)' },
          { metodo: 'DELETE', ruta: '/api/ordenes-materiales/:id', descripcion: 'Eliminar consumo (devuelve stock)' }
        ]
      }
    }
  })
})

// Módulo 1 - Gestión de Activos
const activosRoutes = require('./routes/activos')
app.use('/api/activos', activosRoutes)

// Módulo 2 - Órdenes de Trabajo (OT)
const ordenesRoutes = require('./routes/ordenes')
app.use('/api/ordenes', ordenesRoutes)

// Módulo 3 - Catálogo de Materiales
const materialesRoutes = require('./routes/materiales')
app.use('/api/materiales', materialesRoutes)

// Módulo 4 - Consumo de Materiales en OT
const ordenesMatRoutes = require('./routes/ordenes_materiales')
app.use('/api/ordenes-materiales', ordenesMatRoutes)

// Módulo 4b - Planes de Mantenimiento (Preventivo)
const planesRoutes = require('./routes/planes')
app.use('/api/planes', planesRoutes)

// Módulo 3 - Dashboard de KPIs Ejecutivo
const dashboardRoutes = require('./routes/dashboard')
app.use('/api/dashboard', dashboardRoutes)

// Módulo 5 - Técnicos
const tecnicosRoutes = require('./routes/tecnicos')
app.use('/api/tecnicos', tecnicosRoutes)

// Upload de imágenes
const uploadRoutes = require('./routes/upload')
app.use('/api/upload', uploadRoutes)

// Módulo 6 - Órdenes de Compra
const ordenesCompraRoutes = require('./routes/ordenes_compra')
app.use('/api/ordenes-compra', ordenesCompraRoutes)

// Módulo WhatsApp - Notificaciones de OT
const whatsappRoutes = require('./routes/whatsapp')
app.use('/api/whatsapp', whatsappRoutes)

// ============================================================
// Manejo de errores
// ============================================================

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.path}`,
    ayuda: 'Visita GET / para ver los endpoints disponibles'
  })
})

// Error global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err)
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  })
})

// ============================================================
// Iniciar servidor (HTTP + WebSocket comparten el mismo puerto)
// ============================================================
const server = http.createServer(app)

// Inicializar WebSocket Server
initWSS(server)

// ============================================================
// Supabase Realtime Bridge -> WebSockets with Debug Logging
// ============================================================
const { supabase, supabaseAdmin } = require('./supabaseClient')
const { broadcast } = require('./lib/wsServer')
const fs = require('fs')
const path = require('path')

// Helper para escribir logs detallados en un archivo de texto
function logDebug(message) {
  const timestamp = new Date().toISOString()
  const logLine = `[${timestamp}] ${message}\n`
  try {
    fs.appendFileSync(path.join(__dirname, 'realtime_debug.log'), logLine)
  } catch (err) {
    console.error('Error escribiendo log de realtime:', err.message)
  }
}

// Usar supabaseAdmin si está disponible para evitar bloqueos por políticas de RLS
const realtimeClient = supabaseAdmin || supabase;
logDebug(`Iniciando canal Realtime usando: ${supabaseAdmin ? 'supabaseAdmin (service_role)' : 'supabase (anon)'}`)

realtimeClient.channel('db-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_trabajo' }, (payload) => {
    logDebug(`⚡ Evento Postgres en 'ordenes_trabajo': eventType=${payload.eventType}, numero_ot=${payload.new?.numero_ot || payload.old?.numero_ot}, estado=${payload.new?.estado}`)
    
    if (payload.eventType === 'INSERT') {
      console.log('⚡ [Supabase Realtime] Nueva OT creada remotamente:', payload.new.numero_ot)
      broadcast('ot_creada', { 
        numero_ot: payload.new.numero_ot, 
        activo_tag: payload.new.activo_tag, 
        tipo: payload.new.tipo_mantenimiento, 
        prioridad: payload.new.prioridad, 
        tecnico: payload.new.tecnico_asignado 
      })
      logDebug(`[WS Broadcast] Enviado 'ot_creada' para ${payload.new.numero_ot}`)
    } else if (payload.eventType === 'UPDATE') {
      console.log('⚡ [Supabase Realtime] OT actualizada remotamente:', payload.new.numero_ot)
      broadcast('ot_actualizada', { 
        numero_ot: payload.new.numero_ot, 
        estado: payload.new.estado, 
        activo_tag: payload.new.activo_tag, 
        tecnico: payload.new.tecnico_asignado 
      })
      logDebug(`[WS Broadcast] Enviado 'ot_actualizada' para ${payload.new.numero_ot} (Estado: ${payload.new.estado})`)
    }
  })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activos' }, (payload) => {
    logDebug(`⚡ Evento Postgres en 'activos': tag=${payload.new?.tag}, estado=${payload.new?.estado}`)
    console.log('⚡ [Supabase Realtime] Activo actualizado remotamente:', payload.new.tag)
    broadcast('activo_actualizado', {
      activo_id: payload.new.id,
      tag: payload.new.tag,
      nombre: payload.new.nombre || '',
      estado_nuevo: payload.new.estado
    })
    logDebug(`[WS Broadcast] Enviado 'activo_actualizado' para ${payload.new.tag} (Estado: ${payload.new.estado})`)
  })
  .subscribe((status, err) => {
    logDebug(`🔗 Canal 'db-changes' cambió a estado: ${status}${err ? ' | Detalle error: ' + JSON.stringify(err) : ''}`)
    if (status === 'SUBSCRIBED') {
      console.log('🔗 [Supabase Realtime] Conectado y escuchando cambios (Sincronización Móvil ↔ Web activa)')
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ [Supabase Realtime Error] Error al conectar con Realtime. Detalle:', err || 'Sin error detallado. Verifica credenciales y RLS.')
    } else {
      console.log(`🔗 [Supabase Realtime Estado] Canal en estado: ${status}`)
    }
  })

server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════╗
  ║   CMMS API - Gestión de Mantenimiento           ║
  ║   Servidor: http://localhost:${PORT}               ║
  ║   WebSocket: ws://localhost:${PORT}/ws             ║
  ╠════════════════════════════════════════════════╣
  ║   API:       /api/activos /api/ordenes             ║
  ║              /api/materiales /api/tecnicos         ║
  ║   Presiona Ctrl+C para detener                     ║
  ╚════════════════════════════════════════════════╝
  `)
})

// Apagado limpio con Ctrl+C
process.on('SIGINT', () => {
  console.log('\n  ⏹  Deteniendo servidor...')
  server.close(() => {
    console.log('  ✔  Servidor detenido correctamente.\n')
    process.exit(0)
  })
})
