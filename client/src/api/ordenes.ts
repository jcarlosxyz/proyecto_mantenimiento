import { API_BASE_URL } from '../config'
const API_URL = `${API_BASE_URL}/api/ordenes`

export interface OrdenTrabajo {
  id: string
  numero_ot: string
  activo_tag: string
  tipo_mantenimiento: string
  prioridad: string
  estado: string
  descripcion_problema: string
  tecnico_asignado: string
  fecha_limite_inicio: string
  trabajo_realizado?: string
  causa_raiz?: string
  tiempo_reparacion_horas?: number
  firma_cierre?: string
  created_at: string
}

export interface ListOrdenParams {
  pagina?: number
  limite?: number
  estado?: string
  prioridad?: string
  activo_tag?: string
}

export async function listarOrdenes(params: ListOrdenParams = {}) {
  const query = new URLSearchParams()
  if (params.pagina) query.append('pagina', params.pagina.toString())
  if (params.limite) query.append('limite', params.limite.toString())
  if (params.estado) query.append('estado', params.estado)
  if (params.prioridad) query.append('prioridad', params.prioridad)
  if (params.activo_tag) query.append('activo_tag', params.activo_tag)
  
  // Agregar parámetro cache-buster para forzar respuesta fresca en tiempo real
  query.append('_t', Date.now().toString())

  const res = await fetch(`${API_URL}?${query.toString()}`, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al listar OTs')
  }
  return res.json()
}

export async function obtenerOrden(id: string) {
  const res = await fetch(`${API_URL}/${id}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al obtener OT')
  }
  return res.json()
}

export async function crearOrden(data: Partial<OrdenTrabajo>) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const body = await res.json()
    // Adjuntar el body completo al error para que los componentes
    // puedan acceder a campos como 'detalle' y 'estado_activo'
    const err: any = new Error(body.error || 'Error al crear OT')
    err.responseBody = body
    throw err
  }
  return res.json()
}

export async function actualizarOrden(id: string, data: Record<string, any>) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const errorData = await res.json()
    // El backend puede retornar { errores: [...] } en validaciones
    if (errorData.errores && Array.isArray(errorData.errores)) {
      throw new Error(errorData.errores.join(' | '))
    }
    const mensaje = errorData.detalle
      ? `${errorData.error}: ${errorData.detalle}`
      : (errorData.error || 'Error al actualizar OT')
    throw new Error(mensaje)
  }
  return res.json()
}

export async function eliminarOrden(id: string) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al eliminar OT')
  }
  return res.json()
}
