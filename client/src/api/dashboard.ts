const API_URL = '/api/dashboard'

export interface DashboardData {
  generado: string
  kpis: {
    ordenes: {
      total: number; abiertas: number; enProceso: number; cerradas: number
      preventivas: number; correctivas: number; pctPreventivo: number
      p1Emergencias: number; mttr: number
      otsMes: number; cerradasMes: number
    }
    activos: {
      total: number; operativos: number; enMantenimiento: number
      fueraServicio: number; criticidadA: number; disponibilidad: number
    }
    planes: {
      total: number; vencidos: number; proximos3d: number; alDia: number
      cumplimientoPM: number; ejecutadosPM: number; programadosPM: number
    }
    materiales: {
      total: number; stockBajoMinimo: number; sinStock: number; valorInventario: number
    }
    tecnicos: { total: number }
  }
  graficos: {
    historialMeses: { mes: string; total: number; cerradas: number; preventivo: number; correctivo: number }[]
    cargaTecnicos: { nombre: string; abiertas: number; cerradas: number; total: number }[]
    estadosOT: { name: string; value: number; color: string }[]
    tiposOT: { name: string; value: number; color: string }[]
  }
  tablas: {
    otsPendientes: {
      id: string; estado: string; tipo_mantenimiento: string
      tecnico_asignado: string; prioridad: string; created_at: string; activo_tag: string
    }[]
  }
}

export async function obtenerDashboard(): Promise<DashboardData> {
  const res = await fetch(API_URL)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al obtener datos del dashboard')
  }
  const json = await res.json()
  return json
}
