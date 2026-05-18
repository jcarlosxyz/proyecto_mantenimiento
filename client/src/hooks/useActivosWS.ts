/**
 * useActivosWS — Hook para actualizaciones en tiempo real del estado de activos
 *
 * Escucha el evento 'activo_actualizado' del WebSocket y llama al
 * callback `onActualizar` cada vez que cambia el estado de algún activo.
 *
 * Uso en ActivosList:
 *   useActivosWS((evento) => { ... actualizar estado local ... })
 */

import { useEffect, useRef, useCallback } from 'react'
import { WS_URL } from '../config'

export interface EventoActivo {
  tipo: string
  ts: string
  datos: {
    activo_id: string
    tag: string
    nombre: string
    estado_nuevo: string
    orden_id: string
    numero_ot: string
  }
}

/**
 * @param onActualizar  Función que se ejecuta cuando llega un evento de activo
 * @param enabled       Si false, el hook no se conecta
 */
export function useActivosWS(
  onActualizar: (evento: EventoActivo) => void,
  enabled = true
) {
  const socketRef  = useRef<WebSocket | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const callbackRef = useRef(onActualizar)
  useEffect(() => { callbackRef.current = onActualizar }, [onActualizar])

  const conectar = useCallback(() => {
    if (!mountedRef.current || !enabled) return
    if (socketRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    socketRef.current = ws

    ws.onopen = () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    }

    ws.onmessage = (event) => {
      try {
        const mensaje: EventoActivo = JSON.parse(event.data)
        if (mensaje.tipo === 'activo_actualizado') {
          callbackRef.current(mensaje)
        }
      } catch { /* ignorar mensajes malformados */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      timerRef.current = setTimeout(conectar, 3_000)
    }

    ws.onerror = () => { ws.close() }
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
