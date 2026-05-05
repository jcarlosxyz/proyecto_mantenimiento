/**
 * API REST - Módulo 4: Planes de Mantenimiento Preventivo (PM)
 * CRUD completo para la tabla 'planes_mantenimiento' en Supabase
 */

const express = require('express')
const router = express.Router()
const { supabase } = require('../supabaseClient')
const { enviarCorreoOT } = require('../lib/emailService')

// ============================================================
// Función para calcular estado del plan
// ============================================================
function calcularEstadoPlan(proxima_fecha) {
  if (!proxima_fecha) return 'Sin fecha'
  
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  
  const prox = new Date(proxima_fecha)
  prox.setHours(0, 0, 0, 0)
  
  const difTiempo = prox.getTime() - hoy.getTime()
  const difDias = Math.ceil(difTiempo / (1000 * 3600 * 24))

  if (difDias < 0) return 'Vencido'
  if (difDias <= 3) return 'Proximo en <3 dias'
  return 'Al dia'
}

// ============================================================
// GET /api/planes - Listar planes
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { activo_tag } = req.query

    let query = supabase.from('planes_mantenimiento').select('*').order('created_at', { ascending: false })
    if (activo_tag) {
      query = query.eq('activo_tag', activo_tag.toUpperCase())
    }

    const { data, error } = await query
    if (error) throw error

    // Calcular estado dinámico
    const planesConEstado = data.map(plan => ({
      ...plan,
      estado: calcularEstadoPlan(plan.proxima_fecha)
    }))

    res.json({ success: true, data: planesConEstado })
  } catch (error) {
    console.error('Error al listar planes:', error.message)
    res.status(500).json({ success: false, error: 'Error al listar planes', detalle: error.message })
  }
})

// ============================================================
// POST /api/planes - Crear plan
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { activo_tag, tarea, frecuencia_dias, checklist, tecnico_asignado } = req.body

    const errores = []
    if (!activo_tag) errores.push('El Activo (TAG) es obligatorio')
    if (!tarea) errores.push('La Tarea es obligatoria')
    if (!frecuencia_dias || isNaN(frecuencia_dias) || frecuencia_dias <= 0) errores.push('La Frecuencia debe ser un número positivo')

    if (errores.length > 0) return res.status(400).json({ success: false, errores })

    // Calcular próxima fecha (hoy + frecuencia_dias)
    const proxima_fecha = new Date()
    proxima_fecha.setDate(proxima_fecha.getDate() + parseInt(frecuencia_dias))

    const nuevoPlan = {
      activo_tag: activo_tag.toUpperCase(),
      tarea,
      frecuencia_dias: parseInt(frecuencia_dias),
      tecnico_asignado: tecnico_asignado || null,
      checklist: checklist || [], // Array of strings
      ultima_ejecucion: null,
      proxima_fecha: proxima_fecha.toISOString().split('T')[0] // solo fecha YYYY-MM-DD
    }

    const { data, error } = await supabase.from('planes_mantenimiento').insert(nuevoPlan).select().single()
    if (error) throw error

    // Calcular estado
    data.estado = calcularEstadoPlan(data.proxima_fecha)

    res.status(201).json({ success: true, mensaje: 'Plan creado exitosamente', data })
  } catch (error) {
    console.error('Error al crear plan:', error.message)
    res.status(500).json({ success: false, error: 'Error al crear plan', detalle: error.message })
  }
})

// ============================================================
// POST /api/planes/:id/ejecutar - Ejecutar plan (crear OT)
// ============================================================
router.post('/:id/ejecutar', async (req, res) => {
  try {
    const { id } = req.params

    // 1. Obtener el plan
    const { data: plan, error: errPlan } = await supabase
      .from('planes_mantenimiento')
      .select('*')
      .eq('id', id)
      .single()

    if (errPlan || !plan) {
      return res.status(404).json({ success: false, error: 'Plan no encontrado' })
    }

    // 2. Generar número de OT
    // Reutilizar la lógica de ordenes.js mediante una llamada HTTP o directamente en DB (simplificado aquí)
    const year = new Date().getFullYear()
    const { data: ultOts } = await supabase
      .from('ordenes_trabajo')
      .select('numero_ot')
      .ilike('numero_ot', `OT-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      
    let correlativo = 1
    if (ultOts && ultOts.length > 0) {
      const ultimoNumero = ultOts[0].numero_ot.split('-')[2]
      correlativo = parseInt(ultimoNumero, 10) + 1
    }
    const numero_ot = `OT-${year}-${correlativo.toString().padStart(4, '0')}`

    // 3. Crear OT
    // Fecha limite P3 Normal -> 48h
    const fecha_limite = new Date()
    fecha_limite.setHours(fecha_limite.getHours() + 48)

    // Formatear checklist como descripción
    let descripcion_problema = `Plan de Mantenimiento: ${plan.tarea}`
    if (plan.checklist && plan.checklist.length > 0) {
      descripcion_problema += '\n\nChecklist:\n' + plan.checklist.map(i => `- [ ] ${i}`).join('\n')
    }

    const nuevaOT = {
      numero_ot,
      activo_tag: plan.activo_tag,
      tipo_mantenimiento: 'Preventivo',
      prioridad: 'P3 Normal',
      descripcion_problema,
      tecnico_asignado: plan.tecnico_asignado || 'Por Asignar', // Evita error de restricción NOT NULL en BD
      estado: 'Abierta',
      fecha_limite_inicio: fecha_limite.toISOString()
    }

    const { data: otData, error: errOT } = await supabase.from('ordenes_trabajo').insert(nuevaOT).select().single()
    if (errOT) throw errOT

    // 4. Actualizar estado del activo a En mantenimiento
    await supabase.from('activos').update({ estado: 'En mantenimiento' }).eq('tag', plan.activo_tag)

    // 5. Actualizar el plan (ultima_ejecucion = hoy, proxima_fecha = hoy + frecuencia_dias)
    const hoy = new Date()
    const nuevaProxFecha = new Date()
    nuevaProxFecha.setDate(hoy.getDate() + plan.frecuencia_dias)

    const { data: planActualizado, error: errUpdatePlan } = await supabase
      .from('planes_mantenimiento')
      .update({
        ultima_ejecucion: hoy.toISOString().split('T')[0],
        proxima_fecha: nuevaProxFecha.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', plan.id)
      .select()
      .single()

    if (errUpdatePlan) throw errUpdatePlan

    res.json({
      success: true, 
      mensaje: 'Plan ejecutado: OT Preventiva generada exitosamente', 
      orden_trabajo: otData,
      plan: { ...planActualizado, estado: calcularEstadoPlan(planActualizado.proxima_fecha) }
    })

    // ── Enviar correo al técnico (no bloqueante) ──────────────────────────────
    if (otData && otData.tecnico_asignado && otData.tecnico_asignado !== 'Por Asignar') {
      setImmediate(async () => {
        try {
          const { data: tecnico } = await supabase
            .from('tecnicos')
            .select('nombre, email')
            .ilike('nombre', `%${otData.tecnico_asignado}%`)
            .limit(1)
            .single()

          const emailResult = await enviarCorreoOT(
            otData,
            tecnico?.email || null,
            tecnico?.nombre || otData.tecnico_asignado
          )
          if (emailResult?.skipped) {
            console.log(`[planes.js] ⚠️  Correo no enviado: ${emailResult.razon}`)
          }
        } catch (emailErr) {
          console.error('[planes.js] ❌ Error al enviar correo:', emailErr.message)
        }
      })
    }
    // ─────────────────────────────────────────────────────────────

  } catch (error) {
    console.error('Error al ejecutar plan:', error.message)
    res.status(500).json({ success: false, error: 'Error al ejecutar plan', detalle: error.message })
  }
})

// ============================================================
// POST /api/planes/:id/cerrar - Cerrar un plan de mantenimiento
// ============================================================
router.post('/:id/cerrar', async (req, res) => {
  try {
    const { id } = req.params

    const { data: plan, error: errPlan } = await supabase
      .from('planes_mantenimiento')
      .select('id, cerrado')
      .eq('id', id)
      .single()

    if (errPlan || !plan) {
      return res.status(404).json({ success: false, error: 'Plan no encontrado' })
    }

    const { data, error } = await supabase
      .from('planes_mantenimiento')
      .update({ 
        cerrado: true,
        fecha_cierre: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, mensaje: 'Plan cerrado correctamente', data })
  } catch (error) {
    console.error('Error al cerrar plan:', error.message)
    res.status(500).json({ success: false, error: 'Error al cerrar plan', detalle: error.message })
  }
})

// ============================================================
// PUT /api/planes/:id - Editar plan
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { activo_tag, tarea, frecuencia_dias, checklist, tecnico_asignado } = req.body

    const errores = []
    if (!activo_tag) errores.push('El Activo (TAG) es obligatorio')
    if (!tarea) errores.push('La Tarea es obligatoria')
    if (!frecuencia_dias || isNaN(frecuencia_dias) || frecuencia_dias <= 0) errores.push('La Frecuencia debe ser un número positivo')

    if (errores.length > 0) return res.status(400).json({ success: false, errores })

    // Obtener plan actual para no sobreescribir ultima_ejecucion
    const { data: planActual, error: errPlan } = await supabase.from('planes_mantenimiento').select('*').eq('id', id).single()
    if (errPlan || !planActual) return res.status(404).json({ success: false, error: 'Plan no encontrado' })

    // Si la frecuencia cambia, se podría recalcular la próxima fecha. Para simplificar, la recalculamos desde hoy o mantenemos la lógica base.
    let proxima_fecha = planActual.proxima_fecha
    if (planActual.frecuencia_dias !== parseInt(frecuencia_dias)) {
      const fechaBase = planActual.ultima_ejecucion ? new Date(planActual.ultima_ejecucion) : new Date()
      fechaBase.setDate(fechaBase.getDate() + parseInt(frecuencia_dias))
      proxima_fecha = fechaBase.toISOString().split('T')[0]
    }

    const actualizacion = {
      activo_tag: activo_tag.toUpperCase(),
      tarea,
      frecuencia_dias: parseInt(frecuencia_dias),
      tecnico_asignado: tecnico_asignado || null,
      checklist: checklist || [],
      proxima_fecha,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('planes_mantenimiento').update(actualizacion).eq('id', id).select().single()
    if (error) throw error

    data.estado = calcularEstadoPlan(data.proxima_fecha)
    res.json({ success: true, mensaje: 'Plan actualizado exitosamente', data })
  } catch (error) {
    console.error('Error al actualizar plan:', error.message)
    res.status(500).json({ success: false, error: 'Error al actualizar plan', detalle: error.message })
  }
})

// ============================================================
// DELETE /api/planes/:id - Eliminar plan
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabase.from('planes_mantenimiento').delete().eq('id', id)
    if (error) throw error
    res.json({ success: true, mensaje: 'Plan eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar plan:', error.message)
    res.status(500).json({ success: false, error: 'Error al eliminar plan', detalle: error.message })
  }
})

module.exports = router
