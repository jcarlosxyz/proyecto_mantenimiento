/**
 * useDashboardWS — Hook genérico que escucha TODOS los eventos WS del servidor
 * y llama al callback cuando llega cualquier evento relevante para el dashboard
 */
import { useEffect, useRef, useCallback } from 'react'

const WS_URL = `ws://${window.location.hostname}:3000/ws`

const EVENTOS_DASHBOARD = [
  'inventario_actualizado',
  'activo_actualizado',
  'ot_creada',
  'ot_actualizada',
  'plan_ejecutado',
]

export function useDashboardWS(onEvento: () => void, enabled = true) {
  const socketRef   = useRef<WebSocket | null>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef  = useRef(true)
  const callbackRef = useRef(onEvento)
  useEffect(() => { callbackRef.current = onEvento }, [onEvento])

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
        const msg = JSON.parse(event.data)
        if (EVENTOS_DASHBOARD.includes(msg.tipo)) {
          callbackRef.current()
        }
      } catch { /* ignorar */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      timerRef.current = setTimeout(conectar, 3_000)
    }

    ws.onerror = () => ws.close()
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
