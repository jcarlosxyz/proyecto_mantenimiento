const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export interface PlanMantenimiento {
  id: string
  activo_tag: string
  tarea: string
  frecuencia_dias: number
  tecnico_asignado: string | null
  ultima_ejecucion: string | null
  proxima_fecha: string
  estado: string
  checklist: string[]
  created_at: string
}

export const planesAPI = {
  // Listar planes (opcionalmente filtrados por activo_tag)
  getAll: async (activo_tag?: string): Promise<PlanMantenimiento[]> => {
    const url = activo_tag 
      ? `${API_URL}/planes?activo_tag=${activo_tag}` 
      : `${API_URL}/planes`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Error al obtener planes')
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    return json.data
  },

  // Crear nuevo plan
  create: async (data: Partial<PlanMantenimiento>): Promise<PlanMantenimiento> => {
    const res = await fetch(`${API_URL}/planes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.errores ? json.errores.join(', ') : json.error)
    return json.data
  },

  // Editar plan
  update: async (id: string, data: Partial<PlanMantenimiento>): Promise<PlanMantenimiento> => {
    const res = await fetch(`${API_URL}/planes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.errores ? json.errores.join(', ') : json.error)
    return json.data
  },

  // Ejecutar plan (generar OT)
  ejecutar: async (id: string): Promise<any> => {
    const res = await fetch(`${API_URL}/planes/${id}/ejecutar`, {
      method: 'POST'
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    return json
  },

  // Eliminar plan
  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/planes/${id}`, {
      method: 'DELETE'
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
  }
}
