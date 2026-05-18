/**
 * useDashboardWS — Escucha TODOS los eventos WS relevantes al dashboard
 * con throttle de 1s para evitar refetches en cascada.
 *
 * Eventos del backend que disparan refresco:
 *   ot_creada              → OT creada (ordenes.js)
 *   ot_actualizada         → OT cerrada/actualizada (ordenes.js)
 *   activo_actualizado     → Estado de activo cambió (ordenes.js)
 *   inventario_actualizado → Stock cambió (ordenes_materiales.js, ordenes_compra.js)
 *   catalogo_actualizado   → Creación/edición/borrado de material (materiales.js)
 *   plan_actualizado       → PM creado/ejecutado/cerrado/editado (planes.js)
 *   tecnico_actualizado    → Técnico creado/editado/eliminado (tecnicos.js)
 */
import { useEffect, useRef, useCallback } from 'react'
import { WS_URL } from '../config'

// URL del servidor WebSocket — resuelta automáticamente por config.ts:
// dev:  ws://localhost:3000/ws
// prod: wss://tu-backend.railway.app/ws

const EVENTOS_DASHBOARD = new Set([
  'ot_creada',
  'ot_actualizada',
  'activo_actualizado',
  'inventario_actualizado',
  'catalogo_actualizado',
  'plan_actualizado',
  'tecnico_actualizado',
  'nueva_orden_compra',
])

export interface EventoDashboard {
  tipo: string
  ts: string
  datos: Record<string, unknown>
}

/**
 * @param onEvento  Callback que recibe el evento completo cuando llega uno relevante
 * @param enabled   Si false, no se conecta (útil para páginas inactivas)
 */
export function useDashboardWS(
  onEvento: (evento: EventoDashboard) => void,
  enabled = true
) {
  const socketRef   = useRef<WebSocket | null>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef  = useRef<EventoDashboard | null>(null)
  const mountedRef  = useRef(true)
  const callbackRef = useRef(onEvento)
  useEffect(() => { callbackRef.current = onEvento }, [onEvento])

  // Throttle: acumula eventos y dispara una sola vez por segundo
  const dispatchThrottled = useCallback((evento: EventoDashboard) => {
    pendingRef.current = evento // siempre guarda el último evento
    if (throttleRef.current) return // ya hay un timer pendiente
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null
      if (mountedRef.current && pendingRef.current) {
        callbackRef.current(pendingRef.current)
        pendingRef.current = null
      }
    }, 1000)
  }, [])

  const conectar = useCallback(() => {
    if (!mountedRef.current || !enabled) return
    if (socketRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    socketRef.current = ws

    ws.onopen = () => {
      console.log('[Dashboard WS] Conectado — escuchando cambios en tiempo real')
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    }

    ws.onmessage = (event) => {
      try {
        const msg: EventoDashboard = JSON.parse(event.data)
        if (EVENTOS_DASHBOARD.has(msg.tipo)) {
          console.log(`[Dashboard WS] Evento recibido: ${msg.tipo}`, msg.datos)
          dispatchThrottled(msg)
        }
      } catch { /* ignorar mensajes malformados */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      console.log('[Dashboard WS] Desconectado — reconectando en 3s...')
      timerRef.current = setTimeout(conectar, 3_000)
    }

    ws.onerror = (err) => console.error('[Dashboard WS] Error en socket:', err)
  }, [enabled, dispatchThrottled])

  useEffect(() => {
    mountedRef.current = true
    if (enabled) conectar()
    return () => {
      mountedRef.current = false
      if (timerRef.current)  clearTimeout(timerRef.current)
      if (throttleRef.current) clearTimeout(throttleRef.current)
      socketRef.current?.close()
    }
  }, [conectar, enabled])
}
