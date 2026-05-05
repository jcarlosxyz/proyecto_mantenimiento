import { useState, useEffect } from 'react'
import { Material } from '../api/materiales'
import { listarOrdenesCompra, recibirOrdenCompra, OrdenCompra } from '../api/ordenes_compra'
import { X, ClipboardList, Clock, Truck, Download } from 'lucide-react'
import { useToast } from './Toast'

interface OrdenesCompraActivasModalProps {
  material: Material
  onClose: () => void
}

export default function OrdenesCompraActivasModal({ material, onClose }: OrdenesCompraActivasModalProps) {
  const { showError, showSuccess } = useToast()
  
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrdenes = async () => {
      setLoading(true)
      try {
        const res = await listarOrdenesCompra(material.id)
        if (res.success) {
          // Filtrar solo las que no están completadas, o mostrar todas si quieres
          setOrdenes(res.data)
        }
      } catch (err: any) {
        showError(err.message || 'Error al obtener las órdenes de compra activas')
      } finally {
        setLoading(false)
      }
    }
    fetchOrdenes()
  }, [material.id, showError])

  const handleRecibir = async (ordenId: string) => {
    try {
      const res = await recibirOrdenCompra(ordenId)
      if (res.success) {
        // Actualizar el estado de la orden localmente a "Recibido"
        setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, estado: 'Recibido' } : o))
        showSuccess('¡Material ingresado al inventario con éxito!')
      }
    } catch (err: any) {
      showError(err.message || 'Error al procesar la entrada de material')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal flex flex-col" style={{ maxWidth: '650px', maxHeight: '90vh', padding: 0 }} onClick={e => e.stopPropagation()}>
        {/* Cabecera Fija */}
        <div className="p-6 pb-4 border-b border-color shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="modal-title flex items-center gap-2 m-0">
              <ClipboardList size={22} className="text-blue-500" />
              Órdenes de Compra Activas
            </h3>
            <button onClick={onClose} className="btn btn-ghost btn-icon">
              <X size={20} />
            </button>
          </div>

          <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-color flex items-start gap-4">
            <div className="text-4xl">📦</div>
            <div>
              <h4 className="font-bold text-white text-lg m-0">{material.nombre}</h4>
              <div className="mt-1 text-sm text-gray-400">
                Historial de pedidos para reabastecer este material.
              </div>
            </div>
          </div>
        </div>

        {/* Cuerpo del Modal (Donde ocurre la magia de división) */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 pt-2">
          {loading ? (
            <div className="loading-spinner p-8 m-auto">
              <div className="spinner"></div>
            </div>
          ) : ordenes.length === 0 ? (
            <div className="empty-state p-8 m-auto">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No hay órdenes activas</div>
              <div className="empty-state-text">Este material no tiene historial de compras registrado.</div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Órden Activa Fija en la parte superior */}
              {ordenes.filter(o => o.estado !== 'Recibido').length > 0 && (
                <div className="shrink-0 mb-4">
                  <h5 className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-2">Orden en Curso</h5>
                  {ordenes.filter(o => o.estado !== 'Recibido').map(orden => (
                    <div key={orden.id} className="bg-gradient-to-r from-blue-900/40 to-blue-800/20 border border-blue-500/50 p-4 rounded-xl flex flex-col gap-3 shadow-[0_4px_20px_rgba(59,130,246,0.15)] mb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-white text-lg mb-1 flex items-center gap-2">
                            <Truck size={18} className="text-blue-400" /> 
                            {orden.proveedor}
                          </div>
                          <div className="text-sm text-blue-200 flex items-center gap-2">
                            <Clock size={14} /> Entrega estimada: {orden.tiempo_entrega}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="text-2xl font-bold text-white bg-blue-500/20 px-3 py-1 rounded-lg border border-blue-500/30">
                            {orden.cantidad} {material.unidad}
                          </div>
                          <div className="flex flex-col items-end gap-1 mt-2">
                            <span className="badge badge-amber inline-block">
                              {orden.estado}
                            </span>
                            <button 
                              className="btn btn-primary mt-1 flex items-center gap-2 w-full justify-center shadow-lg shadow-blue-500/20"
                              onClick={() => handleRecibir(orden.id)}
                            >
                              <Download size={16} /> Dar Entrada
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Historial de Cerradas que SI hace scroll */}
              {ordenes.filter(o => o.estado === 'Recibido').length > 0 && (
                <div className="border-t border-color" style={{ marginTop: '24px', paddingTop: '20px' }}>
                  <h5 className="uppercase tracking-wider text-gray-400 font-bold" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Historial de Entradas Pasadas</h5>
                  <div className="space-y-3 pr-1" style={{ maxHeight: '220px', overflowY: 'scroll', paddingBottom: '8px' }}>
                    {ordenes.filter(o => o.estado === 'Recibido').map(orden => (
                      <div key={orden.id} className="bg-[var(--bg-input)] border border-color p-3 rounded-lg flex flex-col gap-2 opacity-75 hover:opacity-100 transition-opacity">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-gray-300 flex items-center gap-2">
                              <Truck size={14} className="text-gray-500" /> 
                              {orden.proveedor}
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <div className="font-bold text-emerald-500">
                              +{orden.cantidad} {material.unidad}
                            </div>
                            <span className="badge badge-emerald inline-block" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              Recibido
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 border-t border-color pt-2 flex justify-between items-center">
                          <span>{new Date(orden.created_at).toLocaleDateString('es-ES', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                          })}</span>
                          <span className="text-emerald-500 font-bold">✓ Stock actualizado</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Mensaje si no hay activas pero sí cerradas */}
              {ordenes.filter(o => o.estado !== 'Recibido').length === 0 && ordenes.filter(o => o.estado === 'Recibido').length > 0 && (
                 <div className="text-center text-gray-500 pb-4 italic m-auto">
                   No hay órdenes en curso actualmente.
                 </div>
              )}
            </div>
          )}
        </div>

        {/* Pie de Modal Fijo */}
        <div className="modal-actions p-6 pt-4 border-t border-color shrink-0">
          <button type="button" className="btn btn-secondary w-full" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
