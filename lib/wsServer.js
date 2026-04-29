/**
 * WebSocket Server - CMMS Tiempo Real
 * 
 * Eventos emitidos:
 *   inventario_actualizado  → { tipo, material_id, nombre, stock_nuevo, cantidad_usada, orden_id }
 *   ot_material_registrado  → { orden_id, material_id, nombre, cantidad, fecha_instalacion }
 *   stock_devuelto          → { material_id, nombre, stock_nuevo }
 */

const { WebSocketServer, WebSocket } = require('ws')

let wss = null

/**
 * Inicializa el WebSocket Server sobre el servidor HTTP existente.
 * @param {import('http').Server} httpServer
 */
function initWSS(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', (socket, req) => {
    const ip = req.socket.remoteAddress
    console.log(`  [WS] Cliente conectado: ${ip}  (total: ${wss.clients.size})`)

    // Ping periódico para mantener viva la conexión
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping()
      }
    }, 30_000)

    socket.on('close', () => {
      clearInterval(pingInterval)
      console.log(`  [WS] Cliente desconectado (quedan: ${wss.clients.size})`)
    })

    socket.on('error', (err) => {
      console.error('  [WS] Error de socket:', err.message)
    })
  })

  console.log('  [WS] WebSocket Server iniciado en ws://localhost/ws')
  return wss
}

/**
 * Emite un evento a TODOS los clientes conectados.
 * @param {string} tipo  - Nombre del evento
 * @param {object} datos - Payload del evento
 */
function broadcast(tipo, datos) {
  if (!wss) return
  const mensaje = JSON.stringify({ tipo, datos, ts: new Date().toISOString() })
  let enviados = 0

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(mensaje)
      enviados++
    }
  })

  if (enviados > 0) {
    console.log(`  [WS] broadcast "${tipo}" → ${enviados} cliente(s)`)
  }
}

module.exports = { initWSS, broadcast }
