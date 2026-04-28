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
    stock: 0,
    stock_minimo: 0,
    stock_maximo: '' as number | ''
  })

  useEffect(() => {
    if (material) {
      setFormData({
        nombre: material.nombre,
        unidad: material.unidad,
        costo_unitario: material.costo_unitario,
        stock: material.stock,
        stock_minimo: material.stock_minimo ?? 0,
        stock_maximo: material.stock_maximo ?? ''
      })
    }
  }, [material])

  const validate = (): string | null => {
    if (formData.stock_maximo !== '' && Number(formData.stock_maximo) <= Number(formData.stock_minimo)) {
      return 'El stock máximo debe ser mayor que el stock mínimo'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const err = validate()
    if (err) { showError(err); return }

    setLoading(true)
    try {
      const payload = {
        nombre: formData.nombre,
        unidad: formData.unidad,
        costo_unitario: formData.costo_unitario,
        stock: formData.stock,
        stock_minimo: Number(formData.stock_minimo),
        stock_maximo: formData.stock_maximo === '' ? null : Number(formData.stock_maximo)
      }

      if (material) {
        await actualizarMaterial(material.id, payload)
        showSuccess('Material actualizado correctamente')
      } else {
        await crearMaterial(payload)
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
      <div className="modal" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {material ? '✏️ Editar Material' : '📦 Nuevo Material'}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nombre */}
          <div className="form-group">
            <label className="form-label">Nombre del Material <span className="form-required">*</span></label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej. Filtro de Aire 02"
            />
          </div>

          {/* Unidad + Costo */}
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
                <option value="Caja">Caja</option>
                <option value="Galón">Galón</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Costo Unitario ($) <span className="form-required">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                required
                value={formData.costo_unitario}
                onChange={e => setFormData({ ...formData, costo_unitario: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Separador visual */}
          <div style={{
            borderTop: '1px solid var(--border-color)',
            margin: '4px 0 16px',
            paddingTop: '14px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              📊 Control de Inventario
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {/* Stock actual */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Stock Actual</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  required
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Cantidad disponible</span>
              </div>

              {/* Stock mínimo */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: 'var(--accent-amber)' }}>
                  Stock Mínimo <span className="form-required">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  style={{ borderColor: 'rgba(245,158,11,0.4)' }}
                  required
                  value={formData.stock_minimo}
                  onChange={e => setFormData({ ...formData, stock_minimo: parseFloat(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '11px', color: 'var(--accent-amber)', marginTop: '4px' }}>⚠️ Alerta al llegar aquí</span>
              </div>

              {/* Stock máximo */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: 'var(--accent-blue)' }}>
                  Stock Máximo
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  style={{ borderColor: 'rgba(59,130,246,0.4)' }}
                  placeholder="Sin límite"
                  value={formData.stock_maximo}
                  onChange={e => setFormData({ ...formData, stock_maximo: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '4px' }}>🔵 Capacidad máxima</span>
              </div>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
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
