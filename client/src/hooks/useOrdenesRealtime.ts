/**
 * useOrdenesRealtime — Suscripción directa a Supabase Realtime desde el browser.
 *
 * Este hook elimina el puente WebSocket (Node.js → Browser) y se conecta
 * directamente al canal de Supabase Postgres Changes. Esto garantiza que
 * cualquier cambio en `ordenes_trabajo` se reciba en tiempo real
 * independientemente de la estabilidad de la conexión WebSocket local.
 *
 * Eventos:
 *   INSERT → onInsert(nuevaOT)
 *   UPDATE → onUpdate(otActualizada)
 */
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface RealtimeOrdenPayload {
  numero_ot: string
  estado: string
  activo_tag: string
  tecnico_asignado: string
  id: string
  [key: string]: unknown
}

interface UseOrdenesRealtimeOptions {
  onInsert?: (ot: RealtimeOrdenPayload) => void
  onUpdate?: (ot: RealtimeOrdenPayload) => void
  enabled?: boolean
}

export function useOrdenesRealtime({
  onInsert,
  onUpdate,
  enabled = true,
}: UseOrdenesRealtimeOptions) {
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)

  // Mantener referencias actualizadas sin recrear la suscripción
  useEffect(() => { onInsertRef.current = onInsert }, [onInsert])
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  useEffect(() => {
    if (!enabled) return

    console.log('[useOrdenesRealtime] Suscribiendo a Supabase Realtime → ordenes_trabajo')

    const channel = supabase
      .channel('ordenes-realtime-browser')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ordenes_trabajo' },
        (payload: RealtimePostgresChangesPayload<RealtimeOrdenPayload>) => {
          console.log('[useOrdenesRealtime] INSERT recibido:', payload.new)
          onInsertRef.current?.(payload.new as RealtimeOrdenPayload)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ordenes_trabajo' },
        (payload: RealtimePostgresChangesPayload<RealtimeOrdenPayload>) => {
          console.log('[useOrdenesRealtime] UPDATE recibido:', payload.new)
          onUpdateRef.current?.(payload.new as RealtimeOrdenPayload)
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useOrdenesRealtime] ✅ Canal Supabase conectado y escuchando')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useOrdenesRealtime] ❌ Error en canal Supabase:', err)
        } else {
          console.log('[useOrdenesRealtime] Estado del canal:', status)
        }
      })

    return () => {
      console.log('[useOrdenesRealtime] Limpiando suscripción Supabase')
      supabase.removeChannel(channel)
    }
  }, [enabled])
}
