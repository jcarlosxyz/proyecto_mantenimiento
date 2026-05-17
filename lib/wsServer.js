/**
 * WebSocket Server - CMMS Tiempo Real
 * 
 * Eventos emitidos:
 *   inventario_actualizado  → { tipo, material_id, nombre, stock_nuevo, cantidad_usada, orden_id }
 *   ot_material_registrado  → { orden_id, material_id, nombre, cantidad, fecha_instalacion }
 *   stock_devuelto          → { material_id, nombre, stock_nuevo }
 */

const { WebSocketServer, WebSocket } = require('ws')

const fs = require('fs')
const path = require('path')

// Helper para escribir logs de WebSocket en el archivo común
function logDebug(message) {
  const timestamp = new Date().toISOString()
  const logLine = `[${timestamp}] ${message}\n`
  try {
    fs.appendFileSync(path.join(__dirname, '../realtime_debug.log'), logLine)
  } catch (err) {
    console.error('Error escribiendo log de wsServer:', err.message)
  }
}

let wss = null

/**
 * Inicializa el WebSocket Server sobre el servidor HTTP existente.
 * @param {import('http').Server} httpServer
 */
function initWSS(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', (socket, req) => {
    const ip = req.socket.remoteAddress
    socket.isAlive = true
    
    logDebug(`[WS Server] Cliente conectado desde IP: ${ip} (Total conectados: ${wss.clients.size})`)
    console.log(`  [WS] Cliente conectado: ${ip}  (total: ${wss.clients.size})`)

    // Registrar la respuesta del ping automático (pong)
    socket.on('pong', () => {
      socket.isAlive = true
    })

    // Ping periódico para mantener viva la conexión y limpiar conexiones muertas (zombies)
    const pingInterval = setInterval(() => {
      if (socket.isAlive === false) {
        logDebug(`[WS Server] Conectando inactiva (zombie) detectada de ${ip}. Terminando socket...`)
        clearInterval(pingInterval)
        return socket.terminate()
      }
      
      socket.isAlive = false
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping()
      }
    }, 30_000)

    socket.on('close', () => {
      clearInterval(pingInterval)
      logDebug(`[WS Server] Cliente desconectado (Quedan conectados: ${wss.clients.size})`)
      console.log(`  [WS] Cliente desconectado (quedan: ${wss.clients.size})`)
    })

    socket.on('error', (err) => {
      logDebug(`[WS Server] ERROR en socket: ${err.message}`)
      console.error('  [WS] Error de socket:', err.message)
    })
  })

  logDebug(`[WS Server] WebSocket Server iniciado exitosamente en puerto del backend`)
  console.log('  [WS] WebSocket Server iniciado en ws://localhost/ws')
  return wss
}

/**
 * Emite un evento a TODOS los clientes conectados.
 * @param {string} tipo  - Nombre del evento
 * @param {object} datos - Payload del evento
 */
function broadcast(tipo, datos) {
  if (!wss) {
    logDebug(`[WS Broadcast] ERROR: Intentando emitir "${tipo}" pero el servidor wss no está inicializado`)
    return
  }
  const mensaje = JSON.stringify({ tipo, datos, ts: new Date().toISOString() })
  let enviados = 0

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(mensaje)
      enviados++
    }
  })

  logDebug(`[WS Broadcast] "${tipo}" enviado con éxito a ${enviados} de ${wss.clients.size} cliente(s) conectados`)
  if (enviados > 0) {
    console.log(`  [WS] broadcast "${tipo}" → ${enviados} cliente(s)`)
  }
}

module.exports = { initWSS, broadcast }
