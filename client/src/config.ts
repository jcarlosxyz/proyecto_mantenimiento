/**
 * config.ts — Configuración central de URLs para producción y desarrollo.
 *
 * En desarrollo (Vite dev server):
 *   - Las llamadas a /api/* se redirigen al backend local vía proxy de Vite
 *   - Los WebSockets se conectan a ws://localhost:3000/ws directamente
 *
 * En producción (Vercel frontend + Railway backend):
 *   - VITE_API_URL debe apuntar a la URL pública del backend en Railway
 *   - Ejemplo: https://cmms-backend.up.railway.app
 */

const isDev = import.meta.env.DEV

// URL base de la API REST
// En dev: vacío → el proxy de Vite redirige /api/* al backend local
// En prod: URL completa del backend en Railway
export const API_BASE_URL = isDev
  ? ''
  : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// URL del WebSocket
// En dev:  ws://localhost:3000/ws
// En prod: wss://... (siempre seguro si la página es HTTPS)
//
// Se usa window.location.protocol para determinar ws:// vs wss://
// independientemente de si VITE_API_URL tiene http:// o https://.
// Esto garantiza que NUNCA se use ws:// desde una página HTTPS.
function buildWsUrl(): string {
  if (isDev) {
    return `ws://${window.location.hostname}:3000/ws`
  }
  const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  // Extraer solo el host (quitar el esquema http:// o https://)
  const host = apiUrl.replace(/^https?:\/\//, '')
  // Usar wss:// si la página está en HTTPS, ws:// si está en HTTP
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
  return `${protocol}${host}/ws`
}

export const WS_URL = buildWsUrl()
