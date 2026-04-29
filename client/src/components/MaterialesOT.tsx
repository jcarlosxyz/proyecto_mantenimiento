import React, { useState, useEffect, useCallback } from 'react'
import {
  listarOrdenesMateriales,
  registrarConsumoMaterial,
  eliminarConsumoMaterial,
  type OrdenMaterial
} from '../api/ordenes_materiales'
import { listarMateriales, type Material } from '../api/materiales'
import {
  Package, Plus, Trash2, AlertTriangle, CheckCircle,
  Hash, FileText, Calendar, X, ChevronDown, ChevronUp
} from 'lucide-react'

interface MaterialesOTProps {
  ordenId: string
  ordenCerrada?: boolean
}

export default function MaterialesOT({ ordenId, ordenCerrada = false }: MaterialesOTProps) {
  // ── Datos ──────────────────────────────────────────────────
  const [registros, setRegistros] = useState<OrdenMaterial[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loadingLista, setLoadingLista] = useState(true)
  const [loadingMats, setLoadingMats] = useState(true)

  // ── Formulario inline ──────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  const nowISO = now.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm"

  const [formData, setFormData] = useState({
    material_id: '',
    cantidad: 1,
    notas: '',
    fecha_instalacion: nowISO
  })

  // ── Carga inicial ──────────────────────────────────────────
  const fetchRegistros = useCallback(async () => {
    setLoadingLista(true)
    try {
      const res = await listarOrdenesMateriales({ orden_id: ordenId })
      setRegistros(res.data || [])
    } catch {
      // silently fail
    } finally {
      setLoadingLista(false)
    }
  }, [ordenId])

  useEffect(() => {
    fetchRegistros()
  }, [fetchRegistros])

  useEffect(() => {
    listarMateriales({ limite: 200 })
      .then(res => setMateriales(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingMats(false))
  }, [])

  // ── Helpers ────────────────────────────────────────────────
  const selectedMaterial = materiales.find(m => m.id === formData.material_id)
  const totalCosto = registros.reduce(
    (acc, r) => acc + r.costo_unitario_aplicado * r.cantidad, 0
  )

  const resetForm = () => {
    const n = new Date()
    n.setMinutes(n.getMinutes() - n.getTimezoneOffset())
    setFormData({ material_id: '', cantidad: 1, notas: '', fecha_instalacion: n.toISOString().slice(0, 16) })
    setErrorMsg('')
    setShowForm(false)
  }

  // ── Guardar ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!formData.material_id) { setErrorMsg('Selecciona un material'); return }
    if (formData.cantidad <= 0)  { setErrorMsg('La cantidad debe ser mayor a 0'); return }
    if (selectedMaterial && formData.cantidad > selectedMaterial.stock) {
      setErrorMsg(`Stock insuficiente. Disponible: ${selectedMaterial.stock} ${selectedMaterial.unidad}`)
      return
    }

    setSaving(true)
    try {
      await registrarConsumoMaterial({
        orden_id:          ordenId,
        material_id:       formData.material_id,
        cantidad:          formData.cantidad,
        notas:             formData.notas || undefined,
        fecha_instalacion: new Date(formData.fecha_instalacion).toISOString()
      })
      await fetchRegistros()
      resetForm()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Eliminar ───────────────────────────────────────────────
  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el registro de "${nombre}"? El stock será devuelto.`)) return
    try {
      await eliminarConsumoMaterial(id)
      await fetchRegistros()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div>
      {/* ── Cabecera ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {registros.length} material{registros.length !== 1 ? 'es' : ''} registrado{registros.length !== 1 ? 's' : ''}
          </span>
          {totalCosto > 0 && (
            <span style={{
              background: 'var(--accent-emerald-glow)',
              color: 'var(--accent-emerald)',
              borderRadius: '100px',
              padding: '2px 10px',
              fontSize: '12px',
              fontWeight: 700
            }}>
              Total: ${totalCosto.toFixed(2)}
            </span>
          )}
        </div>

        {!ordenCerrada && (
          <button
            className="btn btn-primary btn-sm"
            style={{ gap: '6px' }}
            onClick={() => setShowForm(v => !v)}
          >
            {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Añadir Material</>}
          </button>
        )}
      </div>

      {/* ── Formulario inline ── */}
      {showForm && (
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--accent-blue)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          marginBottom: '16px',
          boxShadow: '0 0 0 3px var(--accent-blue-glow)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={14} /> Registrar Material / Refacción
          </div>

          <form onSubmit={handleSubmit}>
            {/* Material + Cantidad */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={12} /> Material / Refacción *
                </label>
                <select
                  className="form-select"
                  required
                  value={formData.material_id}
                  onChange={e => setFormData({ ...formData, material_id: e.target.value })}
                  disabled={loadingMats}
                >
                  <option value="">
                    {loadingMats ? 'Cargando...' : 'Selecciona un material...'}
                  </option>
                  {materiales.map(m => (
                    <option key={m.id} value={m.id} disabled={m.stock <= 0}>
                      {m.nombre} — {m.stock} {m.unidad} disp.{m.stock <= 0 ? ' ⚠️ SIN STOCK' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0, minWidth: '100px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hash size={12} /> Cantidad *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    style={{
                      borderColor: selectedMaterial && formData.cantidad > selectedMaterial.stock
                        ? 'var(--accent-red)' : undefined
                    }}
                    required
                    value={formData.cantidad}
                    onChange={e => setFormData({ ...formData, cantidad: parseFloat(e.target.value) || 0 })}
                  />
                  {selectedMaterial && (
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap'
                    }}>
                      {selectedMaterial.unidad}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Fecha instalación */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={12} /> Fecha y hora de instalación *
              </label>
              <input
                type="datetime-local"
                className="form-input"
                required
                value={formData.fecha_instalacion}
                onChange={e => setFormData({ ...formData, fecha_instalacion: e.target.value })}
              />
            </div>

            {/* Notas */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={12} /> Notas de instalación
              </label>
              <textarea
                className="form-textarea"
                placeholder="Describe qué se hizo con este material, parte reemplazada, condición encontrada..."
                style={{ minHeight: '70px' }}
                value={formData.notas}
                onChange={e => setFormData({ ...formData, notas: e.target.value })}
              />
            </div>

            {/* Resumen de costo */}
            {selectedMaterial && (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                fontSize: '13px'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  ${selectedMaterial.costo_unitario.toFixed(2)} × {formData.cantidad}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '16px' }}>
                  = ${(selectedMaterial.costo_unitario * formData.cantidad).toFixed(2)}
                </span>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div style={{
                background: 'var(--accent-red-glow)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '13px',
                color: 'var(--accent-red)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={14} /> {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={saving || (!!selectedMaterial && formData.cantidad > selectedMaterial.stock)}
                style={{ gap: '6px' }}
              >
                {saving
                  ? 'Guardando...'
                  : <><CheckCircle size={14} /> Registrar</>
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Lista de registros ── */}
      {loadingLista ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
          Cargando materiales...
        </div>
      ) : registros.length === 0 ? (
        <div style={{
          background: 'var(--bg-input)',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '28px',
          textAlign: 'center'
        }}>
          <Package size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block', opacity: 0.5 }} />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Aún no se han registrado materiales para esta orden.
          </p>
          {!ordenCerrada && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.7 }}>
              Usa el botón "Añadir Material" para registrar refacciones utilizadas.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {registros.map((r) => (
            <div key={r.id} style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              transition: 'border-color var(--transition-fast)',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              {/* Fila principal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  {/* Nombre + cantidad */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                      📦 {r.materiales?.nombre ?? 'Material'}
                    </span>
                    <span style={{
                      background: 'var(--accent-blue-glow)',
                      color: 'var(--accent-blue)',
                      borderRadius: '100px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {r.cantidad} {r.materiales?.unidad}
                    </span>
                    <span style={{
                      background: 'var(--accent-emerald-glow)',
                      color: 'var(--accent-emerald)',
                      borderRadius: '100px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}>
                      ${(r.costo_unitario_aplicado * r.cantidad).toFixed(2)}
                    </span>
                  </div>

                  {/* Fecha instalación */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Calendar size={11} />
                    <span>
                      Instalado el{' '}
                      <strong style={{ color: 'var(--text-secondary)' }}>
                        {new Date(r.fecha_instalacion).toLocaleString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </strong>
                    </span>
                  </div>

                  {/* Notas */}
                  {r.notas && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--accent-blue)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', fontSize: '11px' }}>
                        <FileText size={10} /> NOTA
                      </span>
                      {r.notas}
                    </div>
                  )}
                </div>

                {/* Botón eliminar */}
                {!ordenCerrada && (
                  <button
                    className="btn btn-danger btn-sm btn-icon"
                    style={{ flexShrink: 0, width: '32px', height: '32px' }}
                    title="Eliminar registro y devolver stock"
                    onClick={() => handleEliminar(r.id, r.materiales?.nombre ?? 'material')}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Total acumulado */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '10px 4px',
            borderTop: '1px solid var(--border-color)',
            marginTop: '4px',
            gap: '12px'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Costo total de materiales:</span>
            <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent-emerald)' }}>
              ${totalCosto.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
