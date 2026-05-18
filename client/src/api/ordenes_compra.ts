import { Material } from './materiales'
import { API_BASE_URL } from '../config'
const API_URL = `${API_BASE_URL}/api/ordenes-compra`

export interface OrdenCompra {
  id: string
  material_id: string
  cantidad: number
  proveedor: string
  tiempo_entrega: string
  estado: string
  created_at: string
  materiales?: Pick<Material, 'nombre' | 'unidad'>
}

export async function listarOrdenesCompra(material_id?: string) {
  const query = material_id ? `?material_id=${material_id}` : ''
  const res = await fetch(`${API_URL}${query}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al listar órdenes de compra')
  }
  return res.json()
}

export async function crearOrdenCompra(orden: Partial<OrdenCompra>) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orden)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.detalle ? `${error.error}: ${error.detalle}` : error.error || 'Error al crear orden de compra')
  }
  return res.json()
}

export async function actualizarEstadoOrdenCompra(id: string, estado: string) {
  const res = await fetch(`${API_URL}/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error al actualizar estado')
  }
  return res.json()
}

export async function recibirOrdenCompra(id: string) {
  const res = await fetch(`${API_URL}/${id}/recibir`, {
    method: 'POST'
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.detalle ? `${error.error}: ${error.detalle}` : error.error || 'Error al recibir material')
  }
  return res.json()
}
