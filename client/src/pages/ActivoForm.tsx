import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { obtenerActivo, crearActivo, actualizarActivo, subirImagen, type ActivoInput } from '../api/activos'
import { useToast } from '../components/Toast'

const emptyForm: ActivoInput = {
  tag: '',
  nombre: '',
  descripcion: '',
  area: '',
  criticidad: '',
  fabricante: '',
  modelo: '',
  numero_serie: '',
  fecha_instalacion: '',
  especificaciones_tecnicas: '',
  imagen_url: ''
}

export default function ActivoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<ActivoInput>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [errors, setErrors] = useState<string[]>([])
  const [imagenFile, setImagenFile] = useState<File | null>(null)

  useEffect(() => {
    if (id) {
      setLoadingData(true)
      obtenerActivo(id)
        .then(res => {
          const a = res.data
          setForm({
            tag: a.tag || '',
            nombre: a.nombre || '',
            descripcion: a.descripcion || '',
            area: a.area || '',
            criticidad: a.criticidad || '',
            fabricante: a.fabricante || '',
            modelo: a.modelo || '',
            numero_serie: a.numero_serie || '',
            fecha_instalacion: a.fecha_instalacion || '',
            especificaciones_tecnicas: a.especificaciones_tecnicas || '',
            imagen_url: a.imagen_url || '',
            estado: a.estado || ''
          })
        })
        .catch(err => showError(err.message))
        .finally(() => setLoadingData(false))
    }
  }, [id, showError])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors([])
  }

  const validate = (): string[] => {
    const errs: string[] = []
    if (!form.tag.trim()) errs.push('El TAG es obligatorio')
    if (!form.nombre.trim()) errs.push('El nombre es obligatorio')
    if (!form.area) errs.push('El área es obligatoria')
    if (!form.criticidad) errs.push('La criticidad es obligatoria')
    if (form.tag && !/^[A-Z]+-[A-Z]+-\d{3}$/i.test(form.tag.trim())) {
      errs.push('El TAG debe tener formato AREA-TIPO-NUM (ej: PROD-MOT-001)')
    }
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    try {
      let currentImageUrl = form.imagen_url

      if (imagenFile) {
        // Subir la imagen antes de guardar los datos del activo.
        // Utiliza el TAG como identificador para la carpeta en el storage.
        const uploadRes = await subirImagen(imagenFile, form.tag)
        currentImageUrl = uploadRes.data.url
      }

      const formToSubmit = { ...form, imagen_url: currentImageUrl }

      if (isEdit && id) {
        await actualizarActivo(id, formToSubmit)
        showSuccess('Activo actualizado correctamente')
        navigate(`/activos/${id}`)
      } else {
        const res = await crearActivo(formToSubmit)
        showSuccess('Activo creado correctamente')
        navigate(`/activos/${res.data.id}`)
      }
    } catch (err: any) {
      showError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to={isEdit && id ? `/activos/${id}` : '/activos'} className="btn btn-ghost btn-sm" id="btn-back-form">
          ← Volver
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)' }}>
            {isEdit ? '✏️ Editar Activo' : '➕ Nuevo Activo'}
          </h2>
        </div>

        <div className="card-body">
          {errors.length > 0 && (
            <div style={{
              background: 'var(--accent-red-glow)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              marginBottom: '24px'
            }}>
              {errors.map((err, i) => (
                <div key={i} style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: i < errors.length - 1 ? '4px' : 0 }}>
                  • {err}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* TAG */}
              <div className="form-group">
                <label className="form-label" htmlFor="tag">
                  TAG <span className="form-required">*</span>
                </label>
                <input
                  id="tag"
                  name="tag"
                  type="text"
                  className="form-input"
                  placeholder="PROD-MOT-001"
                  value={form.tag}
                  onChange={handleChange}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              {/* Nombre */}
              <div className="form-group">
                <label className="form-label" htmlFor="nombre">
                  Nombre <span className="form-required">*</span>
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  className="form-input"
                  placeholder="Motor Principal L1"
                  value={form.nombre}
                  onChange={handleChange}
                />
              </div>

              {/* Área */}
              <div className="form-group">
                <label className="form-label" htmlFor="area">
                  Área <span className="form-required">*</span>
                </label>
                <select id="area" name="area" className="form-select" value={form.area} onChange={handleChange}>
                  <option value="">Seleccionar área</option>
                  <option value="Produccion">Producción</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Utilidades">Utilidades</option>
                </select>
              </div>

              {/* Criticidad */}
              <div className="form-group">
                <label className="form-label" htmlFor="criticidad">
                  Criticidad <span className="form-required">*</span>
                </label>
                <select id="criticidad" name="criticidad" className="form-select" value={form.criticidad} onChange={handleChange}>
                  <option value="">Seleccionar criticidad</option>
                  <option value="A">A — Alta</option>
                  <option value="B">B — Media</option>
                  <option value="C">C — Baja</option>
                </select>
              </div>

              {/* Estado (solo en editar) */}
              {isEdit && (
                <div className="form-group">
                  <label className="form-label" htmlFor="estado">Estado</label>
                  <select id="estado" name="estado" className="form-select" value={form.estado || ''} onChange={handleChange}>
                    <option value="Operativo">Operativo</option>
                    <option value="En mantenimiento">En mantenimiento</option>
                    <option value="Fuera de servicio">Fuera de servicio</option>
                  </select>
                </div>
              )}

              {/* Fabricante */}
              <div className="form-group">
                <label className="form-label" htmlFor="fabricante">Fabricante</label>
                <input
                  id="fabricante"
                  name="fabricante"
                  type="text"
                  className="form-input"
                  placeholder="Siemens, ABB, WEG..."
                  value={form.fabricante}
                  onChange={handleChange}
                />
              </div>

              {/* Modelo */}
              <div className="form-group">
                <label className="form-label" htmlFor="modelo">Modelo</label>
                <input
                  id="modelo"
                  name="modelo"
                  type="text"
                  className="form-input"
                  placeholder="1LA7 096"
                  value={form.modelo}
                  onChange={handleChange}
                />
              </div>

              {/* Número de Serie */}
              <div className="form-group">
                <label className="form-label" htmlFor="numero_serie">Número de Serie</label>
                <input
                  id="numero_serie"
                  name="numero_serie"
                  type="text"
                  className="form-input"
                  placeholder="SN-2024-001"
                  value={form.numero_serie}
                  onChange={handleChange}
                />
              </div>

              {/* Fecha de Instalación */}
              <div className="form-group">
                <label className="form-label" htmlFor="fecha_instalacion">Fecha de Instalación</label>
                <input
                  id="fecha_instalacion"
                  name="fecha_instalacion"
                  type="date"
                  className="form-input"
                  value={form.fecha_instalacion}
                  onChange={handleChange}
                />
              </div>

              {/* Descripción */}
              <div className="form-group full-width">
                <label className="form-label" htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  className="form-textarea"
                  placeholder="Descripción detallada del activo..."
                  value={form.descripcion}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              {/* Especificaciones Técnicas */}
              <div className="form-group full-width">
                <label className="form-label" htmlFor="especificaciones_tecnicas">Especificaciones Técnicas</label>
                <textarea
                  id="especificaciones_tecnicas"
                  name="especificaciones_tecnicas"
                  className="form-textarea"
                  placeholder="5HP, 220V, 1750RPM..."
                  value={form.especificaciones_tecnicas}
                  onChange={handleChange}
                  rows={2}
                />
              </div>

              {/* Imagen */}
              <div className="form-group full-width">
                <label className="form-label" htmlFor="imagen">Imagen del Activo</label>
                {form.imagen_url && !imagenFile && (
                  <div style={{ marginBottom: '10px' }}>
                    <img src={form.imagen_url} alt="Imagen actual" style={{ maxWidth: '200px', borderRadius: 'var(--radius-md)' }} />
                  </div>
                )}
                {imagenFile && (
                  <div style={{ marginBottom: '10px', fontSize: '13px', color: 'var(--accent-blue)' }}>
                    Archivo seleccionado: {imagenFile.name}
                  </div>
                )}
                <input
                  id="imagen"
                  name="imagen"
                  type="file"
                  accept="image/jpeg, image/png, image/webp, image/gif"
                  className="form-input"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setImagenFile(e.target.files[0])
                    }
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <Link
                to={isEdit && id ? `/activos/${id}` : '/activos'}
                className="btn btn-secondary"
              >
                Cancelar
              </Link>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="btn-submit-form">
                {loading
                  ? (isEdit ? 'Guardando...' : 'Creando...')
                  : (isEdit ? '💾 Guardar Cambios' : '➕ Crear Activo')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
