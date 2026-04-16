/**
 * API REST - Módulo 1: Gestión de Activos
 * CRUD completo para la tabla 'activos' en Supabase
 * 
 * Endpoints:
 *   GET    /api/activos          - Listar todos (con filtros y búsqueda)
 *   GET    /api/activos/:id      - Obtener un activo por ID
 *   GET    /api/activos/tag/:tag - Obtener un activo por TAG
 *   POST   /api/activos          - Crear un nuevo activo
 *   PUT    /api/activos/:id      - Actualizar un activo
 *   PATCH  /api/activos/:id/estado - Cambiar estado de un activo
 *   DELETE /api/activos/:id      - Eliminar un activo
 */

const express = require('express')
const router = express.Router()
const { supabase } = require('../supabaseClient')

// ============================================================
// GET /api/activos - Listar activos con filtros y búsqueda
// ============================================================
// Query params:
//   ?area=Produccion          - Filtrar por área
//   ?criticidad=A             - Filtrar por criticidad
//   ?estado=Operativo         - Filtrar por estado
//   ?buscar=PROD-MOT          - Buscar por TAG, nombre o área
//   ?orden=tag                - Ordenar por campo (default: created_at)
//   ?direccion=asc            - Dirección del orden (default: desc)
//   ?pagina=1                 - Página (default: 1)
//   ?limite=20                - Registros por página (default: 20)
// ============================================================
router.get('/', async (req, res) => {
  try {
    const {
      area,
      criticidad,
      estado,
      buscar,
      orden = 'created_at',
      direccion = 'desc',
      pagina = 1,
      limite = 20
    } = req.query

    const paginaNum = parseInt(pagina)
    const limiteNum = parseInt(limite)
    const offset = (paginaNum - 1) * limiteNum

    // Construir query
    let query = supabase
      .from('activos')
      .select('*', { count: 'exact' })

    // Aplicar filtros
    if (area) {
      query = query.eq('area', area)
    }
    if (criticidad) {
      query = query.eq('criticidad', criticidad)
    }
    if (estado) {
      query = query.eq('estado', estado)
    }

    // Búsqueda por TAG, nombre o área
    if (buscar) {
      query = query.or(
        `tag.ilike.%${buscar}%,nombre.ilike.%${buscar}%,area.ilike.%${buscar}%`
      )
    }

    // Ordenar y paginar
    const ascendente = direccion === 'asc'
    query = query
      .order(orden, { ascending: ascendente })
      .range(offset, offset + limiteNum - 1)

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
    console.error('Error al listar activos:', error.message)
    res.status(500).json({
      success: false,
      error: 'Error al obtener los activos',
      detalle: error.message
    })
  }
})

// ============================================================
// GET /api/activos/:id - Obtener un activo por ID
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('activos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Activo no encontrado'
        })
      }
      throw error
    }

    res.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error al obtener activo:', error.message)
    res.status(500).json({
      success: false,
      error: 'Error al obtener el activo',
      detalle: error.message
    })
  }
})

// ============================================================
// GET /api/activos/tag/:tag - Obtener un activo por TAG
// ============================================================
router.get('/tag/:tag', async (req, res) => {
  try {
    const { tag } = req.params

    const { data, error } = await supabase
      .from('activos')
      .select('*')
      .eq('tag', tag.toUpperCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: `Activo con TAG '${tag}' no encontrado`
        })
      }
      throw error
    }

    res.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error al buscar por TAG:', error.message)
    res.status(500).json({
      success: false,
      error: 'Error al buscar el activo por TAG',
      detalle: error.message
    })
  }
})

// ============================================================
// POST /api/activos - Crear un nuevo activo
// ============================================================
// Body (JSON):
// {
//   "tag": "PROD-MOT-001",           (obligatorio, formato AREA-TIPO-NUM)
//   "nombre": "Motor Principal L1",   (obligatorio)
//   "descripcion": "Motor de ...",
//   "area": "Produccion",             (obligatorio: Produccion|Servicios|Utilidades)
//   "criticidad": "A",                (obligatorio: A|B|C)
//   "fabricante": "Siemens",
//   "modelo": "1LA7 096",
//   "numero_serie": "SN-2024-001",
//   "fecha_instalacion": "2024-03-15",
//   "especificaciones_tecnicas": "5HP, 220V, 1750RPM"
// }
// ============================================================
router.post('/', async (req, res) => {
  try {
    const {
      tag,
      nombre,
      descripcion,
      area,
      criticidad,
      fabricante,
      modelo,
      numero_serie,
      fecha_instalacion,
      especificaciones_tecnicas,
      imagen_url
    } = req.body

    // Validaciones
    const errores = []

    if (!tag) errores.push('El TAG es obligatorio')
    if (!nombre) errores.push('El nombre es obligatorio')
    if (!area) errores.push('El área es obligatorio')
    if (!criticidad) errores.push('La criticidad es obligatoria')

    // Validar formato TAG: AREA-TIPO-NUM
    if (tag && !/^[A-Z]+-[A-Z]+-\d{3}$/i.test(tag)) {
      errores.push('El TAG debe tener formato AREA-TIPO-NUM (ej: PROD-MOT-001)')
    }

    // Validar área
    const areasValidas = ['Produccion', 'Servicios', 'Utilidades']
    if (area && !areasValidas.includes(area)) {
      errores.push(`El área debe ser una de: ${areasValidas.join(', ')}`)
    }

    // Validar criticidad
    const criticidadesValidas = ['A', 'B', 'C']
    if (criticidad && !criticidadesValidas.includes(criticidad.toUpperCase())) {
      errores.push('La criticidad debe ser A, B o C')
    }

    if (errores.length > 0) {
      return res.status(400).json({
        success: false,
        errores
      })
    }

    const nuevoActivo = {
      tag: tag.toUpperCase(),
      nombre,
      descripcion: descripcion || null,
      area,
      criticidad: criticidad.toUpperCase(),
      fabricante: fabricante || null,
      modelo: modelo || null,
      numero_serie: numero_serie || null,
      fecha_instalacion: fecha_instalacion || null,
      especificaciones_tecnicas: especificaciones_tecnicas || null,
      imagen_url: imagen_url || null
    }

    const { data, error } = await supabase
      .from('activos')
      .insert(nuevoActivo)
      .select()
      .single()

    if (error) {
      // Error de TAG duplicado
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: `Ya existe un activo con el TAG '${tag}'`
        })
      }
      throw error
    }

    res.status(201).json({
      success: true,
      mensaje: 'Activo creado exitosamente',
      data
    })
  } catch (error) {
    console.error('Error al crear activo:', error.message)
    res.status(500).json({
      success: false,
      error: 'Error al crear el activo',
      detalle: error.message
    })
  }
})

// ============================================================
// PUT /api/activos/:id - Actualizar un activo completo
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      tag,
      nombre,
      descripcion,
      area,
      criticidad,
      fabricante,
      modelo,
      numero_serie,
      fecha_instalacion,
      especificaciones_tecnicas,
      estado,
      imagen_url
    } = req.body

    // Validaciones
    const errores = []

    if (tag && !/^[A-Z]+-[A-Z]+-\d{3}$/i.test(tag)) {
      errores.push('El TAG debe tener formato AREA-TIPO-NUM (ej: PROD-MOT-001)')
    }

    const areasValidas = ['Produccion', 'Servicios', 'Utilidades']
    if (area && !areasValidas.includes(area)) {
      errores.push(`El área debe ser una de: ${areasValidas.join(', ')}`)
    }

    const criticidadesValidas = ['A', 'B', 'C']
    if (criticidad && !criticidadesValidas.includes(criticidad.toUpperCase())) {
      errores.push('La criticidad debe ser A, B o C')
    }

    const estadosValidos = ['Operativo', 'En mantenimiento', 'Fuera de servicio']
    if (estado && !estadosValidos.includes(estado)) {
      errores.push(`El estado debe ser uno de: ${estadosValidos.join(', ')}`)
    }

    if (errores.length > 0) {
      return res.status(400).json({
        success: false,
        errores
      })
    }

    // Construir objeto de actualización solo con campos proporcionados
    const actualizacion = { updated_at: new Date().toISOString() }
    if (tag) actualizacion.tag = tag.toUpperCase()
    if (nombre) actualizacion.nombre = nombre
    if (descripcion !== undefined) actualizacion.descripcion = descripcion
    if (area) actualizacion.area = area
    if (criticidad) actualizacion.criticidad = criticidad.toUpperCase()
    if (fabricante !== undefined) actualizacion.fabricante = fabricante
    if (modelo !== undefined) actualizacion.modelo = modelo
    if (numero_serie !== undefined) actualizacion.numero_serie = numero_serie
    if (fecha_instalacion !== undefined) actualizacion.fecha_instalacion = fecha_instalacion
    if (especificaciones_tecnicas !== undefined) actualizacion.especificaciones_tecnicas = especificaciones_tecnicas
    if (estado) actualizacion.estado = estado
    if (imagen_url !== undefined) actualizacion.imagen_url = imagen_url

    const { data, error } = await supabase
      .from('activos')
      .update(actualizacion)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Activo no encontrado'
        })
      }
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: `Ya existe un activo con el TAG '${tag}'`
        })
      }
      throw error
    }

    res.json({
      success: true,
      mensaje: 'Activo actualizado exitosamente',
      data
    })
  } catch (error) {
    console.error('Error al actualizar activo:', error.message)
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el activo',
      detalle: error.message
    })
  }
})

// ============================================================
// PATCH /api/activos/:id/estado - Cambiar solo el estado
// ============================================================
// Body: { "estado": "En mantenimiento" }
// ============================================================
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body

    const estadosValidos = ['Operativo', 'En mantenimiento', 'Fuera de servicio']
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        error: `El estado debe ser uno de: ${estadosValidos.join(', ')}`
      })
    }

    const { data, error } = await supabase
      .from('activos')
      .update({
        estado,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Activo no encontrado'
        })
      }
      throw error
    }

    res.json({
      success: true,
      mensaje: `Estado del activo cambiado a '${estado}'`,
      data
    })
  } catch (error) {
    console.error('Error al cambiar estado:', error.message)
    res.status(500).json({
      success: false,
      error: 'Error al cambiar el estado del activo',
      detalle: error.message
    })
  }
})

// ============================================================
// DELETE /api/activos/:id - Eliminar un activo
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Verificar que existe antes de eliminar
    const { data: existente, error: errorBuscar } = await supabase
      .from('activos')
      .select('id, tag, nombre')
      .eq('id', id)
      .single()

    if (errorBuscar || !existente) {
      return res.status(404).json({
        success: false,
        error: 'Activo no encontrado'
      })
    }

    const { error } = await supabase
      .from('activos')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({
      success: true,
      mensaje: `Activo '${existente.tag} - ${existente.nombre}' eliminado exitosamente`
    })
  } catch (error) {
    console.error('Error al eliminar activo:', error.message)
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el activo',
      detalle: error.message
    })
  }
})

module.exports = router
