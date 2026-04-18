import { useState, useEffect, useCallback } from 'react'
import { listarMateriales, eliminarMaterial, type Material, type PaginationInfo, type ListParams } from '../api/materiales'
import { useToast } from '../components/Toast'
import MaterialForm from './materiales/MaterialForm' // Crearemos este después

export default function MaterialesList() {
  const { showSuccess, showError } = useToast()

  const [materiales, setMateriales] = useState<Material[]>([])
  const [paginacion, setPaginacion] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<Material | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formModal, setFormModal] = useState<{show: boolean, material: Material | null}>({ show: false, material: null })

  // Filtros
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)

  const fetchMateriales = useCallback(async () => {
    setLoading(true)
    try {
      const params: ListParams = { pagina, limite: 15 }
      if (buscar) params.buscar = buscar

      const res = await listarMateriales(params)
      setMateriales(res.data)
      setPaginacion(res.paginacion)
    } catch (err: any) {
      showError(err.message || 'Error al cargar materiales')
    } finally {
      setLoading(false)
    }
  }, [buscar, pagina, showError])

  useEffect(() => {
    fetchMateriales()
  }, [fetchMateriales])

  // Buscador con delay
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
      await eliminarMaterial(deleteModal.id)
      showSuccess(`Material "${deleteModal.nombre}" eliminado`)
      setDeleteModal(null)
      fetchMateriales()
    } catch (err: any) {
      showError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Stats rápidas */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">📦</div>
          <div>
            <div className="stat-value">{paginacion?.total ?? 0}</div>
            <div className="stat-label">Total Materiales</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">⚠️</div>
          <div>
            <div className="stat-value">{materiales.filter(m => m.stock < 5).length}</div>
            <div className="stat-label">Stock Bajo (&lt;5)</div>
          </div>
        </div>
      </div>

      {/* Barra de filtros y búsqueda */}
      <div className="filters-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre de material..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => setFormModal({ show: true, material: null })}
        >
          <span>+</span> Nuevo Material
        </button>
      </div>

      {/* Tabla de Datos */}
      <div className="card">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : materiales.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">No hay materiales</div>
            <div className="empty-state-text">Comienza agregando refacciones al catálogo.</div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Unidad</th>
                    <th>Costo</th>
                    <th>Stock</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {materiales.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                      <td><span className="badge badge-area">{m.unidad}</span></td>
                      <td style={{ color: 'var(--emerald-600)', fontWeight: 500 }}>
                        ${m.costo_unitario.toFixed(2)}
                      </td>
                      <td>
                        <span className={m.stock < 5 ? 'text-danger font-bold' : ''}>
                          {m.stock} {m.stock < 5 ? '⚠️' : ''}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setFormModal({ show: true, material: m })}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteModal(m)}
                            title="Eliminar"
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

            {/* Paginación */}
            {paginacion && paginacion.totalPaginas > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Mostrando {((paginacion.pagina - 1) * paginacion.limite) + 1} a {Math.min(paginacion.pagina * paginacion.limite, paginacion.total)} de {paginacion.total}
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>‹</button>
                  <button className="pagination-btn active">{pagina}</button>
                  <button className="pagination-btn" disabled={pagina >= paginacion.totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Formulario */}
      {formModal.show && (
        <MaterialForm 
          material={formModal.material}
          onClose={() => setFormModal({ show: false, material: null })}
          onSuccess={() => {
            setFormModal({ show: false, material: null });
            fetchMateriales();
          }}
        />
      )}

      {/* Modal de Eliminación */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠️ Eliminar Material</div>
            <div className="modal-text">¿Deseas eliminar <strong>{deleteModal.nombre}</strong> del inventario?</div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
