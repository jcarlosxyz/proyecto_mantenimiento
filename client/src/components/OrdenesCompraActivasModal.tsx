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
      <div className="modal" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b border-color pb-4">
          <h3 className="modal-title flex items-center gap-2 m-0">
            <ClipboardList size={22} className="text-blue-500" />
            Órdenes de Compra Activas
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <div className="bg-[var(--bg-input)] rounded-lg p-4 mb-6 border border-color flex items-start gap-4">
          <div className="text-4xl">📦</div>
          <div>
            <h4 className="font-bold text-white text-lg m-0">{material.nombre}</h4>
            <div className="mt-1 text-sm text-gray-400">
              Historial de pedidos para reabastecer este material.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner p-8">
            <div className="spinner"></div>
          </div>
        ) : ordenes.length === 0 ? (
          <div className="empty-state p-8">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No hay órdenes activas</div>
            <div className="empty-state-text">Este material no tiene historial de compras registrado.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {ordenes.map(orden => (
              <div key={orden.id} className="bg-[var(--bg-card)] border border-color p-4 rounded-lg flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-white mb-1 flex items-center gap-2">
                      <Truck size={16} className="text-gray-400" /> 
                      {orden.proveedor}
                    </div>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <Clock size={14} /> {orden.tiempo_entrega}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="text-xl font-bold text-emerald-400">
                      {orden.cantidad} {material.unidad}
                    </div>
                    {orden.estado !== 'Recibido' ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="badge badge-amber inline-block">
                          {orden.estado}
                        </span>
                        <button 
                          className="btn btn-sm btn-primary mt-1 flex items-center gap-1"
                          onClick={() => handleRecibir(orden.id)}
                        >
                          <Download size={14} /> Recibir
                        </button>
                      </div>
                    ) : (
                      <span className="badge badge-emerald inline-block">
                        Recibido
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 border-t border-color pt-2 mt-1 flex justify-between items-center">
                  <span>Creada el: {new Date(orden.created_at).toLocaleDateString('es-ES', { 
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}</span>
                  {orden.estado === 'Recibido' && (
                    <span className="text-emerald-500 font-bold">✓ Stock actualizado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions mt-6 pt-4 border-t border-color">
          <button type="button" className="btn btn-secondary w-full" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
