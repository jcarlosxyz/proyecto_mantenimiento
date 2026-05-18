/**
 * Email Service - CMMS
 * Estrategia de envío (en orden de prioridad):
 *
 *   1. Resend  (RESEND_API_KEY definida) — usa HTTPS/443, funciona en Railway
 *   2. Nodemailer SMTP (SMTP_USER + SMTP_PASS)  — solo para desarrollo local
 *
 * Variables de entorno:
 *   RESEND_API_KEY  → obtén una gratis en https://resend.com
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM  (fallback local)
 */

// ── Resend (preferido en producción) ──────────────────────────────
let ResendClient = null
try {
  const { Resend } = require('resend')
  ResendClient = Resend
} catch {
  // resend no instalado todavía — ignorar
}

// ── Nodemailer (fallback local) ───────────────────────────────────
let nodemailer = null
try {
  nodemailer = require('nodemailer')
} catch {
  console.warn('[emailService] ⚠️  nodemailer no está instalado.')
}

// ── Detectar método disponible ────────────────────────────────────
function detectarMetodo() {
  if (ResendClient && process.env.RESEND_API_KEY) return 'resend'
  if (nodemailer && process.env.SMTP_USER && process.env.SMTP_PASS) return 'nodemailer'
  return null
}

// ── Transporter Nodemailer (solo como fallback) ───────────────────
function crearTransporterNM() {
  const host   = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port   = parseInt(process.env.SMTP_PORT || '587')
  const secure = process.env.SMTP_PORT === '465'
  const user   = process.env.SMTP_USER
  const pass   = process.env.SMTP_PASS

  console.log(`[emailService] 🔧 SMTP → host=${host} port=${port} secure=${secure} user=${user || 'NO DEFINIDO'}`)

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls:    { rejectUnauthorized: false },
    family: 4 // forzar IPv4
  })
}

// ── Función interna: enviar via Resend ────────────────────────────
async function enviarViaResend({ from, to, subject, html }) {
  const resend = new ResendClient(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({ from, to, subject, html })
  if (error) throw new Error(error.message || JSON.stringify(error))
  console.log(`[emailService] ✅ Resend OK → id=${data.id} to=${to}`)
  return { success: true, messageId: data.id }
}

// ── Función interna: enviar via Nodemailer ────────────────────────
async function enviarViaNM({ from, to, subject, html }) {
  const transporter = crearTransporterNM()
  const info = await transporter.sendMail({ from, to, subject, html })
  console.log(`[emailService] ✅ Nodemailer OK → messageId=${info.messageId} to=${to}`)
  return { success: true, messageId: info.messageId }
}

// ── Despachador principal ─────────────────────────────────────────
async function enviarCorreo({ from, to, subject, html }) {
  const metodo = detectarMetodo()
  console.log(`[emailService] 📤 Método seleccionado: ${metodo || 'NINGUNO'} | to=${to}`)

  if (!metodo) {
    console.warn('[emailService] ⚠️  No hay método de envío configurado (RESEND_API_KEY o SMTP_USER/PASS)')
    return { skipped: true, razon: 'Sin configuración de email' }
  }
  if (!to) {
    console.warn('[emailService] ⚠️  No se especificó destinatario')
    return { skipped: true, razon: 'Sin destinatario' }
  }

  const fromField = from
    || process.env.SMTP_FROM
    || (metodo === 'resend' ? 'CMMS <onboarding@resend.dev>' : process.env.SMTP_USER)
    || 'CMMS <onboarding@resend.dev>'
  if (metodo === 'resend') return enviarViaResend({ from: fromField, to, subject, html })
  return enviarViaNM({ from: fromField, to, subject, html })
}

// ═══════════════════════════════════════════════════════════════════
// PLANTILLAS HTML
// ═══════════════════════════════════════════════════════════════════

/**
 * Envía correo de apertura de OT al técnico asignado.
 */
async function enviarCorreoOT(ot, emailTo, nombreTecnico) {
  if (!emailTo) {
    console.warn(`[emailService] ⚠️  Técnico "${nombreTecnico}" no tiene email registrado.`)
    return { skipped: true, razon: 'Técnico sin email' }
  }

  const colorPrioridad = {
    'P1 Emergencia': '#ef4444',
    'P2 Urgente':    '#f97316',
    'P3 Normal':     '#3b82f6',
    'P4 Mejora':     '#22c55e'
  }
  const color = colorPrioridad[ot.prioridad] || '#3b82f6'

  const fechaLimite = ot.fecha_limite_inicio
    ? new Date(ot.fecha_limite_inicio).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
    : 'Por definir'

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8"/><title>Nueva OT - ${ot.numero_ot}</title></head>
  <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
      <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:28px 32px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🔧</div>
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Nueva Orden de Trabajo Asignada</h1>
        <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">Sistema CMMS - Gestión de Mantenimiento</p>
      </div>
      <div style="background:#0f172a;padding:16px 32px;text-align:center;border-bottom:1px solid #334155;">
        <span style="background:${color};color:#fff;padding:8px 24px;border-radius:100px;font-size:20px;font-weight:800;">${ot.numero_ot}</span>
      </div>
      <div style="padding:28px 32px;">
        <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">
          Hola <strong style="color:#e2e8f0;">${nombreTecnico}</strong>, se te ha asignado la siguiente orden de trabajo.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:10px 0;color:#64748b;width:40%;">Activo (TAG)</td><td style="padding:10px 0;color:#e2e8f0;font-weight:700;">${ot.activo_tag}</td></tr>
          <tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;">Tipo</td><td style="padding:10px 0;color:#e2e8f0;font-weight:700;">${ot.tipo_mantenimiento}</td></tr>
          <tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;">Prioridad</td>
            <td style="padding:10px 0;"><span style="background:${color}22;color:${color};padding:3px 10px;border-radius:100px;font-weight:700;">${ot.prioridad}</span></td>
          </tr>
          <tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;">Inicio máximo</td><td style="padding:10px 0;color:#e2e8f0;font-weight:700;">${fechaLimite}</td></tr>
          <tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;">Descripción</td><td style="padding:10px 0;color:#e2e8f0;">${ot.descripcion_problema}</td></tr>
        </table>
        <p style="color:#64748b;font-size:12px;margin:28px 0 0;text-align:center;">Este correo fue generado automáticamente por el CMMS.</p>
      </div>
      <div style="background:#0f172a;padding:16px 32px;text-align:center;border-top:1px solid #334155;">
        <p style="color:#475569;font-size:12px;margin:0;">© ${new Date().getFullYear()} Sistema CMMS — Gestión de Mantenimiento Industrial</p>
      </div>
    </div>
  </body></html>`

  return enviarCorreo({
    to:      emailTo,
    subject: `🔧 [${ot.numero_ot}] Nueva OT Asignada — ${ot.prioridad} | Activo: ${ot.activo_tag}`,
    html
  })
}

/**
 * Envía correo de cierre de OT al técnico.
 */
async function enviarCorreoCierreOT(ot, emailTo, nombreTecnico) {
  if (!emailTo) {
    console.warn(`[emailService] ⚠️  Técnico "${nombreTecnico}" no tiene email registrado.`)
    return { skipped: true, razon: 'Técnico sin email' }
  }

  const fechaCierre = ot.fecha_cierre
    ? new Date(ot.fecha_cierre).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
    : new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })

  const tiempoRep = ot.tiempo_reparacion_horas ? `${ot.tiempo_reparacion_horas} hora(s)` : 'No registrado'

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8"/><title>OT Cerrada - ${ot.numero_ot}</title></head>
  <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
      <div style="background:linear-gradient(135deg,#065f46,#0f172a);padding:28px 32px;text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">✅</div>
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Orden de Trabajo Cerrada</h1>
        <p style="color:#6ee7b7;margin:8px 0 0;font-size:14px;">Sistema CMMS - Gestión de Mantenimiento</p>
      </div>
      <div style="background:#0f172a;padding:16px 32px;text-align:center;border-bottom:1px solid #334155;">
        <span style="background:#10b981;color:#fff;padding:8px 24px;border-radius:100px;font-size:20px;font-weight:800;">${ot.numero_ot}</span>
      </div>
      <div style="padding:28px 32px;">
        <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">
          Hola <strong style="color:#e2e8f0;">${nombreTecnico}</strong>, la OT ha sido <strong style="color:#10b981;">cerrada exitosamente</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:10px 0;color:#64748b;width:40%;">Activo (TAG)</td><td style="padding:10px 0;color:#e2e8f0;font-weight:700;">${ot.activo_tag}</td></tr>
          <tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;">Tipo</td><td style="padding:10px 0;color:#e2e8f0;font-weight:700;">${ot.tipo_mantenimiento}</td></tr>
          <tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;">Fecha de Cierre</td><td style="padding:10px 0;color:#10b981;font-weight:700;">${fechaCierre}</td></tr>
          <tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;">Tiempo de Reparación</td><td style="padding:10px 0;color:#e2e8f0;font-weight:700;">${tiempoRep}</td></tr>
          ${ot.trabajo_realizado ? `<tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;">Trabajo Realizado</td><td style="padding:10px 0;color:#e2e8f0;">${ot.trabajo_realizado}</td></tr>` : ''}
          ${ot.causa_raiz ? `<tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;">Causa Raíz</td><td style="padding:10px 0;color:#e2e8f0;">${ot.causa_raiz}</td></tr>` : ''}
          ${ot.firma_cierre ? `<tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;">Firma de Cierre</td><td style="padding:10px 0;color:#e2e8f0;font-style:italic;">${ot.firma_cierre}</td></tr>` : ''}
        </table>
        ${ot.materiales_usados ? `
        <div style="margin-top:20px;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;">
          <p style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">🔩 Materiales Utilizados</p>
          <p style="color:#e2e8f0;font-size:14px;margin:0;line-height:1.6;white-space:pre-line;">${ot.materiales_usados}</p>
        </div>` : ''}
        <div style="margin-top:24px;text-align:center;padding:16px;background:#065f4620;border-radius:12px;border:1px solid #10b98130;">
          <span style="color:#10b981;font-size:15px;font-weight:700;">🎉 OT finalizada — Activo devuelto a estado Operativo</span>
        </div>
        <p style="color:#64748b;font-size:12px;margin:20px 0 0;text-align:center;">Este correo fue generado automáticamente por el CMMS.</p>
      </div>
      <div style="background:#0f172a;padding:16px 32px;text-align:center;border-top:1px solid #334155;">
        <p style="color:#475569;font-size:12px;margin:0;">© ${new Date().getFullYear()} Sistema CMMS — Gestión de Mantenimiento Industrial</p>
      </div>
    </div>
  </body></html>`

  return enviarCorreo({
    to:      emailTo,
    subject: `✅ [${ot.numero_ot}] OT Cerrada — ${ot.activo_tag} | ${ot.tipo_mantenimiento}`,
    html
  })
}

/**
 * Prueba la conexión de email (Resend o SMTP).
 */
async function testSMTP(destinatario) {
  const metodo = detectarMetodo()
  console.log(`[emailService] 🔍 testSMTP → método=${metodo || 'NINGUNO'}`)

  if (!metodo) {
    return { error: 'Sin configuración de email: define RESEND_API_KEY o SMTP_USER+SMTP_PASS' }
  }

  try {
    // Si es nodemailer, verificar conexión primero
    if (metodo === 'nodemailer') {
      const transporter = crearTransporterNM()
      await transporter.verify()
      console.log('[emailService] ✅ Conexión SMTP verificada')
    }

    const to = destinatario || process.env.SMTP_USER || 'test@example.com'
    const result = await enviarCorreo({
      to,
      subject: '✅ Test Email - CMMS funcionando',
      html: `<p>Correo de prueba del Sistema CMMS. Método usado: <strong>${metodo}</strong>.<br>Si lo recibes, el servicio de email está correctamente configurado en Railway.</p>`
    })
    return result
  } catch (err) {
    console.error('[emailService] ❌ Error en testSMTP:', err.message)
    return { error: err.message, code: err.code }
  }
}

module.exports = { enviarCorreoOT, enviarCorreoCierreOT, testSMTP }
