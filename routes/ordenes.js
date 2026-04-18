/**
 * API REST - Módulo 2: Órdenes de Trabajo (OT)
 * CRUD completo para la tabla 'ordenes_trabajo' en Supabase
 */

const express = require('express')
const router = express.Router()
const { supabase } = require('../supabaseClient')

// Función auxiliar para calcular fecha límite según prioridad
function calcularFechaLimite(prioridad) {
  const ahora = new Date()
  switch (prioridad) {
    case 'P1 Emergencia':
      ahora.setHours(ahora.getHours() + 1)
      break
    case 'P2 Urgente':
      ahora.setHours(ahora.getHours() + 4)
      break
    case 'P3 Normal':
      ahora.setHours(ahora.getHours() + 48)
      break
    case 'P4 Mejora':
      ahora.setDate(ahora.getDate() + 7) // 1 semana aprox
      break
  }
  return ahora.toISOString()
}

// Función auxiliar para generar número de OT (ejemplo: OT-YYYY-NNNN)
async function generarNumeroOT() {
  const fecha = new Date()
  const year = fecha.getFullYear()
  
  // Buscar la última OT de este año para incrementar el correlativo
  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .select('numero_ot')
    .ilike('numero_ot', `OT-${year}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    
  let correlativo = 1
  if (!error && data && data.length > 0) {
    const ultimoNumero = data[0].numero_ot.split('-')[2]
    correlativo = parseInt(ultimoNumero, 10) + 1
  }
  
  const numConCeros = correlativo.toString().padStart(4, '0')
  return `OT-${year}-${numConCeros}`
}

// ============================================================
// GET /api/ordenes - Listar todas las OT (con filtros)
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { estado, prioridad, tipo_mantenimiento, activo_tag, pagina = 1, limite = 20 } = req.query
    
    const paginaNum = parseInt(pagina)
    const limiteNum = parseInt(limite)
    const offset = (paginaNum - 1) * limiteNum

    let query = supabase.from('ordenes_trabajo').select('*', { count: 'exact' })

    if (estado) query = query.eq('estado', estado)
    if (prioridad) query = query.eq('prioridad', prioridad)
    if (tipo_mantenimiento) query = query.eq('tipo_mantenimiento', tipo_mantenimiento)
    if (activo_tag) query = query.eq('activo_tag', activo_tag.toUpperCase())

    query = query.order('created_at', { ascending: false }).range(offset, offset + limiteNum - 1)

    const { data, error, count } = await query

    if (error) throw error

    res.json({
      success: true,
      data,
      paginacion: { total: count, pagina: paginaNum, limite: limiteNum, totalPaginas: Math.ceil(count / limiteNum) }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar las OTs', detalle: error.message })
  }
})

// ============================================================
// GET /api/ordenes/:id - Obtener una OT por ID o por Numero de OT
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    // Si contiene "OT", buscamos por numero_ot
    const campoBusqueda = id.toUpperCase().startsWith('OT-') ? 'numero_ot' : 'id'

    const { data, error } = await supabase
      .from('ordenes_trabajo')
      .select('*')
      .eq(campoBusqueda, id.toUpperCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'OT no encontrada' })
      throw error
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener la OT', detalle: error.message })
  }
})

// ============================================================
// POST /api/ordenes - Crear nueva Orden de Trabajo
// ============================================================
router.post('/', async (req, res) => {
  try {
    const {
      activo_tag,
      tipo_mantenimiento,
      prioridad,
      descripcion_problema,
      tecnico_asignado
    } = req.body

    const errores = []
    if (!activo_tag) errores.push('El Activo (TAG) es obligatorio')
    if (!tipo_mantenimiento) errores.push('El Tipo de mantenimiento es obligatorio')
    if (!prioridad) errores.push('La Prioridad es obligatoria')
    if (!descripcion_problema) errores.push('La Descripcion del problema es obligatoria')
    if (!tecnico_asignado) errores.push('El Tecnico asignado es obligatorio')

    const tiposMantenimientoValidos = ['Correctivo', 'Preventivo', 'Predictivo']
    if (tipo_mantenimiento && !tiposMantenimientoValidos.includes(tipo_mantenimiento)) {
      errores.push(`El tipo debe ser uno de: ${tiposMantenimientoValidos.join(', ')}`)
    }

    const prioridadesValidas = ['P1 Emergencia', 'P2 Urgente', 'P3 Normal', 'P4 Mejora']
    if (prioridad && !prioridadesValidas.includes(prioridad)) {
      errores.push(`La prioridad debe ser una de: ${prioridadesValidas.join(', ')}`)
    }

    if (errores.length > 0) return res.status(400).json({ success: false, errores })

    const numero_ot = await generarNumeroOT()
    const fecha_limite_inicio = calcularFechaLimite(prioridad)

    const nuevaOT = {
      numero_ot,
      activo_tag: activo_tag.toUpperCase(),
      tipo_mantenimiento,
      prioridad,
      descripcion_problema,
      tecnico_asignado,
      estado: 'Abierta',
      fecha_limite_inicio
    }

    const { data, error } = await supabase.from('ordenes_trabajo').insert(nuevaOT).select().single()

    if (error) throw error

    res.status(201).json({ success: true, mensaje: 'OT creada exitosamente', data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al crear la OT', detalle: error.message })
  }
})

// ============================================================
// PUT /api/ordenes/:id - Cerrar o actualizar OT (Trabajo realizado, Causa Raíz, etc.)
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      estado,
      trabajo_realizado,
      causa_raiz,
      tiempo_reparacion_horas,
      materiales_usados,
      firma_cierre
    } = req.body

    // Si pasamos a "Cerrada", validamos lo obligatorio
    const errores = []
    
    // Si estado actual a actualizar es 'Cerrada' o incluye validaciones de cierre:
    if (estado === 'Cerrada') {
      if (!trabajo_realizado) errores.push('Debes describir el Trabajo realizado para cerrar la OT')
      if (!firma_cierre) errores.push('La Firma de cierre es obligatoria')
    }

    if (errores.length > 0) return res.status(400).json({ success: false, errores })

    const actualizacion = { updated_at: new Date().toISOString() }
    if (estado) actualizacion.estado = estado
    if (trabajo_realizado !== undefined) actualizacion.trabajo_realizado = trabajo_realizado
    if (causa_raiz !== undefined) actualizacion.causa_raiz = causa_raiz
    if (tiempo_reparacion_horas !== undefined) actualizacion.tiempo_reparacion_horas = tiempo_reparacion_horas
    if (materiales_usados !== undefined) actualizacion.materiales_usados = materiales_usados
    if (firma_cierre !== undefined) actualizacion.firma_cierre = firma_cierre

    const { data, error } = await supabase.from('ordenes_trabajo').update(actualizacion).eq('id', id).select().single()

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'OT no encontrada' })
      throw error
    }

    res.json({ success: true, mensaje: 'OT actualizada exitosamente', data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar la OT', detalle: error.message })
  }
})

// ============================================================
// DELETE /api/ordenes/:id - Eliminar OT
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabase.from('ordenes_trabajo').delete().eq('id', id)
    if (error) throw error
    res.json({ success: true, mensaje: 'OT eliminada exitosamente' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar la OT', detalle: error.message })
  }
})

module.exports = router
