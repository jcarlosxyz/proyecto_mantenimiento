/**
 * useInventarioWS — Hook para actualizaciones en tiempo real del inventario
 *
 * Escucha el evento 'inventario_actualizado' del WebSocket y llama al
 * callback `onActualizar` cada vez que cambia el stock de algún material.
 *
 * Uso en MaterialesList:
 *   useInventarioWS(() => fetchMateriales())
 */

import { useEffect, useRef, useCallback } from 'react'

// WS conecta al mismo host/puerto que el backend (proxy de Vite redirige /ws)
const WS_URL = `ws://${window.location.hostname}:3000/ws`

export interface EventoInventario {
  tipo: string
  ts: string
  datos: {
    material_id: string
    nombre: string
    stock_nuevo: number
    cantidad_usada: number
    orden_id: string
    accion: 'consumo' | 'devolucion'
  }
}

/**
 * @param onActualizar  Función que se ejecuta cuando llega un evento de inventario
 * @param enabled       Si false, el hook no se conecta (p.ej. cuando la página no está visible)
 */
export function useInventarioWS(
  onActualizar: (evento: EventoInventario) => void,
  enabled = true
) {
  const socketRef  = useRef<WebSocket | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  // Mantener referencia estable del callback
  const callbackRef = useRef(onActualizar)
  useEffect(() => { callbackRef.current = onActualizar }, [onActualizar])

  const conectar = useCallback(() => {
    if (!mountedRef.current || !enabled) return
    if (socketRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    socketRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Conectado al servidor de inventario en tiempo real')
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const mensaje: EventoInventario = JSON.parse(event.data)
        // Solo procesar eventos de inventario
        if (mensaje.tipo === 'inventario_actualizado') {
          callbackRef.current(mensaje)
        }
      } catch {
        // Ignorar mensajes malformados
      }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      console.log('[WS] Conexión cerrada — reconectando en 3s...')
      timerRef.current = setTimeout(conectar, 3_000)
    }

    ws.onerror = () => {
      ws.close() // Dispara onclose → reconexión automática
    }
  }, [enabled])

  useEffect(() => {
    mountedRef.current = true
    if (enabled) conectar()

    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      socketRef.current?.close()
    }
  }, [conectar, enabled])
}
