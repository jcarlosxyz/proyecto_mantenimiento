import { useState, useEffect } from 'react'
import { Material } from '../api/materiales'
import { listarOrdenesCompra, recibirOrdenCompra, OrdenCompra } from '../api/ordenes_compra'
import { X, ClipboardList, Clock, Truck, Download, Package, CheckCircle2, Calendar, Hash, ChevronDown, ChevronUp, BoxSelect } from 'lucide-react'
import { useToast } from './Toast'

interface OrdenesCompraActivasModalProps {
  material: Material
  onClose: () => void
}

export default function OrdenesCompraActivasModal({ material, onClose }: OrdenesCompraActivasModalProps) {
  const { showError, showSuccess } = useToast()

  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [recibiendo, setRecibiendo] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrdenes = async () => {
      setLoading(true)
      try {
        const res = await listarOrdenesCompra(material.id)
        if (res.success) setOrdenes(res.data)
      } catch (err: any) {
        showError(err.message || 'Error al obtener las órdenes de compra')
      } finally {
        setLoading(false)
      }
    }
    fetchOrdenes()
  }, [material.id, showError])

  const handleRecibir = async (ordenId: string) => {
    setRecibiendo(ordenId)
    try {
      const res = await recibirOrdenCompra(ordenId)
      if (res.success) {
        setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, estado: 'Recibido' } : o))
        showSuccess('¡Material ingresado al inventario con éxito!')
      }
    } catch (err: any) {
      showError(err.message || 'Error al procesar la entrada de material')
    } finally {
      setRecibiendo(null)
    }
  }

  const activas = ordenes.filter(o => o.estado !== 'Recibido')
  const historial = ordenes.filter(o => o.estado === 'Recibido')

  const totalUnidadesRecibidas = historial.reduce((acc, o) => acc + o.cantidad, 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          width: '92%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          animation: 'slideUp 250ms ease',
          overflow: 'hidden',
        }}
      >
        {/* ── HEADER ── */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 60%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px',
                background: 'linear-gradient(135deg, var(--accent-blue), #6366f1)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
              }}>
                <ClipboardList size={22} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
                  Órdenes de Compra
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Gestión de pedidos y entradas
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon">
              <X size={20} />
            </button>
          </div>

          {/* Material info card */}
          <div style={{
            marginTop: '18px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
              background: 'rgba(16,185,129,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Package size={20} color="var(--accent-emerald)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>{material.nombre}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Unidad: <strong style={{ color: 'var(--text-secondary)' }}>{material.unidad}</strong>
                &nbsp;·&nbsp; Stock actual: <strong style={{ color: material.stock <= material.stock_minimo ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>{material.stock} {material.unidad}</strong>
              </div>
            </div>
            {/* Mini stats */}
            <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-blue)' }}>{activas.length}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>En curso</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border-color)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-emerald)' }}>{historial.length}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recibidas</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY (scrollable) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {loading ? (
            <div className="loading-spinner" style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : ordenes.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 0' }}>
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">Sin historial de compras</div>
              <div className="empty-state-text">Este material no tiene órdenes registradas.</div>
            </div>
          ) : (
            <>
              {/* ── ÓRDENES EN CURSO ── */}
              {activas.length > 0 && (
                <section style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Órdenes en Curso — {activas.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activas.map(orden => (
                      <div key={orden.id} style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.04) 100%)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '18px 20px',
                        boxShadow: '0 4px 20px rgba(59,130,246,0.1)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        {/* Barra lateral azul */}
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                          background: 'linear-gradient(180deg, var(--accent-blue), #6366f1)',
                          borderRadius: '4px 0 0 4px',
                        }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                              <Truck size={16} color="var(--accent-blue)" />
                              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                                {orden.proveedor}
                              </span>
                              <span style={{
                                fontSize: '11px', fontWeight: 600, padding: '2px 8px',
                                background: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)',
                                borderRadius: '100px', border: '1px solid rgba(245,158,11,0.3)',
                              }}>
                                {orden.estado}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <Clock size={13} color="var(--text-muted)" />
                                Entrega: <strong style={{ color: 'var(--text-primary)' }}>{orden.tiempo_entrega}</strong>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <Calendar size={13} color="var(--text-muted)" />
                                Pedido: <strong style={{ color: 'var(--text-primary)' }}>
                                  {new Date(orden.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </strong>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <Hash size={13} color="var(--text-muted)" />
                                ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '12px' }}>
                                  {orden.id.substring(0, 8)}…
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: '26px', fontWeight: 800, color: 'white',
                              background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.35)',
                              borderRadius: 'var(--radius-md)', padding: '6px 14px',
                              lineHeight: 1.2, marginBottom: '10px',
                            }}>
                              {orden.cantidad}
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '4px' }}>
                                {material.unidad}
                              </span>
                            </div>
                            <button
                              className="btn btn-primary"
                              style={{ width: '100%', fontSize: '13px', padding: '8px 14px' }}
                              disabled={recibiendo === orden.id}
                              onClick={() => handleRecibir(orden.id)}
                            >
                              <Download size={15} />
                              {recibiendo === orden.id ? 'Procesando...' : 'Dar Entrada'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── HISTORIAL DE ENTRADAS PASADAS (Timeline) ── */}
              {historial.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={15} color="var(--accent-emerald)" />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Historial de Entradas — {historial.length}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '12px', color: 'var(--text-muted)',
                      background: 'var(--accent-emerald-glow)', border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: '100px', padding: '3px 10px',
                    }}>
                      Total recibido: <strong style={{ color: 'var(--accent-emerald)' }}>{totalUnidadesRecibidas} {material.unidad}</strong>
                    </div>
                  </div>

                  {/* Separador */}
                  {activas.length > 0 && (
                    <div style={{ borderTop: '1px dashed var(--border-color)', marginBottom: '16px' }} />
                  )}

                  {/* Timeline */}
                  <div style={{ position: 'relative', paddingLeft: '28px' }}>
                    {/* Línea vertical del timeline */}
                    <div style={{
                      position: 'absolute', left: '10px', top: '8px',
                      bottom: '8px', width: '2px',
                      background: 'linear-gradient(180deg, var(--accent-emerald) 0%, rgba(16,185,129,0.05) 100%)',
                    }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {historial.map((orden, idx) => {
                        const isExpanded = expandedId === orden.id
                        const fecha = new Date(orden.created_at)
                        const fechaStr = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                        const horaStr = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

                        return (
                          <div key={orden.id} style={{ position: 'relative' }}>
                            {/* Dot del timeline */}
                            <div style={{
                              position: 'absolute', left: '-23px', top: '16px',
                              width: '12px', height: '12px', borderRadius: '50%',
                              background: idx === 0 ? 'var(--accent-emerald)' : 'var(--bg-card)',
                              border: `2px solid ${idx === 0 ? 'var(--accent-emerald)' : 'var(--border-color)'}`,
                              boxShadow: idx === 0 ? '0 0 10px rgba(16,185,129,0.5)' : 'none',
                              zIndex: 1,
                            }} />

                            {/* Card de entrada */}
                            <div
                              onClick={() => setExpandedId(isExpanded ? null : orden.id)}
                              style={{
                                background: isExpanded ? 'var(--bg-card-hover)' : 'var(--bg-input)',
                                border: `1px solid ${isExpanded ? 'rgba(16,185,129,0.25)' : 'var(--border-color)'}`,
                                borderRadius: 'var(--radius-md)',
                                padding: '14px 16px',
                                cursor: 'pointer',
                                transition: 'all 200ms ease',
                                userSelect: 'none',
                              }}
                            >
                              {/* Fila principal */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    width: '34px', height: '34px', borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                  }}>
                                    <Truck size={16} color="var(--accent-emerald)" />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {orden.proveedor}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                      {fechaStr}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                                      +{orden.cantidad} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{material.unidad}</span>
                                    </div>
                                    <span style={{
                                      display: 'inline-block', fontSize: '10px', fontWeight: 600,
                                      padding: '1px 7px', background: 'rgba(16,185,129,0.12)',
                                      color: 'var(--accent-emerald)', borderRadius: '100px',
                                      border: '1px solid rgba(16,185,129,0.2)',
                                    }}>
                                      ✓ Recibido
                                    </span>
                                  </div>
                                  <div style={{ color: 'var(--text-muted)' }}>
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </div>
                                </div>
                              </div>

                              {/* Panel expandido */}
                              {isExpanded && (
                                <div style={{
                                  marginTop: '14px',
                                  paddingTop: '14px',
                                  borderTop: '1px solid var(--border-color)',
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                  gap: '10px',
                                  animation: 'fadeIn 150ms ease',
                                }}>
                                  {[
                                    { icon: <Calendar size={13} />, label: 'Fecha de entrada', value: fechaStr },
                                    { icon: <Clock size={13} />, label: 'Hora', value: horaStr },
                                    { icon: <Truck size={13} />, label: 'Proveedor', value: orden.proveedor },
                                    { icon: <BoxSelect size={13} />, label: 'Cantidad recibida', value: `${orden.cantidad} ${material.unidad}` },
                                    { icon: <Clock size={13} />, label: 'Tiempo entrega', value: orden.tiempo_entrega },
                                    { icon: <Hash size={13} />, label: 'ID Orden', value: orden.id.substring(0, 13) + '…' },
                                  ].map(({ icon, label, value }) => (
                                    <div key={label} style={{
                                      background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                                      borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
                                        {icon} {label}
                                      </div>
                                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{value}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* Si no hay activas, mensaje */}
              {activas.length === 0 && historial.length > 0 && (
                <div style={{
                  textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px',
                  fontStyle: 'italic', padding: '4px 0 20px',
                }}>
                  No hay órdenes en curso actualmente.
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--border-color)',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
