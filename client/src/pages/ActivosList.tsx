import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { listarActivos, eliminarActivo, type Activo, type PaginationInfo, type ListParams } from '../api/activos'
import { useToast } from '../components/Toast'
import { useActivosWS, type EventoActivo } from '../hooks/useActivosWS'

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

export default function ActivosList() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  const [activos, setActivos] = useState<Activo[]>([])
  const [paginacion, setPaginacion] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<Activo | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [buscar, setBuscar] = useState('')
  const [area, setArea] = useState('')
  const [criticidad, setCriticidad] = useState('')
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(1)

  // ⚡ Notificación WS tiempo real
  const [wsNotif, setWsNotif] = useState<{
    tag: string; nombre: string; estado_nuevo: string; numero_ot: string
  } | null>(null)

  useActivosWS(useCallback((evento: EventoActivo) => {
    const { activo_id, tag, nombre, estado_nuevo, numero_ot } = evento.datos

    // Actualizar solo el activo afectado en el estado local
    setActivos(prev =>
      prev.map(a =>
        (a.id === activo_id || a.tag === tag)
          ? { ...a, estado: estado_nuevo }
          : a
      )
    )

    // Notificación flotante
    setWsNotif({ tag, nombre, estado_nuevo, numero_ot })
    setTimeout(() => setWsNotif(null), 5000)
  }, []))

  const fetchActivos = useCallback(async () => {
    setLoading(true)
    try {
      const params: ListParams = { pagina, limite: 15 }
      if (buscar) params.buscar = buscar
      if (area) params.area = area
      if (criticidad) params.criticidad = criticidad
      if (estado) params.estado = estado

      const res = await listarActivos(params)
      setActivos(res.data)
      setPaginacion(res.paginacion)
    } catch (err: any) {
      showError(err.message || 'Error al cargar activos')
    } finally {
      setLoading(false)
    }
  }, [buscar, area, criticidad, estado, pagina, showError])

  useEffect(() => {
    fetchActivos()
  }, [fetchActivos])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timeout = setTimeout(() => {
      setBuscar(searchInput)
      setPagina(1)
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const handleDelete = async () => {
    if (!deleteModal) return
    setDeleting(true)
    try {
      await eliminarActivo(deleteModal.id)
      showSuccess(`Activo "${deleteModal.tag}" eliminado correctamente`)
      setDeleteModal(null)
      fetchActivos()
    } catch (err: any) {
      showError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  // Stats
  const totalActivos = paginacion?.total ?? 0

  return (
    <>
      {/* ⚡ Notificación WebSocket — activo actualizado */}
      {wsNotif && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 500,
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-emerald)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          boxShadow: '0 0 0 3px rgba(16,185,129,0.15), var(--shadow-lg)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          fontSize: '13px',
          maxWidth: '360px',
          animation: 'slideInRight 300ms ease'
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Estado actualizado en tiempo real
            </div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--accent-blue)' }}>{wsNotif.tag}</strong>
              {' '}{wsNotif.nombre && `— ${wsNotif.nombre}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{
                background: wsNotif.estado_nuevo === 'Operativo'
                  ? 'rgba(16,185,129,0.15)'
                  : wsNotif.estado_nuevo === 'En mantenimiento'
                    ? 'rgba(245,158,11,0.15)'
                    : 'rgba(239,68,68,0.15)',
                color: wsNotif.estado_nuevo === 'Operativo'
                  ? 'var(--accent-emerald)'
                  : wsNotif.estado_nuevo === 'En mantenimiento'
                    ? '#f59e0b'
                    : 'var(--accent-red)',
                borderRadius: '100px',
                padding: '2px 10px',
                fontSize: '12px',
                fontWeight: 700
              }}>
                {wsNotif.estado_nuevo}
              </span>
              {wsNotif.numero_ot && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  vía {wsNotif.numero_ot}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">📦</div>
          <div>
            <div className="stat-value">{totalActivos}</div>
            <div className="stat-label">Total Activos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon emerald">✓</div>
          <div>
            <div className="stat-value">{activos.filter(a => a.estado === 'Operativo').length}</div>
            <div className="stat-label">Operativos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">🔨</div>
          <div>
            <div className="stat-value">{activos.filter(a => a.estado === 'En mantenimiento').length}</div>
            <div className="stat-label">En Mantenimiento</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⚠</div>
          <div>
            <div className="stat-value">{activos.filter(a => a.estado === 'Fuera de servicio').length}</div>
            <div className="stat-label">Fuera de Servicio</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            id="search-activos"
            type="text"
            className="search-input"
            placeholder="Buscar por TAG, nombre o área..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select id="filter-area" className="filter-select" value={area} onChange={e => { setArea(e.target.value); setPagina(1) }}>
          <option value="">Todas las áreas</option>
          <option value="Produccion">Producción</option>
          <option value="Servicios">Servicios</option>
          <option value="Utilidades">Utilidades</option>
        </select>

        <select id="filter-criticidad" className="filter-select" value={criticidad} onChange={e => { setCriticidad(e.target.value); setPagina(1) }}>
          <option value="">Criticidad</option>
          <option value="A">Alta (A)</option>
          <option value="B">Media (B)</option>
          <option value="C">Baja (C)</option>
        </select>

        <select id="filter-estado" className="filter-select" value={estado} onChange={e => { setEstado(e.target.value); setPagina(1) }}>
          <option value="">Estado</option>
          <option value="Operativo">Operativo</option>
          <option value="En mantenimiento">En mantenimiento</option>
          <option value="Fuera de servicio">Fuera de servicio</option>
        </select>

        <Link to="/activos/nuevo" className="btn btn-primary" id="btn-nuevo-activo">
          <span>+</span> Nuevo Activo
        </Link>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : activos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No se encontraron activos</div>
            <div className="empty-state-text">
              {buscar || area || criticidad || estado
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza agregando tu primer activo al sistema'}
            </div>
            {!buscar && !area && !criticidad && !estado && (
              <Link to="/activos/nuevo" className="btn btn-primary">
                Crear Primer Activo
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>TAG</th>
                    <th>Nombre</th>
                    <th>Área</th>
                    <th>Criticidad</th>
                    <th>Estado</th>
                    <th>Fabricante</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map(activo => (
                    <tr key={activo.id} onClick={() => navigate(`/activos/${activo.id}`)}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--accent-blue)', letterSpacing: '0.5px' }}>
                          {activo.tag}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{activo.nombre}</td>
                      <td><span className="badge badge-area">{activo.area}</span></td>
                      <td><CritBadge criticidad={activo.criticidad} /></td>
                      <td><EstadoBadge estado={activo.estado} /></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{activo.fabricante || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/activos/${activo.id}/editar`) }}
                            title="Editar"
                            id={`btn-edit-${activo.id}`}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={(e) => { e.stopPropagation(); setDeleteModal(activo) }}
                            title="Eliminar"
                            id={`btn-delete-${activo.id}`}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {paginacion && paginacion.totalPaginas > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Mostrando {((paginacion.pagina - 1) * paginacion.limite) + 1} - {Math.min(paginacion.pagina * paginacion.limite, paginacion.total)} de {paginacion.total}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    disabled={pagina <= 1}
                    onClick={() => setPagina(p => p - 1)}
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(paginacion.totalPaginas, 5) }, (_, i) => {
                    const startPage = Math.max(1, pagina - 2)
                    const pageNum = startPage + i
                    if (pageNum > paginacion.totalPaginas) return null
                    return (
                      <button
                        key={pageNum}
                        className={`pagination-btn ${pageNum === pagina ? 'active' : ''}`}
                        onClick={() => setPagina(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    className="pagination-btn"
                    disabled={pagina >= paginacion.totalPaginas}
                    onClick={() => setPagina(p => p + 1)}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠️ Eliminar Activo</div>
            <div className="modal-text">
              ¿Estás seguro de que deseas eliminar el activo <strong>{deleteModal.tag} — {deleteModal.nombre}</strong>?
              <br /><br />
              Esta acción no se puede deshacer.
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteModal(null)} disabled={deleting}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting} id="btn-confirm-delete">
                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
