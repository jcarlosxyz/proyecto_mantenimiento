import React, { useState, useEffect } from 'react'
import { crearMaterial, actualizarMaterial, type Material } from '../../api/materiales'
import { useToast } from '../../components/Toast'

interface MaterialFormProps {
  material: Material | null
  onClose: () => void
  onSuccess: () => void
}

export default function MaterialForm({ material, onClose, onSuccess }: MaterialFormProps) {
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    nombre: '',
    unidad: 'Pieza',
    costo_unitario: 0,
    stock: 0
  })

  useEffect(() => {
    if (material) {
      setFormData({
        nombre: material.nombre,
        unidad: material.unidad,
        costo_unitario: material.costo_unitario,
        stock: material.stock
      })
    }
  }, [material])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (material) {
        await actualizarMaterial(material.id, formData)
        showSuccess('Material actualizado correctamente')
      } else {
        await crearMaterial(formData)
        showSuccess('Material creado exitosamente')
      }
      onSuccess()
    } catch (err: any) {
      showError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {material ? '✏️ Editar Material' : '📦 Nuevo Material'}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del Material</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej. Filtro de Aire 02"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Unidad</label>
              <select
                className="form-select"
                value={formData.unidad}
                onChange={e => setFormData({ ...formData, unidad: e.target.value })}
              >
                <option value="Pieza">Pieza</option>
                <option value="Litro">Litro</option>
                <option value="Kg">Kg</option>
                <option value="Metro">Metro</option>
                <option value="Bote">Bote</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Costo Unitario ($)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                required
                value={formData.costo_unitario}
                onChange={e => setFormData({ ...formData, costo_unitario: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Stock inicial</label>
            <input
              type="number"
              className="form-input"
              required
              value={formData.stock}
              onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
