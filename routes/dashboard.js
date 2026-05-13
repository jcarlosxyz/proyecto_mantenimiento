/**
 * API REST - Módulo 3: Dashboard de KPIs Ejecutivo
 * Agrega datos de todos los módulos para el tablero gerencial
 */
const express = require('express')
const router  = express.Router()
const { supabase } = require('../supabaseClient')

// Helper: calcula estado de plan igual que planes.js
function calcularEstadoPlan(proxima_fecha) {
  if (!proxima_fecha) return 'Sin fecha'
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const prox = new Date(proxima_fecha); prox.setHours(0,0,0,0)
  const difDias = Math.ceil((prox.getTime() - hoy.getTime()) / (1000 * 3600 * 24))
  if (difDias < 0) return 'Vencido'
  if (difDias <= 3) return 'Proximo en <3 dias'
  return 'Al dia'
}

// GET /api/dashboard  — devuelve todos los KPIs en una sola llamada
router.get('/', async (req, res) => {
  try {
    const hoy   = new Date()
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

    // ── 1. Órdenes de Trabajo ────────────────────────────────────
    const { data: ordenes, error: errOT } = await supabase
      .from('ordenes_trabajo')
      .select('id, estado, tipo_mantenimiento, tecnico_asignado, prioridad, created_at, fecha_cierre, tiempo_reparacion_horas, activo_tag')
      .order('created_at', { ascending: false })

    if (errOT) throw errOT

    const totalOT       = ordenes.length
    const abiertas      = ordenes.filter(o => o.estado === 'Abierta').length
    const enProceso     = ordenes.filter(o => o.estado === 'En proceso').length
    const cerradas      = ordenes.filter(o => o.estado === 'Cerrada').length
    const preventivas   = ordenes.filter(o => o.tipo_mantenimiento === 'Preventivo').length
    const correctivas   = ordenes.filter(o => o.tipo_mantenimiento === 'Correctivo').length
    const p1Count       = ordenes.filter(o => o.prioridad === 'P1 Emergencia').length

    // MTTR: promedio de tiempo_reparacion_horas de OTs cerradas
    const otsConTiempo = ordenes.filter(o => o.estado === 'Cerrada' && o.tiempo_reparacion_horas)
    const mttr = otsConTiempo.length > 0
      ? (otsConTiempo.reduce((acc, o) => acc + (o.tiempo_reparacion_horas || 0), 0) / otsConTiempo.length).toFixed(1)
      : 0

    // % Preventivo vs total
    const pctPreventivo = totalOT > 0 ? Math.round((preventivas / totalOT) * 100) : 0

    // OTs del mes actual
    const otsMes = ordenes.filter(o => o.created_at >= primerDiaMes)
    const cerradasMes = otsMes.filter(o => o.estado === 'Cerrada').length

    // Carga por técnico
    const cargaTecnico = {}
    ordenes.forEach(o => {
      const t = o.tecnico_asignado || 'Sin asignar'
      if (!cargaTecnico[t]) cargaTecnico[t] = { abiertas: 0, cerradas: 0, total: 0 }
      cargaTecnico[t].total++
      if (o.estado === 'Cerrada') cargaTecnico[t].cerradas++
      else cargaTecnico[t].abiertas++
    })
    const topTecnicos = Object.entries(cargaTecnico)
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    // Próximas OTs abiertas (las 5 más recientes abiertas/en proceso)
    const proximasOTs = ordenes
      .filter(o => o.estado === 'Abierta' || o.estado === 'En proceso')
      .slice(0, 6)

    // Historial mensual (últimos 6 meses)
    const historialMeses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      const fin    = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const mes    = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      const mes_ots = ordenes.filter(o => o.created_at >= inicio && o.created_at <= fin)
      historialMeses.push({
        mes,
        total:      mes_ots.length,
        cerradas:   mes_ots.filter(o => o.estado === 'Cerrada').length,
        preventivo: mes_ots.filter(o => o.tipo_mantenimiento === 'Preventivo').length,
        correctivo: mes_ots.filter(o => o.tipo_mantenimiento === 'Correctivo').length,
      })
    }

    // ── 2. Activos ───────────────────────────────────────────────
    const { data: activos, error: errAct } = await supabase
      .from('activos')
      .select('id, tag, nombre, estado, criticidad, area')
    if (errAct) throw errAct

    const totalActivos    = activos.length
    const operativos      = activos.filter(a => a.estado === 'Operativo').length
    const enMantenimiento = activos.filter(a => a.estado === 'En mantenimiento').length
    const fueraServicio   = activos.filter(a => a.estado === 'Fuera de servicio').length
    const criticidadA     = activos.filter(a => a.criticidad === 'A').length
    const disponibilidad  = totalActivos > 0 ? Math.round((operativos / totalActivos) * 100) : 100

    // ── 3. Planes PM ─────────────────────────────────────────────
    const { data: planes, error: errPlan } = await supabase
      .from('planes_mantenimiento')
      .select('id, cerrado, proxima_fecha, ultima_ejecucion, frecuencia_dias')
    if (errPlan) throw errPlan

    // Calcular estado dinámicamente (no existe como columna en BD)
    const planesConEstado = planes.map(p => ({ ...p, estado: calcularEstadoPlan(p.proxima_fecha) }))
    const planesActivos  = planesConEstado.filter(p => !p.cerrado)
    const vencidos       = planesActivos.filter(p => p.estado === 'Vencido').length
    const proximos3d     = planesActivos.filter(p => p.estado === 'Proximo en <3 dias').length
    const alDia          = planesActivos.filter(p => p.estado === 'Al dia').length

    // Cumplimiento mensual PM
    const mesActual = hoy.getMonth(), anioActual = hoy.getFullYear()
    let ejecutadosPM = 0, pendientesPM = 0
    planesActivos.forEach(p => {
      const fU = p.ultima_ejecucion ? new Date(p.ultima_ejecucion) : null
      const fP = new Date(p.proxima_fecha)
      const ejecutadoMes = fU && fU.getMonth() === mesActual && fU.getFullYear() === anioActual
      const venceMes = fP.getMonth() === mesActual && fP.getFullYear() === anioActual
      if (ejecutadoMes) ejecutadosPM++
      else if (venceMes || p.estado === 'Vencido') pendientesPM++
    })
    const programadosPM = ejecutadosPM + pendientesPM
    const cumplimientoPM = programadosPM === 0 ? 100 : Math.round((ejecutadosPM / programadosPM) * 100)

    // ── 4. Materiales / Inventario ───────────────────────────────
    const { data: materiales, error: errMat } = await supabase
      .from('materiales')
      .select('id, nombre, stock, stock_minimo, stock_maximo, costo_unitario')
    if (errMat) throw errMat

    const totalMateriales  = materiales.length
    const stockBajoMinimo  = materiales.filter(m => m.stock <= m.stock_minimo).length
    const sinStock         = materiales.filter(m => m.stock === 0).length
    const valorInventario  = materiales.reduce((acc, m) => acc + m.stock * m.costo_unitario, 0)

    // ── 5. Técnicos ──────────────────────────────────────────────
    const { data: tecnicos, error: errTec } = await supabase
      .from('tecnicos')
      .select('id, nombre, especialidad, turno')
    if (errTec) throw errTec

    const totalTecnicos = tecnicos.length

    // ── Respuesta final ──────────────────────────────────────────
    res.json({
      success: true,
      generado: new Date().toISOString(),
      kpis: {
        ordenes: {
          total: totalOT, abiertas, enProceso, cerradas,
          preventivas, correctivas, pctPreventivo,
          p1Emergencias: p1Count, mttr: Number(mttr),
          otsMes: otsMes.length, cerradasMes,
        },
        activos: {
          total: totalActivos, operativos, enMantenimiento,
          fueraServicio, criticidadA, disponibilidad,
        },
        planes: {
          total: planesActivos.length, vencidos, proximos3d, alDia,
          cumplimientoPM, ejecutadosPM, programadosPM,
        },
        materiales: {
          total: totalMateriales, stockBajoMinimo, sinStock,
          valorInventario: Math.round(valorInventario * 100) / 100,
        },
        tecnicos: { total: totalTecnicos },
      },
      graficos: {
        historialMeses,
        cargaTecnicos: topTecnicos,
        estadosOT: [
          { name: 'Abierta',    value: abiertas,  color: '#3b82f6' },
          { name: 'En proceso', value: enProceso,  color: '#f59e0b' },
          { name: 'Cerrada',    value: cerradas,   color: '#10b981' },
        ],
        tiposOT: [
          { name: 'Preventivo', value: preventivas, color: '#10b981' },
          { name: 'Correctivo', value: correctivas, color: '#ef4444' },
          { name: 'Predictivo', value: totalOT - preventivas - correctivas, color: '#8b5cf6' },
        ],
      },
      tablas: {
        otsPendientes: proximasOTs,
      },
    })
  } catch (err) {
    console.error('[dashboard.js] Error:', err.message)
    res.status(500).json({ success: false, error: 'Error al generar KPIs', detalle: err.message })
  }
})

module.exports = router
