/**
 * Utilidad para compartir Órdenes de Trabajo por WhatsApp
 * 
 * - enviarOTPorWhatsApp(): Envía directamente vía backend (UltraMsg API) ← RECOMENDADO
 * - compartirPorWhatsApp(): Abre wa.me en el navegador (fallback sin API)
 */

export interface EnvioResult {
  success: boolean;
  mensaje?: string;
  error?: string;
}

export interface DatosOT {
  numero_ot: string;
  activo_tag: string;
  tipo_mantenimiento: string;
  prioridad: string;
  estado: string;
  tecnico_asignado: string;
  descripcion_problema: string;
  fecha_limite_inicio?: string;
  trabajo_realizado?: string;
  causa_raiz?: string;
  tiempo_reparacion_horas?: number;
  firma_cierre?: string;
}

const EMOJIS_PRIORIDAD: Record<string, string> = {
  'P1 Emergencia': '🔴',
  'P2 Urgente':    '🟠',
  'P3 Normal':     '🟡',
  'P4 Mejora':     '🟢',
};

const EMOJIS_ESTADO: Record<string, string> = {
  'Abierta':    '📋',
  'En proceso': '⚙️',
  'En espera':  '⏸️',
  'Cerrada':    '✅',
};

/**
 * Genera el texto del mensaje WhatsApp para una OT.
 */
export function generarMensajeWhatsApp(ot: DatosOT): string {
  const priEmoji  = EMOJIS_PRIORIDAD[ot.prioridad]  ?? '⚠️';
  const estEmoji  = EMOJIS_ESTADO[ot.estado]          ?? '📄';
  const fechaLimite = ot.fecha_limite_inicio
    ? new Date(ot.fecha_limite_inicio).toLocaleString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : 'N/A';

  let mensaje =
    `🔧 *ORDEN DE TRABAJO - ${ot.numero_ot}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${estEmoji} *Estado:* ${ot.estado}\n` +
    `${priEmoji} *Prioridad:* ${ot.prioridad}\n` +
    `🏷️ *Activo (TAG):* ${ot.activo_tag}\n` +
    `🔩 *Tipo:* ${ot.tipo_mantenimiento}\n` +
    `👷 *Técnico:* ${ot.tecnico_asignado}\n` +
    `⏰ *Límite de inicio:* ${fechaLimite}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📝 *Descripción del problema:*\n${ot.descripcion_problema}\n`;

  if (ot.trabajo_realizado) {
    mensaje += `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `✅ *Trabajo realizado:*\n${ot.trabajo_realizado}\n`;
  }
  if (ot.causa_raiz) {
    mensaje += `🔍 *Causa raíz:* ${ot.causa_raiz}\n`;
  }
  if (ot.tiempo_reparacion_horas && ot.tiempo_reparacion_horas > 0) {
    mensaje += `⏱️ *Tiempo de reparación:* ${ot.tiempo_reparacion_horas} hrs\n`;
  }
  if (ot.firma_cierre) {
    mensaje += `📌 *Validado por:* ${ot.firma_cierre}\n`;
  }

  mensaje += `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
             `_Enviado desde CMMS · Sistema de Gestión de Mantenimiento_`;

  return mensaje;
}

/**
 * Abre WhatsApp con el mensaje pre-rellenado (fallback sin API).
 * @param ot       Datos de la OT
 * @param telefono Teléfono del técnico (opcional).
 */
export function compartirPorWhatsApp(ot: DatosOT, telefono?: string): void {
  const texto  = generarMensajeWhatsApp(ot);
  const encoded = encodeURIComponent(texto);

  const tel = telefono ? telefono.replace(/\D/g, '') : '';
  const url = tel
    ? `https://wa.me/${tel}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * ✅ Envía la OT DIRECTAMENTE por WhatsApp vía backend (UltraMsg API).
 * No abre ningún navegador ni pestaña.
 * Requiere ULTRAMSG_INSTANCE y ULTRAMSG_TOKEN configurados en el .env del servidor.
 *
 * @param telefono  Teléfono del técnico en formato internacional (ej: 521234567890)
 * @param ot        Datos de la Orden de Trabajo
 */
export async function enviarOTPorWhatsApp(
  telefono: string,
  ot: DatosOT
): Promise<EnvioResult> {
  try {
    const res = await fetch('/api/whatsapp/ot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono, ot })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Error al enviar por WhatsApp' };
    }

    return { success: true, mensaje: data.mensaje };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}
