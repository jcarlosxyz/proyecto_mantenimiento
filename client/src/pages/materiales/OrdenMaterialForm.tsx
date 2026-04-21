import React, { useState, useEffect } from 'react'
import { registrarConsumoMaterial } from '../../api/ordenes_materiales'
import { listarMateriales, type Material } from '../../api/materiales'
import { supabase } from '../../lib/supabase' 
import { useToast } from '../../components/Toast'
import { Package, Hash, AlertTriangle, FileText, CheckCircle, X } from 'lucide-react'

interface OrdenMaterialFormProps {
  onClose: () => void
  onSuccess: () => void
}

export default function OrdenMaterialForm({ onClose, onSuccess }: OrdenMaterialFormProps) {
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [materiales, setMateriales] = useState<Material[]>([])
  const [ordenes, setOrdenes] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    orden_id: '',
    material_id: '',
    cantidad: 1
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const matRes = await listarMateriales({ limite: 100 })
        setMateriales(matRes.data)

        const { data: otData } = await supabase
          .from('ordenes_trabajo')
          .select('id, numero_ot, activo_tag')
          .neq('estado', 'Cerrada')
          .order('created_at', { ascending: false })
        
        setOrdenes(otData || [])
      } catch (err: any) {
        showError('Error al cargar datos del formulario')
      }
    }
    loadData()
  }, [showError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.orden_id || !formData.material_id || formData.cantidad <= 0) {
      showError('Por favor completa todos los campos correctamente')
      return
    }

    setLoading(true)
    try {
      await registrarConsumoMaterial(formData)
      showSuccess('Material registrado en la orden correctamente')
      onSuccess()
    } catch (err: any) {
      showError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedMaterial = materiales.find(m => m.id === formData.material_id)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
            <Package size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Registrar Salida</h3>
            <p className="text-xs text-muted font-normal">Asigna materiales a una orden de trabajo</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
                <FileText size={14} /> Orden de Trabajo (Destino)
            </label>
            <select
              className="form-select"
              required
              value={formData.orden_id}
              onChange={e => setFormData({ ...formData, orden_id: e.target.value })}
            >
              <option value="">Selecciona una OT abierta...</option>
              {ordenes.map(ot => (
                <option key={ot.id} value={ot.id}>
                  {ot.numero_ot} — {ot.activo_tag}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
                <Package size={14} /> Material / Refacción
            </label>
            <select
              className="form-select"
              required
              value={formData.material_id}
              onChange={e => setFormData({ ...formData, material_id: e.target.value })}
            >
              <option value="">Selecciona un material...</option>
              {materiales.map(m => (
                <option key={m.id} value={m.id} disabled={m.stock <= 0}>
                  {m.nombre} ({m.stock} {m.unidad} disp.) {m.stock <= 0 ? '— SIN STOCK' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
                <Hash size={14} /> Cantidad a utilizar
            </label>
            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className={`form-input ${selectedMaterial && formData.cantidad > selectedMaterial.stock ? 'border-red-500 bg-red-500/5' : ''}`}
                        required
                        value={formData.cantidad}
                        onChange={e => setFormData({ ...formData, cantidad: parseFloat(e.target.value) || 0 })}
                    />
                </div>
                {selectedMaterial && (
                    <span className="badge badge-area py-2 px-4 h-[42px] flex items-center">
                        {selectedMaterial.unidad}
                    </span>
                )}
            </div>
            {selectedMaterial && formData.cantidad > selectedMaterial.stock && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                    <AlertTriangle size={12} /> Stock insuficiente (Máx: {selectedMaterial.stock})
                </p>
            )}
          </div>

          <div className="bg-input/50 p-4 rounded-xl border border-color mt-6 backdrop-blur-sm">
            <div className="flex justify-between text-xs text-muted mb-2">
                <span>Costo Unitario Aplicado:</span>
                <span className="font-medium text-primary">${selectedMaterial?.costo_unitario.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-base font-bold items-end">
                <span className="text-sm text-muted mb-0.5">Total Estimado</span>
                <span className="text-2xl text-emerald-500">
                    <span className="text-sm mr-1 font-normal">$</span>
                    {((selectedMaterial?.costo_unitario || 0) * formData.cantidad).toFixed(2)}
                </span>
            </div>
          </div>

          <div className="modal-actions !mt-8">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              <X size={18} /> Cancelar
            </button>
            <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || (selectedMaterial && formData.cantidad > selectedMaterial.stock)}
            >
              {loading ? 'Procesando...' : <><CheckCircle size={18} /> Confirmar Salida</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
