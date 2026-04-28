/**
 * API - Envío de mensajes WhatsApp vía UltraMsg
 * 
 * Requiere en .env:
 *   ULTRAMSG_INSTANCE=tu_instance_id
 *   ULTRAMSG_TOKEN=tu_token
 * 
 * Registro gratuito en: https://ultramsg.com
 * 
 * Endpoints:
 *   POST /api/whatsapp/enviar   - Enviar mensaje de texto
 *   POST /api/whatsapp/ot       - Enviar resumen de OT (construye el mensaje automáticamente)
 */

const express = require('express')
const router = express.Router()

const INSTANCE = process.env.ULTRAMSG_INSTANCE
const TOKEN    = process.env.ULTRAMSG_TOKEN

// ── Helpers ────────────────────────────────────────────────────

const EMOJIS_PRIORIDAD = {
  'P1 Emergencia': '🔴',
  'P2 Urgente':    '🟠',
  'P3 Normal':     '🟡',
  'P4 Mejora':     '🟢',
}

const EMOJIS_ESTADO = {
  'Abierta':    '📋',
  'En proceso': '⚙️',
  'En espera':  '⏸️',
  'Cerrada':    '✅',
}

function formatearFecha(iso) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function generarMensajeOT(ot) {
  const priEmoji = EMOJIS_PRIORIDAD[ot.prioridad]  || '⚠️'
  const estEmoji = EMOJIS_ESTADO[ot.estado]          || '📄'

  let msg =
    `🔧 *ORDEN DE TRABAJO - ${ot.numero_ot}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${estEmoji} *Estado:* ${ot.estado}\n` +
    `${priEmoji} *Prioridad:* ${ot.prioridad}\n` +
    `🏷️ *Activo (TAG):* ${ot.activo_tag}\n` +
    `🔩 *Tipo:* ${ot.tipo_mantenimiento}\n` +
    `👷 *Técnico:* ${ot.tecnico_asignado}\n` +
    `⏰ *Límite de inicio:* ${formatearFecha(ot.fecha_limite_inicio)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📝 *Descripción del problema:*\n${ot.descripcion_problema}\n`

  if (ot.trabajo_realizado) {
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
           `✅ *Trabajo realizado:*\n${ot.trabajo_realizado}\n`
  }
  if (ot.causa_raiz) {
    msg += `🔍 *Causa raíz:* ${ot.causa_raiz}\n`
  }
  if (ot.tiempo_reparacion_horas && ot.tiempo_reparacion_horas > 0) {
    msg += `⏱️ *Tiempo de reparación:* ${ot.tiempo_reparacion_horas} hrs\n`
  }
  if (ot.firma_cierre) {
    msg += `📌 *Validado por:* ${ot.firma_cierre}\n`
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
         `_Enviado desde CMMS · Sistema de Gestión de Mantenimiento_`

  return msg
}

/** Llama a la API de UltraMsg para enviar el mensaje */
async function enviarWhatsApp(telefono, mensaje) {
  if (!INSTANCE || !TOKEN) {
    throw new Error('Faltan las variables ULTRAMSG_INSTANCE y ULTRAMSG_TOKEN en el .env')
  }

  // Limpiar teléfono: solo dígitos, UltraMsg acepta formato internacional
  const tel = telefono.replace(/\D/g, '')
  if (!tel || tel.length < 10) {
    throw new Error('Número de teléfono inválido. Usa formato internacional (ej: 521234567890)')
  }

  const url = `https://api.ultramsg.com/${INSTANCE}/messages/chat`
  const body = new URLSearchParams({
    token: TOKEN,
    to:    `+${tel}`,
    body:  mensaje,
  })

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString()
  })

  const data = await res.json()

  // UltraMsg devuelve { sent: "true", ... } en éxito
  if (!res.ok || data.sent === 'false' || data.error) {
    throw new Error(data.error || `Error UltraMsg: HTTP ${res.status}`)
  }

  return data
}

// ── Rutas ─────────────────────────────────────────────────────

/**
 * POST /api/whatsapp/enviar
 * Body: { telefono, mensaje }
 * Envía un mensaje de texto libre.
 */
router.post('/enviar', async (req, res) => {
  try {
    const { telefono, mensaje } = req.body

    if (!telefono) return res.status(400).json({ success: false, error: 'El teléfono es obligatorio' })
    if (!mensaje)  return res.status(400).json({ success: false, error: 'El mensaje es obligatorio' })

    const resultado = await enviarWhatsApp(telefono, mensaje)

    res.json({
      success: true,
      mensaje: 'Mensaje enviado exitosamente',
      data: resultado
    })
  } catch (error) {
    console.error('Error WhatsApp:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/whatsapp/ot
 * Body: { telefono, ot: { ...campos OT } }
 * Construye el mensaje con formato de OT y lo envía.
 */
router.post('/ot', async (req, res) => {
  try {
    const { telefono, ot } = req.body

    if (!telefono) return res.status(400).json({ success: false, error: 'El teléfono del técnico es obligatorio' })
    if (!ot)       return res.status(400).json({ success: false, error: 'Los datos de la OT son obligatorios' })

    const mensaje   = generarMensajeOT(ot)
    const resultado = await enviarWhatsApp(telefono, mensaje)

    res.json({
      success: true,
      mensaje: `OT ${ot.numero_ot} enviada a ${telefono}`,
      data:    resultado
    })
  } catch (error) {
    console.error('Error WhatsApp OT:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
