/**
 * Email Service - CMMS
 * Envío de correos usando Nodemailer (SMTP)
 * 
 * Configura las variables en .env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

let nodemailer = null
try {
  nodemailer = require('nodemailer')
} catch {
  console.warn('[emailService] ⚠️  nodemailer no está instalado. Ejecuta: npm install nodemailer')
}

// Crear el transporter reutilizable
function crearTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true solo para puerto 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

/**
 * Envía un correo con los detalles de una Orden de Trabajo al técnico asignado.
 * @param {Object} ot       - Datos de la orden de trabajo
 * @param {string} emailTo  - Correo electrónico del técnico
 * @param {string} nombreTecnico - Nombre del técnico
 */
async function enviarCorreoOT(ot, emailTo, nombreTecnico) {
  if (!nodemailer) {
    console.warn('[emailService] ⚠️  nodemailer no disponible. Instala con: npm install nodemailer')
    return { skipped: true, razon: 'nodemailer no instalado' }
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[emailService] ⚠️  SMTP no configurado. Saltando envío de correo.')
    return { skipped: true, razon: 'SMTP no configurado en .env' }
  }

  if (!emailTo) {
    console.warn(`[emailService] ⚠️  El técnico "${nombreTecnico}" no tiene email registrado.`)
    return { skipped: true, razon: 'Técnico sin email' }
  }

  // Colores por prioridad para el email
  const colorPrioridad = {
    'P1 Emergencia': '#ef4444',
    'P2 Urgente':    '#f97316',
    'P3 Normal':     '#3b82f6',
    'P4 Mejora':     '#22c55e'
  }

  const color = colorPrioridad[ot.prioridad] || '#3b82f6'

  const fechaLimite = ot.fecha_limite_inicio
    ? new Date(ot.fecha_limite_inicio).toLocaleString('es-ES', {
        dateStyle: 'long', timeStyle: 'short'
      })
    : 'Por definir'

  const htmlBody = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Nueva Orden de Trabajo - ${ot.numero_ot}</title>
  </head>
  <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
      
      <!-- Encabezado -->
      <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:28px 32px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🔧</div>
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
          Nueva Orden de Trabajo Asignada
        </h1>
        <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">Sistema CMMS - Gestión de Mantenimiento</p>
      </div>

      <!-- Número OT -->
      <div style="background:#0f172a;padding:16px 32px;text-align:center;border-bottom:1px solid #334155;">
        <span style="background:${color};color:#fff;padding:8px 24px;border-radius:100px;font-size:20px;font-weight:800;letter-spacing:1px;">
          ${ot.numero_ot}
        </span>
      </div>

      <!-- Cuerpo -->
      <div style="padding:28px 32px;">
        <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">
          Hola <strong style="color:#e2e8f0;">${nombreTecnico}</strong>, se te ha asignado la siguiente orden de trabajo. Por favor revisa los detalles y comienza en el tiempo indicado.
        </p>

        <!-- Tabla de detalles -->
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:10px 0;color:#64748b;width:40%;vertical-align:top;">Activo (TAG)</td>
            <td style="padding:10px 0;color:#e2e8f0;font-weight:700;">${ot.activo_tag}</td>
          </tr>
          <tr style="border-top:1px solid #334155;">
            <td style="padding:10px 0;color:#64748b;vertical-align:top;">Tipo de Mantenimiento</td>
            <td style="padding:10px 0;color:#e2e8f0;font-weight:700;">${ot.tipo_mantenimiento}</td>
          </tr>
          <tr style="border-top:1px solid #334155;">
            <td style="padding:10px 0;color:#64748b;vertical-align:top;">Prioridad</td>
            <td style="padding:10px 0;">
              <span style="background:${color}22;color:${color};padding:3px 10px;border-radius:100px;font-weight:700;">
                ${ot.prioridad}
              </span>
            </td>
          </tr>
          <tr style="border-top:1px solid #334155;">
            <td style="padding:10px 0;color:#64748b;vertical-align:top;">Inicio máximo</td>
            <td style="padding:10px 0;color:#e2e8f0;font-weight:700;">${fechaLimite}</td>
          </tr>
          <tr style="border-top:1px solid #334155;">
            <td style="padding:10px 0;color:#64748b;vertical-align:top;">Descripción</td>
            <td style="padding:10px 0;color:#e2e8f0;">${ot.descripcion_problema}</td>
          </tr>
        </table>

        <!-- CTA -->
        <div style="margin-top:28px;text-align:center;">
          <p style="color:#64748b;font-size:12px;margin:16px 0 0;">
            Este correo fue generado automáticamente por el CMMS. No responder a este mensaje.
          </p>
        </div>
      </div>

      <!-- Pie -->
      <div style="background:#0f172a;padding:16px 32px;text-align:center;border-top:1px solid #334155;">
        <p style="color:#475569;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} Sistema CMMS — Gestión de Mantenimiento Industrial
        </p>
      </div>
    </div>
  </body>
  </html>
  `

  const transporter = crearTransporter()

  const info = await transporter.sendMail({
    from:    `"CMMS - Mantenimiento" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to:      emailTo,
    subject: `🔧 [${ot.numero_ot}] Nueva OT Asignada — ${ot.prioridad} | Activo: ${ot.activo_tag}`,
    html:    htmlBody
  })

  console.log(`[emailService] ✅ Correo enviado a ${emailTo} (MessageId: ${info.messageId})`)
  return { success: true, messageId: info.messageId }
}

module.exports = { enviarCorreoOT }
