/**
 * API REST - Módulo: Técnicos
 * CRUD completo para la tabla 'tecnicos' en Supabase
 */

const express = require('express')
const router = express.Router()
const { supabase } = require('../supabaseClient')

// ============================================================
// GET /api/tecnicos - Listar todos los técnicos
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { estado, especialidad } = req.query

    let query = supabase.from('tecnicos').select('*').order('nombre', { ascending: true })

    if (estado) query = query.eq('estado', estado)
    if (especialidad) query = query.eq('especialidad', especialidad)

    const { data, error } = await query

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar los técnicos', detalle: error.message })
  }
})

// ============================================================
// GET /api/tecnicos/:id - Obtener un técnico por ID
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('tecnicos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'Técnico no encontrado' })
      throw error
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener el técnico', detalle: error.message })
  }
})

// ============================================================
// POST /api/tecnicos - Crear nuevo técnico
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { nombre, especialidad, telefono, email, estado = 'Activo' } = req.body

    const errores = []
    if (!nombre) errores.push('El nombre es obligatorio')
    if (!especialidad) errores.push('La especialidad es obligatoria')

    if (errores.length > 0) return res.status(400).json({ success: false, errores })

    const nuevoTecnico = { nombre, especialidad, telefono, email, estado }

    const { data, error } = await supabase.from('tecnicos').insert(nuevoTecnico).select().single()

    if (error) throw error

    res.status(201).json({ success: true, mensaje: 'Técnico creado exitosamente', data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al crear técnico', detalle: error.message })
  }
})

// ============================================================
// PUT /api/tecnicos/:id - Actualizar técnico
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, especialidad, telefono, email, estado } = req.body

    const actualizacion = {}
    if (nombre !== undefined) actualizacion.nombre = nombre
    if (especialidad !== undefined) actualizacion.especialidad = especialidad
    if (telefono !== undefined) actualizacion.telefono = telefono
    if (email !== undefined) actualizacion.email = email
    if (estado !== undefined) actualizacion.estado = estado

    const { data, error } = await supabase
      .from('tecnicos')
      .update(actualizacion)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'Técnico no encontrado' })
      throw error
    }

    res.json({ success: true, mensaje: 'Técnico actualizado', data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar técnico', detalle: error.message })
  }
})

// ============================================================
// DELETE /api/tecnicos/:id - Eliminar técnico
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabase.from('tecnicos').delete().eq('id', id)

    if (error) throw error

    res.json({ success: true, mensaje: 'Técnico eliminado exitosamente' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar técnico', detalle: error.message })
  }
})

module.exports = router
