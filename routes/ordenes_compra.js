const express = require('express')
const router = express.Router()
const { supabase, supabaseAdmin } = require('../supabaseClient')
const { broadcast } = require('../lib/wsServer')
const db = supabaseAdmin || supabase

// ============================================================
// GET /api/ordenes-compra - Listar ordenes de compra activas
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { material_id } = req.query
    
    let query = db
      .from('ordenes_compra')
      .select(`
        *,
        materiales (nombre, unidad)
      `)
      .order('created_at', { ascending: false })

    if (material_id) {
      query = query.eq('material_id', material_id)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === '42P01') {
         // La tabla no existe aún
         return res.json({ success: true, data: [], notice: "Tabla no creada" })
      }
      throw error
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar las órdenes de compra', detalle: error.message })
  }
})

// ============================================================
// POST /api/ordenes-compra - Crear nueva orden de compra
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { material_id, cantidad, proveedor, tiempo_entrega } = req.body

    const nuevaOrden = {
      material_id,
      cantidad,
      proveedor,
      tiempo_entrega,
      estado: 'Pendiente'
    }

    const { data, error } = await db.from('ordenes_compra').insert(nuevaOrden).select('*, materiales(nombre, unidad)').single()

    if (error) throw error

    // Emitir evento WebSocket para actualizar pantallas
    broadcast('nueva_orden_compra', data)

    res.status(201).json({ success: true, mensaje: 'Orden de compra creada', data })
  } catch (error) {
    if (error.code === '42P01') {
      return res.status(500).json({ success: false, error: 'Falta crear la tabla ordenes_compra en Supabase.' })
    }
    res.status(500).json({ success: false, error: 'Error al crear la orden', detalle: error.message })
  }
})

// ============================================================
// PATCH /api/ordenes-compra/:id/estado - Actualizar estado
// ============================================================
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body

    const { data, error } = await db
      .from('ordenes_compra')
      .update({ estado })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Si el estado cambia (ej. Cancelado), verificar si quedan órdenes activas
    const { data: ordenesPendientes } = await db
      .from('ordenes_compra')
      .select('id')
      .eq('material_id', data.material_id)
      .neq('estado', 'Recibido')
      .neq('estado', 'Cancelado'); // Asumiendo que Cancelado no es activa

    const tiene_orden_activa = ordenesPendientes && ordenesPendientes.length > 0;

    broadcast('orden_compra_actualizada', {
      orden_id: id,
      estado: data.estado,
      material_id: data.material_id,
      tiene_orden_activa
    });

    res.json({ success: true, mensaje: 'Estado actualizado', data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar', detalle: error.message })
  }
})

// ============================================================
// POST /api/ordenes-compra/:id/recibir - Recibir material e incrementar stock
// ============================================================
router.post('/:id/recibir', async (req, res) => {
  try {
    const { id } = req.params

    // 1. Obtener la orden de compra
    const { data: orden, error: errOrden } = await db
      .from('ordenes_compra')
      .select('*, materiales(nombre)')
      .eq('id', id)
      .single()

    if (errOrden || !orden) throw errOrden || new Error('Orden no encontrada')

    if (orden.estado === 'Recibido') {
      return res.status(400).json({ success: false, error: 'La orden ya fue recibida anteriormente' })
    }

    // 2. Obtener el stock actual del material
    const { data: material, error: errMat } = await db
      .from('materiales')
      .select('stock')
      .eq('id', orden.material_id)
      .single()
      
    if (errMat || !material) throw errMat || new Error('Material no encontrado')

    const nuevoStock = material.stock + Number(orden.cantidad)

    // 3. Actualizar el stock
    const { error: errUpdateMat } = await db
      .from('materiales')
      .update({ stock: nuevoStock })
      .eq('id', orden.material_id)
      
    if (errUpdateMat) throw errUpdateMat

    // 4. Marcar orden como 'Recibido'
    const { data: ordenActualizada, error: errUpdateOrden } = await db
      .from('ordenes_compra')
      .update({ estado: 'Recibido' })
      .eq('id', id)
      .select()
      .single()
      
    if (errUpdateOrden) throw errUpdateOrden

    // 4.5. Verificar si quedan más órdenes de compra activas para este material
    const { data: ordenesPendientes } = await db
      .from('ordenes_compra')
      .select('id')
      .eq('material_id', orden.material_id)
      .neq('estado', 'Recibido')
      .neq('estado', 'Cancelado');

    const tiene_orden_activa = ordenesPendientes && ordenesPendientes.length > 0;

    // 5. Emitir evento WebSocket para actualizar pantallas
    broadcast('inventario_actualizado', {
      material_id: orden.material_id,
      nombre: orden.materiales?.nombre ?? 'Material',
      stock_nuevo: nuevoStock,
      cantidad_usada: orden.cantidad,
      accion: 'entrada',
      tiene_orden_activa,
      orden_id: id
    })

    res.json({ success: true, mensaje: 'Material recibido y stock actualizado', data: ordenActualizada })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al recibir el material', detalle: error.message })
  }
})

module.exports = router
