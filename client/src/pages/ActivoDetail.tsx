import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { obtenerActivo, eliminarActivo, cambiarEstado, type Activo } from '../api/activos'
import { listarOrdenes, type OrdenTrabajo } from '../api/ordenes'
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

  // Tabs y Historial
  const [activeTab, setActiveTab] = useState<'detalles' | 'historial'>('detalles')
  const [historial, setHistorial] = useState<OrdenTrabajo[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

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

  // Cargar historial cuando se cambia a la pestaña y hay un activo
  useEffect(() => {
    if (activeTab === 'historial' && activo?.tag) {
      setLoadingHistorial(true)
      listarOrdenes({ activo_tag: activo.tag })
        .then(res => {
          const data = res.data || res.ordenes || res || []
          setHistorial(data)
        })
        .catch(err => showError('Error al cargar historial: ' + err.message))
        .finally(() => setLoadingHistorial(false))
    }
  }, [activeTab, activo?.tag, showError])

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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Abierta': return 'badge-operativo';
      case 'En proceso': return 'badge-mantenimiento';
      case 'En espera': return 'badge-crit-b';
      case 'Cerrada': return 'badge-area';
      default: return '';
    }
  };

  const getPriorityClass = (prio: string) => {
    switch (prio) {
      case 'P1 Emergencia': return 'badge-crit-a';
      case 'P2 Urgente': return 'badge-crit-b';
      case 'P3 Normal': return 'badge-crit-c';
      default: return 'badge-area';
    }
  };

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

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button 
          className={`btn ${activeTab === 'detalles' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('detalles')}
        >
          📄 Detalles Técnicos
        </button>
        <button 
          className={`btn ${activeTab === 'historial' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('historial')}
        >
          ⏱️ Historial de Intervenciones
        </button>
      </div>

      {activeTab === 'detalles' ? (
        <>
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
        </>
      ) : (
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>⏱️ Historial de Órdenes de Trabajo</span>
          </div>
          <div className="card-body">
            {loadingHistorial ? (
              <div className="text-center py-8 text-muted">Cargando historial...</div>
            ) : historial.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                No hay órdenes de trabajo registradas para este activo.
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Apertura</th>
                      <th>OT Número</th>
                      <th>Tipo</th>
                      <th>Prioridad</th>
                      <th>Técnico</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(ot => (
                      <tr key={ot.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(ot.created_at).toLocaleDateString()}</td>
                        <td className="detail-tag">{ot.numero_ot}</td>
                        <td>{ot.tipo_mantenimiento}</td>
                        <td>
                          <span className={`badge ${getPriorityClass(ot.prioridad)}`}>
                            <div className="badge-dot" />
                            {ot.prioridad.split(' ')[0]}
                          </span>
                        </td>
                        <td>{ot.tecnico_asignado}</td>
                        <td>
                          <span className={`badge ${getStatusClass(ot.estado)}`}>
                            {ot.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link to={`/ordenes-trabajo?ot_id=${ot.id}`} className="btn btn-secondary btn-sm">
                            Ver OT
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
