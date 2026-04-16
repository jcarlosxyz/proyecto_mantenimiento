import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { obtenerActivo, eliminarActivo, cambiarEstado, type Activo } from '../api/activos'
import { useToast } from '../components/Toast'

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function CritBadge({ criticidad }: { criticidad: string }) {
  const cls = criticidad === 'A' ? 'badge-crit-a' : criticidad === 'B' ? 'badge-crit-b' : 'badge-crit-c'
  const label = criticidad === 'A' ? 'Alta' : criticidad === 'B' ? 'Media' : 'Baja'
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot"></span>
      {label}
    </span>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls = estado === 'Operativo' ? 'badge-operativo'
    : estado === 'En mantenimiento' ? 'badge-mantenimiento'
    : 'badge-fuera'
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot"></span>
      {estado}
    </span>
  )
}

export default function ActivoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  const [activo, setActivo] = useState<Activo | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [estadoModal, setEstadoModal] = useState(false)
  const [nuevoEstado, setNuevoEstado] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    obtenerActivo(id)
      .then(res => setActivo(res.data))
      .catch(err => {
        showError(err.message)
        navigate('/activos')
      })
      .finally(() => setLoading(false))
  }, [id, navigate, showError])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await eliminarActivo(id)
      showSuccess('Activo eliminado correctamente')
      navigate('/activos')
    } catch (err: any) {
      showError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleCambiarEstado = async () => {
    if (!id || !nuevoEstado) return
    try {
      const res = await cambiarEstado(id, nuevoEstado)
      setActivo(res.data)
      showSuccess(`Estado cambiado a "${nuevoEstado}"`)
      setEstadoModal(false)
    } catch (err: any) {
      showError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!activo) return null

  const fields = [
    { label: 'TAG', value: activo.tag, highlight: true },
    { label: 'Nombre', value: activo.nombre },
    { label: 'Área', value: activo.area },
    { label: 'Fabricante', value: activo.fabricante },
    { label: 'Modelo', value: activo.modelo },
    { label: 'Número de Serie', value: activo.numero_serie },
    { label: 'Fecha de Instalación', value: formatDate(activo.fecha_instalacion) },
    { label: 'Creado', value: formatDate(activo.created_at) },
    { label: 'Última Actualización', value: formatDate(activo.updated_at) },
  ]

  return (
    <>
      {/* Back button */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/activos" className="btn btn-ghost btn-sm" id="btn-back-detail">
          ← Volver a la lista
        </Link>
      </div>

      {/* Header */}
      <div className="detail-header">
        <div>
          <div className="detail-tag">{activo.tag}</div>
          <h1 className="detail-title">{activo.nombre}</h1>
          <div className="detail-meta">
            <CritBadge criticidad={activo.criticidad} />
            <EstadoBadge estado={activo.estado} />
            <span className="badge badge-area">{activo.area}</span>
          </div>
        </div>

        <div className="detail-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setNuevoEstado(activo.estado)
              setEstadoModal(true)
            }}
            id="btn-cambiar-estado"
          >
            🔄 Estado
          </button>
          <Link to={`/activos/${activo.id}/editar`} className="btn btn-primary btn-sm" id="btn-edit-detail">
            ✏️ Editar
          </Link>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setDeleteModal(true)}
            id="btn-delete-detail"
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>

      {/* Fields Grid */}
      <div className="detail-grid">
        {fields.map(field => (
          <div className="detail-field" key={field.label}>
            <div className="detail-field-label">{field.label}</div>
            <div className={`detail-field-value ${!field.value ? 'empty' : ''}`}
              style={field.highlight ? { color: 'var(--accent-blue)', fontWeight: 700, letterSpacing: '1px' } : undefined}
            >
              {field.value || 'Sin dato'}
            </div>
          </div>
        ))}
      </div>

      {/* Imagen */}
      {activo.imagen_url && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>🖼️ Imagen del Activo</span>
          </div>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <img 
              src={activo.imagen_url} 
              alt={`Imagen de ${activo.nombre}`} 
              style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', objectFit: 'contain' }} 
            />
          </div>
        </div>
      )}

      {/* Description */}
      {activo.descripcion && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>📝 Descripción</span>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{activo.descripcion}</p>
          </div>
        </div>
      )}

      {/* Specs */}
      {activo.especificaciones_tecnicas && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>📐 Especificaciones Técnicas</span>
          </div>
          <div className="card-body">
            <p style={{
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: 1.7,
              background: 'var(--bg-input)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)'
            }}>
              {activo.especificaciones_tecnicas}
            </p>
          </div>
        </div>
      )}

      {/* Estado Modal */}
      {estadoModal && (
        <div className="modal-overlay" onClick={() => setEstadoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🔄 Cambiar Estado</div>
            <div className="modal-text">
              Selecciona el nuevo estado para <strong>{activo.tag}</strong>:
            </div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <select
                className="form-select"
                value={nuevoEstado}
                onChange={e => setNuevoEstado(e.target.value)}
                id="select-nuevo-estado"
              >
                <option value="Operativo">Operativo</option>
                <option value="En mantenimiento">En mantenimiento</option>
                <option value="Fuera de servicio">Fuera de servicio</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEstadoModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCambiarEstado} id="btn-confirm-estado">
                Cambiar Estado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠️ Eliminar Activo</div>
            <div className="modal-text">
              ¿Estás seguro de que deseas eliminar <strong>{activo.tag} — {activo.nombre}</strong>?
              <br /><br />
              Esta acción no se puede deshacer.
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteModal(false)} disabled={deleting}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting} id="btn-confirm-delete-detail">
                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
