//const API_URL = 'http://localhost:3000/api/materiales'
const API_URL = '/api/materiales'

export interface Material {
  id: string
  nombre: string
  unidad: string
  costo_unitario: number
  stock: number
  stock_minimo: number
  stock_maximo: number | null
  created_at: string
  updated_at: string
}

export interface PaginationInfo {
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export interface ListParams {
  pagina?: number
  limite?: number
  buscar?: string
}

export async function listarMateriales(params: ListParams = {}) {
  const query = new URLSearchParams()
  if (params.pagina) query.append('pagina', params.pagina.toString())
  if (params.limite) query.append('limite', params.limite.toString())
  if (params.buscar) query.append('buscar', params.buscar)

  const res = await fetch(`${API_URL}?${query.toString()}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al listar materiales')
  }
  return res.json()
}

export async function obtenerMaterial(id: string) {
  const res = await fetch(`${API_URL}/${id}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al obtener material')
  }
  return res.json()
}

export async function crearMaterial(material: Partial<Material>) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(material)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al crear material')
  }
  return res.json()
}

export async function actualizarMaterial(id: string, material: Partial<Material>) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(material)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al actualizar material')
  }
  return res.json()
}

export async function eliminarMaterial(id: string) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al eliminar material')
  }
  return res.json()
}
