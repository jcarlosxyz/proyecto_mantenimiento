/**
 * API REST - Gestión de Materiales y Refacciones
 * CRUD completo para la tabla 'materiales' en Supabase
 */

const express = require('express')
const router = express.Router()
const { supabase, supabaseAdmin } = require('../supabaseClient')
const db = supabaseAdmin || supabase
const { broadcast } = require('../lib/wsServer')

// ============================================================
// GET /api/materiales - Listar materiales
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { buscar, pagina = 1, limite = 20 } = req.query
    
    const paginaNum = parseInt(pagina)
    const limiteNum = parseInt(limite)
    const offset = (paginaNum - 1) * limiteNum

    let query = db.from('materiales').select('*', { count: 'exact' })

    if (buscar) {
      query = query.ilike('nombre', `%${buscar}%`)
    }

    query = query.order('nombre', { ascending: true }).range(offset, offset + limiteNum - 1)

    const { data, error, count } = await query

    if (error) throw error

    // Obtener información de órdenes de compra activas para estos materiales
    if (data && data.length > 0) {
      const materialIds = data.map(m => m.id)
      const { data: ordenesActivas, error: errOrdenes } = await db
        .from('ordenes_compra')
        .select('material_id')
        .in('material_id', materialIds)
        .neq('estado', 'Recibido')
      
      // Añadir la bandera si la tabla existe (si no existe omitimos el error silenciosamente)
      if (ordenesActivas) {
        const activasSet = new Set(ordenesActivas.map(o => o.material_id))
        data.forEach(m => {
          m.tiene_orden_activa = activasSet.has(m.id)
        })
      } else if (errOrdenes && errOrdenes.code !== '42P01') {
         // Log the error unless it's just "table doesn't exist yet"
         console.error('[materiales.js] Error al buscar órdenes activas:', errOrdenes)
      }
    }

    res.json({
      success: true,
      data,
      paginacion: {
        total: count,
        pagina: paginaNum,
        limite: limiteNum,
        totalPaginas: Math.ceil(count / limiteNum)
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar los materiales', detalle: error.message })
  }
})

// ============================================================
// GET /api/materiales/:id - Obtener material por ID
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase.from('materiales').select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'Material no encontrado' })
      throw error
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener el material', detalle: error.message })
  }
})

// ============================================================
// GET /api/materiales/:id/consumo - Obtener consumo histórico
// ============================================================
router.get('/:id/consumo', async (req, res) => {
  try {
    const { id } = req.params
    // Consultar todos los registros de ordenes_materiales para este material_id
    const { data, error } = await supabase
      .from('ordenes_materiales')
      .select('cantidad')
      .eq('material_id', id)

    if (error) throw error

    // Sumar las cantidades
    const totalConsumo = data.reduce((sum, record) => sum + (Number(record.cantidad) || 0), 0)

    res.json({ success: true, total: totalConsumo })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener el consumo histórico', detalle: error.message })
  }
})

// ============================================================
// POST /api/materiales - Crear nuevo material
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { nombre, unidad, costo_unitario, stock, stock_minimo, stock_maximo } = req.body

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'El nombre del material es obligatorio' })
    }

    const nuevoMaterial = {
      nombre,
      unidad: unidad || 'Pieza',
      costo_unitario: costo_unitario || 0,
      stock: stock || 0,
      stock_minimo: stock_minimo ?? 0,
      stock_maximo: stock_maximo ?? null
    }

    const { data, error } = await supabase.from('materiales').insert(nuevoMaterial).select().single()

    if (error) {
      console.error('Error creating material:', error)
      throw error
    }

    broadcast('catalogo_actualizado', { accion: 'creado', material_id: data.id, nombre: data.nombre, stock: data.stock })
    res.status(201).json({ success: true, mensaje: 'Material creado exitosamente', data })
  } catch (error) {
    console.error('Catch creating material:', error)
    res.status(500).json({ success: false, error: 'Error al crear el material', detalle: error.message })
  }
})

// ============================================================
// PUT /api/materiales/:id - Actualizar material
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, unidad, costo_unitario, stock, stock_minimo, stock_maximo } = req.body

    const actualizacion = { updated_at: new Date().toISOString() }
    if (nombre) actualizacion.nombre = nombre
    if (unidad) actualizacion.unidad = unidad
    if (costo_unitario !== undefined) actualizacion.costo_unitario = costo_unitario
    if (stock !== undefined) actualizacion.stock = stock
    if (stock_minimo !== undefined) actualizacion.stock_minimo = stock_minimo
    if (stock_maximo !== undefined) actualizacion.stock_maximo = stock_maximo === '' ? null : stock_maximo

    const { data, error } = await supabase.from('materiales').update(actualizacion).eq('id', id).select().single()

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'Material no encontrado' })
      console.error('Error updating material:', error)
      throw error
    }

    broadcast('catalogo_actualizado', { accion: 'actualizado', material_id: data.id, nombre: data.nombre, stock: data.stock })
    res.json({ success: true, mensaje: 'Material actualizado exitosamente', data })
  } catch (error) {
    console.error('Catch updating material:', error)
    res.status(500).json({ success: false, error: 'Error al actualizar el material', detalle: error.message })
  }
})

// ============================================================
// DELETE /api/materiales/:id - Eliminar material
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabase.from('materiales').delete().eq('id', id)
    if (error) {
      console.error('Error deleting material:', error)
      throw error
    }
    broadcast('catalogo_actualizado', { accion: 'eliminado', material_id: id })
    res.json({ success: true, mensaje: 'Material eliminado exitosamente' })
  } catch (error) {
    console.error('Catch deleting material:', error)
    res.status(500).json({ success: false, error: 'Error al eliminar el material', detalle: error.message })
  }
})

module.exports = router
