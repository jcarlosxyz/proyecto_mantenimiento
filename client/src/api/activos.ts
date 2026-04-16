const API_BASE = '/api/activos'

export interface Activo {
  id: string
  tag: string
  nombre: string
  descripcion: string | null
  area: 'Produccion' | 'Servicios' | 'Utilidades'
  criticidad: 'A' | 'B' | 'C'
  estado: 'Operativo' | 'En mantenimiento' | 'Fuera de servicio'
  fabricante: string | null
  modelo: string | null
  numero_serie: string | null
  fecha_instalacion: string | null
  especificaciones_tecnicas: string | null
  imagen_url: string | null
  created_at: string
  updated_at: string
}

export interface ActivoInput {
  tag: string
  nombre: string
  descripcion?: string
  area: string
  criticidad: string
  fabricante?: string
  modelo?: string
  numero_serie?: string
  fecha_instalacion?: string
  especificaciones_tecnicas?: string
  imagen_url?: string
  estado?: string
}

export interface PaginationInfo {
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export interface ListResponse {
  success: boolean
  data: Activo[]
  paginacion: PaginationInfo
}

export interface SingleResponse {
  success: boolean
  data: Activo
  mensaje?: string
}

export interface ListParams {
  area?: string
  criticidad?: string
  estado?: string
  buscar?: string
  orden?: string
  direccion?: string
  pagina?: number
  limite?: number
}

// Listar activos con filtros y paginación
export async function listarActivos(params: ListParams = {}): Promise<ListResponse> {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const url = `${API_BASE}?${searchParams.toString()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al obtener activos')
  return res.json()
}

// Obtener un activo por ID
export async function obtenerActivo(id: string): Promise<SingleResponse> {
  const res = await fetch(`${API_BASE}/${id}`)
  if (!res.ok) throw new Error('Activo no encontrado')
  return res.json()
}

// Crear un nuevo activo
export async function crearActivo(activo: ActivoInput): Promise<SingleResponse> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activo)
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.errores?.join(', ') || data.error || 'Error al crear activo')
  }
  return data
}

// Actualizar un activo
export async function actualizarActivo(id: string, activo: Partial<ActivoInput>): Promise<SingleResponse> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activo)
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.errores?.join(', ') || data.error || 'Error al actualizar activo')
  }
  return data
}

// Cambiar estado de un activo
export async function cambiarEstado(id: string, estado: string): Promise<SingleResponse> {
  const res = await fetch(`${API_BASE}/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al cambiar estado')
  return data
}

// Eliminar un activo
export async function eliminarActivo(id: string): Promise<{ success: boolean; mensaje: string }> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE'
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al eliminar activo')
  return data
}

// ============================================================
// Upload de imágenes
// ============================================================

export interface UploadResponse {
  success: boolean
  mensaje: string
  data: {
    path: string
    url: string
    nombre_original: string
    tamaño: number
  }
}

// Subir imagen de activo
export async function subirImagen(file: File, activoId?: string): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('imagen', file)
  if (activoId) formData.append('activo_id', activoId)

  const res = await fetch('/api/upload/imagen', {
    method: 'POST',
    body: formData
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al subir imagen')
  return data
}

// Eliminar imagen de activo
export async function eliminarImagen(path: string): Promise<{ success: boolean }> {
  const res = await fetch('/api/upload/imagen', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al eliminar imagen')
  return data
}
