/**
 * API REST - Gestión de Materiales y Refacciones
 * CRUD completo para la tabla 'materiales' en Supabase
 */

const express = require('express')
const router = express.Router()
const { supabase } = require('../supabaseClient')

// ============================================================
// GET /api/materiales - Listar materiales
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { buscar, pagina = 1, limite = 20 } = req.query
    
    const paginaNum = parseInt(pagina)
    const limiteNum = parseInt(limite)
    const offset = (paginaNum - 1) * limiteNum

    let query = supabase.from('materiales').select('*', { count: 'exact' })

    if (buscar) {
      query = query.ilike('nombre', `%${buscar}%`)
    }

    query = query.order('nombre', { ascending: true }).range(offset, offset + limiteNum - 1)

    const { data, error, count } = await query

    if (error) throw error

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
// POST /api/materiales - Crear nuevo material
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { nombre, unidad, costo_unitario, stock } = req.body

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'El nombre del material es obligatorio' })
    }

    const nuevoMaterial = {
      nombre,
      unidad: unidad || 'Pieza',
      costo_unitario: costo_unitario || 0,
      stock: stock || 0
    }

    const { data, error } = await supabase.from('materiales').insert(nuevoMaterial).select().single()

    if (error) throw error

    res.status(201).json({ success: true, mensaje: 'Material creado exitosamente', data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al crear el material', detalle: error.message })
  }
})

// ============================================================
// PUT /api/materiales/:id - Actualizar material
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, unidad, costo_unitario, stock } = req.body

    const actualizacion = { updated_at: new Date().toISOString() }
    if (nombre) actualizacion.nombre = nombre
    if (unidad) actualizacion.unidad = unidad
    if (costo_unitario !== undefined) actualizacion.costo_unitario = costo_unitario
    if (stock !== undefined) actualizacion.stock = stock

    const { data, error } = await supabase.from('materiales').update(actualizacion).eq('id', id).select().single()

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'Material no encontrado' })
      throw error
    }

    res.json({ success: true, mensaje: 'Material actualizado exitosamente', data })
  } catch (error) {
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
    if (error) throw error
    res.json({ success: true, mensaje: 'Material eliminado exitosamente' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar el material', detalle: error.message })
  }
})

module.exports = router
