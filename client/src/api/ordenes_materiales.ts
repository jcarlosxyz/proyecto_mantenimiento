const API_URL = '/api/ordenes-materiales'

export interface OrdenMaterial {
  id: string
  orden_id: string
  material_id: string
  cantidad: number
  costo_unitario_aplicado: number
  notas: string | null
  fecha_instalacion: string
  created_at: string
  materiales?: {
    nombre: string
    unidad: string
  }
}

export interface ListOrdenMaterialParams {
  orden_id?: string
}

export async function listarOrdenesMateriales(params: ListOrdenMaterialParams = {}) {
  const query = new URLSearchParams()
  if (params.orden_id) query.append('orden_id', params.orden_id)

  const res = await fetch(`${API_URL}?${query.toString()}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al listar consumo de materiales')
  }
  return res.json()
}

export async function registrarConsumoMaterial(data: {
  orden_id: string
  material_id: string
  cantidad: number
  notas?: string
  fecha_instalacion?: string
}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al registrar material')
  }
  return res.json()
}

export async function eliminarConsumoMaterial(id: string) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al eliminar consumo')
  }
  return res.json()
}
