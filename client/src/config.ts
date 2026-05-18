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
// En dev: ws://localhost:3000/ws (conexión directa, sin proxy)
// En prod: wss://tu-backend.railway.app/ws
export const WS_URL = isDev
  ? `ws://${window.location.hostname}:3000/ws`
  : (import.meta.env.VITE_API_URL || '')
      .replace(/^https?:\/\//, (m: string) => (m.startsWith('https') ? 'wss://' : 'ws://'))
      .replace(/\/$/, '') + '/ws'
