/**
 * API REST - Upload de Imágenes a Supabase Storage
 * 
 * Endpoints:
 *   POST /api/upload/imagen   - Subir imagen de activo
 *   DELETE /api/upload/imagen - Eliminar imagen de activo
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')
const { supabase, supabaseAdmin } = require('../supabaseClient')
const client = supabaseAdmin || supabase

// Configurar multer para almacenar en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se aceptan: JPG, PNG, WebP, GIF'))
    }
  }
})

// Nombre del bucket en Supabase Storage
const BUCKET = 'activos-imagenes'

// ============================================================
// POST /api/upload/imagen - Subir una imagen
// ============================================================
// Form-data:
//   imagen: archivo de imagen (jpg, png, webp, gif)
//   activo_id: (opcional) ID del activo para nombrar el archivo
// ============================================================
router.post('/imagen', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se envió ninguna imagen'
      })
    }

    const { buffer, mimetype, originalname } = req.file
    const activoId = req.body.activo_id || 'temp'

    // Generar nombre único para el archivo
    const ext = originalname.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${activoId}/${timestamp}.${ext}`

    // Subir a Supabase Storage usando el cliente admin
    const { data, error } = await client.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: mimetype,
        upsert: false
      })

    if (error) {
      console.error('Error al subir a Supabase Storage:', error)
      throw error
    }

    // Obtener URL pública
    const { data: urlData } = client.storage
      .from(BUCKET)
      .getPublicUrl(data.path)

    res.status(201).json({
      success: true,
      mensaje: 'Imagen subida exitosamente',
      data: {
        path: data.path,
        url: urlData.publicUrl,
        nombre_original: originalname,
        tamaño: buffer.length
      }
    })
  } catch (error) {
    console.error('Error en upload:', error.message)
    res.status(500).json({
      success: false,
      error: 'Error al subir la imagen',
      detalle: error.message
    })
  }
})

// ============================================================
// DELETE /api/upload/imagen - Eliminar una imagen
// ============================================================
// Body: { "path": "activo_id/timestamp.ext" }
// ============================================================
router.delete('/imagen', async (req, res) => {
  try {
    const { path } = req.body

    if (!path) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el path de la imagen a eliminar'
      })
    }

    const { error } = await client.storage
      .from(BUCKET)
      .remove([path])

    if (error) {
      console.error('Error al eliminar de Storage:', error)
      throw error
    }

    res.json({
      success: true,
      mensaje: 'Imagen eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error al eliminar imagen:', error.message)
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la imagen',
      detalle: error.message
    })
  }
})

module.exports = router
