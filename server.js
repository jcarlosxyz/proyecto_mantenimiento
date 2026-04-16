/**
 * Servidor API REST - CMMS Sistema de Gestión de Mantenimiento
 * 
 * Módulo 1: Gestión de Activos
 * 
 * Ejecutar: node server.js
 * URL base: http://localhost:3000
 */

const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
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
      }
    }
  })
})

// Módulo 1 - Gestión de Activos
const activosRoutes = require('./routes/activos')
app.use('/api/activos', activosRoutes)

// Upload de imágenes
const uploadRoutes = require('./routes/upload')
app.use('/api/upload', uploadRoutes)

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
// Iniciar servidor
// ============================================================
const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   CMMS API - Gestión de Mantenimiento           ║
  ║   Servidor corriendo en: http://localhost:${PORT}   ║
  ╠══════════════════════════════════════════════════╣
  ║   Módulo 1: Gestión de Activos                   ║
  ║   Base URL: http://localhost:${PORT}/api/activos    ║
  ║                                                  ║
  ║   Presiona Ctrl+C para detener el servidor       ║
  ╚══════════════════════════════════════════════════╝
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
