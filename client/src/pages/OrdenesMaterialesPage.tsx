import { useState, useEffect, useCallback } from 'react'
import { listarOrdenesMateriales, eliminarConsumoMaterial, type OrdenMaterial } from '../api/ordenes_materiales'
import { useToast } from '../components/Toast'
import { Package, Trash2, Plus, Search, FileText, DollarSign, Layers } from 'lucide-react'
import OrdenMaterialForm from './materiales/OrdenMaterialForm'
import MaterialForm from './materiales/MaterialForm'

export default function OrdenesMaterialesPage() {
  const { showSuccess, showError } = useToast()

  const [consumos, setConsumos] = useState<OrdenMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<OrdenMaterial | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formModal, setFormModal] = useState(false)
  const [materialModal, setMaterialModal] = useState(false)

  const fetchConsumos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarOrdenesMateriales()
      setConsumos(res.data)
    } catch (err: any) {
      showError(err.message || 'Error al cargar órdenes de materiales')
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchConsumos()
  }, [fetchConsumos])

  const handleDelete = async () => {
    if (!deleteModal) return
    setDeleting(true)
    try {
      await eliminarConsumoMaterial(deleteModal.id)
      showSuccess('Consumo de material eliminado y stock devuelto')
      setDeleteModal(null)
      fetchConsumos()
    } catch (err: any) {
      showError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const [buscar, setBuscar] = useState('')

  const consumosFiltrados = consumos.filter(c => 
    c.materiales?.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
    c.orden_id.toLowerCase().includes(buscar.toLowerCase())
  )

  return (
    <>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon purple"><Package size={20} /></div>
          <div>
            <div className="stat-value">{consumos.length}</div>
            <div className="stat-label">Movimientos Totales</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon emerald"><DollarSign size={20} /></div>
          <div>
            <div className="stat-value">
              ${consumos.reduce((acc, curr) => acc + (curr.cantidad * curr.costo_unitario_aplicado), 0).toFixed(2)}
            </div>
            <div className="stat-label">Costo Total Salidas</div>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Filtrar por OT o Material..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={() => setMaterialModal(true)}
        >
          <Package size={18} /> Alta de Material
        </button>

        <button 
          className="btn btn-primary" 
          onClick={() => setFormModal(true)}
        >
          <Plus size={18} /> Registrar Consumo
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : consumos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">Sin registros</div>
            <div className="empty-state-text">No se han registrado consumos de materiales todavía.</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Orden de Trabajo</th>
                  <th>Material</th>
                  <th>Cantidad</th>
                  <th>Costo Unit.</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {consumosFiltrados.map(c => (
                  <tr key={c.id}>
                    <td>
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-muted" />
                            <span className="font-medium text-blue-500">#{c.orden_id.substring(0,8)}</span>
                        </div>
                    </td>
                    <td>
                        <div className="flex flex-col">
                            <span className="font-semibold">{c.materiales?.nombre || 'Material Desconocido'}</span>
                            <span className="text-xs text-muted">{c.materiales?.unidad}</span>
                        </div>
                    </td>
                    <td>
                        <div className="flex items-center gap-1">
                            <Layers size={14} className="text-muted" />
                            {c.cantidad}
                        </div>
                    </td>
                    <td>${c.costo_unitario_aplicado.toFixed(2)}</td>
                    <td className="font-bold text-emerald-600">
                        ${(c.cantidad * c.costo_unitario_aplicado).toFixed(2)}
                    </td>
                    <td className="text-xs">
                        {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-sm text-red-500"
                        onClick={() => setDeleteModal(c)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formModal && (
        <OrdenMaterialForm 
          onClose={() => setFormModal(false)}
          onSuccess={() => {
            setFormModal(false);
            fetchConsumos();
          }}
        />
      )}

      {materialModal && (
        <MaterialForm 
          material={null}
          onClose={() => setMaterialModal(false)}
          onSuccess={() => {
            setMaterialModal(false);
            fetchConsumos();
          }}
        />
      )}

      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠️ Revertir Consumo</div>
            <div className="modal-text">
                ¿Deseas eliminar este registro de consumo? 
                <br/><strong>Esto devolverá {deleteModal.cantidad} {deleteModal.materiales?.unidad} al inventario.</strong>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Procesando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
