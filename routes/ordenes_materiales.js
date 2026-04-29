/**
 * API REST - Consumo de Materiales por Orden de Trabajo
 * CRUD para la tabla 'ordenes_materiales' vinculada a materiales y OTs
 */

const express   = require('express')
const router    = express.Router()
const { supabase } = require('../supabaseClient')
const { broadcast } = require('../lib/wsServer')

// ============================================================
// GET /api/ordenes-materiales - Listar materiales por orden
// Query param: ?orden_id=UUID
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { orden_id } = req.query
    
    let query = supabase
      .from('ordenes_materiales')
      .select(`
        *,
        materiales (nombre, unidad)
      `)

    if (orden_id) {
      query = query.eq('orden_id', orden_id)
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener materiales de la orden', detalle: error.message })
  }
})

// ============================================================
// POST /api/ordenes-materiales - Registrar uso de material en OT
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { orden_id, material_id, cantidad, notas, fecha_instalacion } = req.body

    if (!orden_id || !material_id || !cantidad) {
      return res.status(400).json({ success: false, error: 'Orden, Material y Cantidad son obligatorios' })
    }

    // 1. Obtener el precio actual del material y stock disponible
    const { data: material, error: errMat } = await supabase
      .from('materiales')
      .select('costo_unitario, stock')
      .eq('id', material_id)
      .single()

    if (errMat || !material) {
      return res.status(404).json({ success: false, error: 'Material no encontrado' })
    }

    // 2. Insertar registro de uso
    const nuevoRegistro = {
      orden_id,
      material_id,
      cantidad,
      costo_unitario_aplicado: material.costo_unitario,
      notas: notas || null,
      fecha_instalacion: fecha_instalacion || new Date().toISOString()
    }

    const { data, error } = await supabase.from('ordenes_materiales').insert(nuevoRegistro).select(`
      *,
      materiales (nombre, unidad)
    `).single()

    if (error) throw error

    // 3. Descontar del inventario general
    const nuevoStock = material.stock - cantidad
    await supabase.from('materiales').update({ stock: nuevoStock }).eq('id', material_id)

    // 4. ⚡ Emitir evento WebSocket a todos los clientes
    broadcast('inventario_actualizado', {
      material_id,
      nombre:        data.materiales?.nombre ?? '',
      stock_nuevo:   nuevoStock,
      cantidad_usada: cantidad,
      orden_id,
      accion:        'consumo'
    })

    res.status(201).json({ success: true, mensaje: 'Material registrado en la OT', data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al registrar material', detalle: error.message })
  }
})

// ============================================================
// DELETE /api/ordenes-materiales/:id - Eliminar material de una OT
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Recuperar info antes de borrar para devolver stock
    const { data: uso, error: errUso } = await supabase
      .from('ordenes_materiales')
      .select('*, materiales(nombre)')
      .eq('id', id)
      .single()

    let stockDevuelto = null
    if (uso) {
      const { data: material } = await supabase
        .from('materiales').select('stock').eq('id', uso.material_id).single()
      if (material) {
        stockDevuelto = material.stock + uso.cantidad
        await supabase.from('materiales')
          .update({ stock: stockDevuelto })
          .eq('id', uso.material_id)

        // ⚡ Emitir evento WebSocket - stock devuelto
        broadcast('inventario_actualizado', {
          material_id:  uso.material_id,
          nombre:       uso.materiales?.nombre ?? '',
          stock_nuevo:  stockDevuelto,
          cantidad_usada: uso.cantidad,
          orden_id:     uso.orden_id,
          accion:       'devolucion'
        })
      }
    }

    const { error } = await supabase.from('ordenes_materiales').delete().eq('id', id)
    if (error) throw error

    res.json({ success: true, mensaje: 'Registro eliminado y stock devuelto' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar registro de material', detalle: error.message })
  }
})

module.exports = router
