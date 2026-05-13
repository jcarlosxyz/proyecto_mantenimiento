import { useState, useEffect } from 'react'
import { Material, obtenerConsumoHistorico } from '../api/materiales'
import { crearOrdenCompra } from '../api/ordenes_compra'
import { X, ShoppingCart, Truck, Calendar, History, Send } from 'lucide-react'
import { useToast } from './Toast'

interface OrdenCompraModalProps {
  material: Material
  onClose: () => void
}

export default function OrdenCompraModal({ material, onClose }: OrdenCompraModalProps) {
  const { showSuccess, showError } = useToast()
  
  const [proveedor, setProveedor] = useState('')
  const [tiempoEntrega, setTiempoEntrega] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [historico, setHistorico] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchHistorico = async () => {
      try {
        const res = await obtenerConsumoHistorico(material.id)
        if (res.success) {
          setHistorico(res.total)
        }
      } catch (err: any) {
        console.error('Error al obtener historial', err)
      }
    }
    fetchHistorico()
  }, [material.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Guardar en el backend
      await crearOrdenCompra({
        material_id: material.id,
        cantidad: Number(cantidad),
        proveedor,
        tiempo_entrega: tiempoEntrega
      })

      showSuccess(`Orden de compra generada para ${material.nombre}`)
      
      onClose()
    } catch (err: any) {
      if (err.message.includes('Falta crear la tabla')) {
         showError('Falta crear la tabla ordenes_compra en base de datos.')
      } else {
         showError(err.message || 'Error al guardar la orden de compra')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b border-color pb-4">
          <h3 className="modal-title flex items-center gap-2 m-0">
            <ShoppingCart size={22} className="text-blue-500" />
            Nueva Orden de Compra
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <div className="bg-[var(--bg-input)] rounded-lg p-4 mb-6 border border-color flex items-start gap-4">
          <div className="text-4xl">📦</div>
          <div className="flex-1">
            <h4 className="font-bold text-white text-lg m-0">{material.nombre}</h4>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              <span>Stock actual: <strong className={material.stock <= material.stock_minimo ? 'text-amber-500' : 'text-emerald-500'}>{material.stock} {material.unidad}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <History size={14} /> 
                Consumo histórico: <strong className="text-blue-400">{historico !== null ? historico : '...'} {material.unidad}</strong>
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">Cantidad a Pedir <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  className="form-input pl-10"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  placeholder="Ej: 50"
                  required
                />
                <ShoppingCart size={16} className="absolute left-3 top-[13px] text-gray-500" />
                <span className="absolute right-3 top-[12px] text-gray-500 text-sm font-medium">{material.unidad}</span>
              </div>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Proveedor <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  className="form-input pl-10"
                  value={proveedor}
                  onChange={e => setProveedor(e.target.value)}
                  placeholder="Nombre de empresa o contacto"
                  required
                />
                <Truck size={16} className="absolute left-3 top-[13px] text-gray-500" />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tiempo de Entrega Estimado <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type="text"
                className="form-input pl-10"
                value={tiempoEntrega}
                onChange={e => setTiempoEntrega(e.target.value)}
                placeholder="Ej: 3 a 5 días hábiles"
                required
              />
              <Calendar size={16} className="absolute left-3 top-[13px] text-gray-500" />
            </div>
          </div>

          <div className="modal-actions mt-8 pt-4 border-t border-color">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Send size={18} />
              {loading ? 'Generando...' : 'Generar y Enviar Orden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
