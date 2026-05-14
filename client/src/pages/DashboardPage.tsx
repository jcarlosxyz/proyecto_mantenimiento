import { useState, useEffect, useCallback } from 'react'
import { obtenerDashboard, DashboardData } from '../api/dashboard'
import { useDashboardWS, EventoDashboard } from '../hooks/useDashboardWS'
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Package,
  Shield, Wrench, Users, Zap, RefreshCw, BarChart2,
  Calendar, TrendingUp, ArrowUp, ArrowDown, Minus, DollarSign
} from 'lucide-react'

/* ── helpers ── */
const fmt = (n: number) => n.toLocaleString('es-MX')
const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function Ring({ pct, color, size = 72 }: { pct: number; color: string; size?: number }) {
  const r = 26, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
      <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        strokeDashoffset={c / 4} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 700ms ease' }} />
      <text x={36} y={40} textAnchor="middle" fontSize={13} fontWeight={800} fill="white">{pct}%</text>
    </svg>
  )
}

function MiniBar({ data, colors }: { data: number[]; colors: string[] }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '40px', flex: 1 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, background: colors[i % colors.length] + (i === data.length - 1 ? 'ff' : '70'), height: `${Math.max((v / max) * 100, 5)}%`, borderRadius: '2px 2px 0 0', minWidth: 4, transition: 'height 600ms ease' }} />
      ))}
    </div>
  )
}

function StatCard({ icon, label, value, sub, color, trend, extra }: {
  icon: React.ReactNode; label: string; value: string | number
  sub?: string; color: string; trend?: 'up' | 'down' | 'neutral'; extra?: React.ReactNode
}) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b'
  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${color}28`, borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', gap: '14px', alignItems: 'center', position: 'relative', overflow: 'hidden', boxShadow: `0 0 30px ${color}0a`, transition: 'all 220ms ease' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,${color},${color}40)` }} />
      <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</span>
          {trend && <TrendIcon size={14} color={trendColor} />}
        </div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{sub}</div>}
      </div>
      {extra}
    </div>
  )
}

function SectionTitle({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
      <div style={{ color: 'var(--accent-blue)' }}>{icon}</div>
      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{title}</span>
      {badge && <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', border: '1px solid rgba(59,130,246,0.25)' }}>{badge}</span>}
    </div>
  )
}

const pColor: Record<string, string> = { 'P1 Emergencia': '#ef4444', 'P2 Urgente': '#f59e0b', 'P3 Normal': '#3b82f6', 'P4 Mejora': '#8b5cf6' }

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [wsNotif, setWsNotif] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const d = await obtenerDashboard()
      setData(d)
      setLastUpdate(new Date())
    } catch (e: any) {
      console.error('[Dashboard]', e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useDashboardWS(useCallback((evento: EventoDashboard) => {
    const labels: Record<string,string> = {
      ot_creada:              '🔧 Nueva OT creada',
      ot_actualizada:         '✅ OT actualizada',
      activo_actualizado:     '⚙️ Estado de activo cambió',
      inventario_actualizado: '📦 Stock de inventario cambió',
      catalogo_actualizado:   '📋 Catálogo de materiales cambió',
      plan_actualizado:       '🗓️ Plan PM actualizado',
      tecnico_actualizado:    '👷 Técnicos actualizados',
      nueva_orden_compra:     '🛒 Nueva orden de compra',
    }
    setWsNotif(labels[evento.tipo] || `⚡ ${evento.tipo}`)
    fetchData()
    setTimeout(() => setWsNotif(null), 4000)
  }, [fetchData]))

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Cargando tablero ejecutivo...</span>
    </div>
  )

  if (!data) return (
    <div className="empty-state" style={{ padding: '80px 0' }}>
      <div className="empty-state-icon">📊</div>
      <div className="empty-state-title">Sin datos disponibles</div>
      <div className="empty-state-text">No se pudo conectar con el servidor. ¿Está corriendo <code>node server.js</code>?</div>
      <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={fetchData}><RefreshCw size={14} /> Reintentar</button>
    </div>
  )

  const { kpis, graficos, tablas } = data
  const { ordenes: ot, activos: act, planes: pm, materiales: mat } = kpis

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── TOPBAR ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(59,130,246,0.4)' }}>
            <BarChart2 size={21} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>Tablero Ejecutivo</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>KPIs en tiempo real · todos los módulos</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {wsNotif && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '99px', padding: '5px 11px' }}>
              <Zap size={12} /> {wsNotif}
            </div>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 11px' }}>
            {lastUpdate.toLocaleTimeString('es-ES')}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}><RefreshCw size={13} /></button>
        </div>
      </div>

      {/* ── FILA 1 — 8 KPI CARDS ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px,1fr))', gap: '12px' }}>
        <StatCard icon={<Activity size={20}/>}    color="#3b82f6" label="OTs Abiertas"       value={ot.abiertas + ot.enProceso}       sub={`${ot.abiertas} abiertas · ${ot.enProceso} en proceso`} trend={ot.abiertas > 5 ? 'down' : 'up'} />
        <StatCard icon={<CheckCircle2 size={20}/>} color="#10b981" label="OTs Cerradas"       value={ot.cerradas}                      sub={`${ot.cerradasMes} cerradas este mes`} trend="up" />
        <StatCard icon={<AlertTriangle size={20}/>} color="#ef4444" label="P1 Emergencias"    value={ot.p1Emergencias}                 sub="Requieren atención inmediata" trend={ot.p1Emergencias > 0 ? 'down' : 'neutral'} />
        <StatCard icon={<Clock size={20}/>}        color="#f59e0b" label="MTTR Promedio"      value={`${ot.mttr}h`}                    sub="Tiempo medio de reparación" />
        <StatCard icon={<Shield size={20}/>}       color="#10b981" label="Disponibilidad"     value={`${act.disponibilidad}%`}          sub={`${act.operativos}/${act.total} activos OK`} trend={act.disponibilidad >= 80 ? 'up' : 'down'} extra={<Ring pct={act.disponibilidad} color="#10b981" />} />
        <StatCard icon={<Calendar size={20}/>}     color="#8b5cf6" label="Cumplimiento PM"    value={`${pm.cumplimientoPM}%`}          sub={`${pm.ejecutadosPM}/${pm.programadosPM} PMs ejecutados`} trend={pm.cumplimientoPM >= 80 ? 'up' : 'down'} extra={<Ring pct={pm.cumplimientoPM} color="#8b5cf6" />} />
        <StatCard icon={<Package size={20}/>}      color="#f59e0b" label="Alertas de Stock"   value={mat.stockBajoMinimo}               sub={`${mat.sinStock} materiales sin stock`} trend={mat.stockBajoMinimo > 0 ? 'down' : 'neutral'} />
        <StatCard icon={<TrendingUp size={20}/>}   color="#3b82f6" label="Valor Inventario"   value={money(mat.valorInventario)}        sub={`${mat.total} materiales en catálogo`} />
      </div>

      {/* ── FILA 2 — GRÁFICO BARRAS + DONUTS ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>

        {/* Historial mensual */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <SectionTitle icon={<BarChart2 size={15}/>} title="OTs por Mes — últimos 6 meses" />
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
              {[{c:'#10b981',l:'Prev.'},{c:'#ef4444',l:'Corr.'},{c:'#3b82f6',l:'Cerradas'}].map(x=>(
                <span key={x.l} style={{ display:'flex', alignItems:'center', gap:3, color:'var(--text-muted)' }}>
                  <div style={{ width:8,height:8,borderRadius:2,background:x.c }}/>{x.l}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '110px' }}>
            {graficos.historialMeses.map(m => {
              const maxV = Math.max(...graficos.historialMeses.map(x => x.total), 1)
              const h = (v: number) => `${Math.max((v / maxV) * 100, 3)}%`
              return (
                <div key={m.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '4px' }}>
                  <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '85%' }}>
                    <div style={{ flex:1, height:h(m.preventivo), background:'#10b981cc', borderRadius:'3px 3px 0 0', minHeight:2 }} title={`Prev: ${m.preventivo}`} />
                    <div style={{ flex:1, height:h(m.correctivo), background:'#ef4444cc', borderRadius:'3px 3px 0 0', minHeight:2 }} title={`Corr: ${m.correctivo}`} />
                    <div style={{ flex:1, height:h(m.cerradas),   background:'#3b82f6',   borderRadius:'3px 3px 0 0', minHeight:2 }} title={`Cerr: ${m.cerradas}`} />
                  </div>
                  <span style={{ fontSize:'10px', color:'var(--text-muted)', textAlign:'center', lineHeight:1 }}>{m.mes}</span>
                  <span style={{ fontSize:'9px', fontWeight:700, color:'var(--text-secondary)' }}>{m.total}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Donuts estado y tipo */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SectionTitle icon={<Activity size={15}/>} title="Distribución OTs" />
          {[
            { label: 'Por Estado', items: graficos.estadosOT },
            { label: 'Por Tipo',   items: graficos.tiposOT   },
          ].map(grp => {
            const total = grp.items.reduce((a,s) => a + s.value, 0) || 1
            const r = 20, circ = 2 * Math.PI * r
            let off = 0
            return (
              <div key={grp.label}>
                <div style={{ fontSize:'11px', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>{grp.label}</div>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <svg width={54} height={54} viewBox="0 0 54 54" style={{ flexShrink:0 }}>
                    <circle cx={27} cy={27} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8}/>
                    {grp.items.filter(s=>s.value>0).map((s,i) => {
                      const dash = (s.value/total)*circ
                      const el = <circle key={i} cx={27} cy={27} r={r} fill="none" stroke={s.color} strokeWidth={8} strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-off} strokeLinecap="round" transform="rotate(-90 27 27)" style={{transition:'stroke-dasharray 600ms ease'}}/>
                      off += dash; return el
                    })}
                  </svg>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'4px' }}>
                    {grp.items.map(s => (
                      <div key={s.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:5, color:'var(--text-secondary)' }}>
                          <div style={{ width:6,height:6,borderRadius:'50%',background:s.color }}/>{s.name}
                        </span>
                        <span style={{ fontWeight:700, color:s.color }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── FILA 3 — CARGA TÉCNICOS + OTs PENDIENTES ─────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Técnicos */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
          <SectionTitle icon={<Users size={15}/>} title="Carga por Técnico" badge={`${graficos.cargaTecnicos.length} técnicos`} />
          {graficos.cargaTecnicos.length === 0
            ? <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'20px', fontSize:'13px' }}>Sin datos de técnicos</div>
            : graficos.cargaTecnicos.map(t => {
                const maxT = Math.max(...graficos.cargaTecnicos.map(x=>x.total), 1)
                const pct = Math.min(100, Math.round((t.total / maxT) * 100))
                const col = t.abiertas > 3 ? '#ef4444' : t.abiertas > 1 ? '#f59e0b' : '#10b981'
                return (
                  <div key={t.nombre} style={{ marginBottom:'11px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'12px' }}>
                      <span style={{ color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'65%' }}>{t.nombre}</span>
                      <span style={{ color:'var(--text-muted)', fontWeight:500, flexShrink:0 }}>
                        <span style={{ color:col, fontWeight:700 }}>{t.abiertas}</span> abiertas · {t.cerradas} cerradas
                      </span>
                    </div>
                    <div style={{ height:'5px', background:'var(--bg-input)', borderRadius:'99px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:'99px', transition:'width 600ms ease' }}/>
                    </div>
                  </div>
                )
              })
          }
        </div>

        {/* OTs Pendientes */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
          <SectionTitle icon={<Wrench size={15}/>} title="OTs Pendientes" badge={`${tablas.otsPendientes.length}`} />
          {tablas.otsPendientes.length === 0
            ? <div style={{ textAlign:'center', padding:'28px', fontSize:'13px', color:'var(--text-muted)' }}>🎉 Sin OTs pendientes</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {tablas.otsPendientes.map(ot => {
                  const isPreventivo = ot.tipo_mantenimiento === 'Preventivo';
                  const baseColor = pColor[ot.prioridad] || '#64748b';
                  
                  return (
                    <div key={ot.id} style={{
                      position: 'relative',
                      background: isPreventivo 
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(52,211,153,0.02) 100%)' 
                        : 'var(--bg-input)',
                      border: isPreventivo 
                        ? '1px solid rgba(16,185,129,0.4)' 
                        : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      overflow: 'hidden',
                      boxShadow: isPreventivo ? '0 4px 20px rgba(16,185,129,0.1)' : 'none',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}>
                      {/* Borde izquierdo brillante para preventivo */}
                      {isPreventivo && (
                        <div style={{
                          position: 'absolute',
                          left: 0, top: 0, bottom: 0, width: '4px',
                          background: 'linear-gradient(180deg, #10b981, #34d399)',
                          boxShadow: '0 0 10px #10b981'
                        }} />
                      )}

                      <div style={{ width:10,height:10,borderRadius:'50%',background:baseColor,flexShrink:0,boxShadow:`0 0 8px ${baseColor}` }}/>
                      
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'14px',fontWeight:800,color:'var(--text-primary)' }}>{ot.activo_tag}</span>
                          {isPreventivo && (
                            <span style={{
                              fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                              background: 'rgba(16,185,129,0.2)', color: '#34d399',
                              padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(16,185,129,0.3)',
                              animation: 'pulse 2s infinite'
                            }}>
                              ✨ Preventivo
                            </span>
                          )}
                          {ot.tipo_mantenimiento === 'Correctivo' && (
                            <span style={{
                              fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                              padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(239,68,68,0.2)'
                            }}>
                              🛠️ Correctivo
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:'11px',color:'var(--text-muted)',marginTop:'4px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{ot.tecnico_asignado || 'Sin asignar'}</span>
                          {!isPreventivo && ot.tipo_mantenimiento !== 'Correctivo' && ` · ${ot.tipo_mantenimiento}`}
                        </div>
                      </div>
                      
                      <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'5px',flexShrink:0 }}>
                        <span style={{ fontSize:'10px',fontWeight:800,padding:'3px 9px',borderRadius:'99px',background:`${baseColor}1a`,color:baseColor,border:`1px solid ${baseColor}40` }}>
                          {(ot.prioridad||'').replace(/P\d /,'')}
                        </span>
                        <span style={{ fontSize:'10px',fontWeight:700,color:ot.estado==='Abierta'?'#3b82f6':'#f59e0b' }}>{ot.estado}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      </div>

      {/* ── FILA 4 — ALERTAS DE MATERIALES Y VALOR ────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Materiales Bajo Mínimo */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
          <SectionTitle icon={<AlertTriangle size={15}/>} title="Materiales Críticos (Bajo Stock)" badge={`${tablas.materialesBajoStock.length}`} />
          {tablas.materialesBajoStock.length === 0
            ? <div style={{ textAlign:'center', padding:'28px', fontSize:'13px', color:'var(--text-muted)' }}>✅ Inventario saludable</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                {tablas.materialesBajoStock.map(m => (
                  <div key={m.id} style={{ background:'var(--bg-input)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'var(--radius-sm)', padding:'10px 13px', display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:34,height:34,borderRadius:'8px',background:'rgba(245,158,11,0.1)',display:'flex',alignItems:'center',justifyContent:'center',color:'#f59e0b',flexShrink:0 }}>
                      <Package size={16}/>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:'13px',fontWeight:700,color:'var(--text-primary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{m.nombre}</div>
                      <div style={{ fontSize:'11px',color:'var(--text-muted)',marginTop:'2px' }}>
                        Costo uni: {money(m.costo_unitario)}
                      </div>
                    </div>
                    <div style={{ textAlign:'right',flexShrink:0 }}>
                      <div style={{ fontSize:'14px',fontWeight:800,color:m.stock === 0 ? '#ef4444' : '#f59e0b' }}>{m.stock}</div>
                      <div style={{ fontSize:'10px',color:'var(--text-muted)' }}>Mín: {m.stock_minimo}</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Top Valor Inventario */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
          <SectionTitle icon={<DollarSign size={15}/>} title="Top Inversión en Inventario" badge={`Top ${tablas.materialesValorados.length}`} />
          {tablas.materialesValorados.length === 0
            ? <div style={{ textAlign:'center', padding:'28px', fontSize:'13px', color:'var(--text-muted)' }}>Sin materiales valorados</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {tablas.materialesValorados.map((m, idx) => {
                   const maxVal = Math.max(...tablas.materialesValorados.map(x=>x.valor_total), 1)
                   const pct = Math.min(100, Math.max(3, Math.round((m.valor_total / maxVal) * 100)))
                   return (
                     <div key={m.id} style={{ marginBottom:'4px' }}>
                       <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                         <div style={{ display:'flex', alignItems:'center', gap:'8px', minWidth:0 }}>
                           <span style={{ fontSize:'10px', fontWeight:800, color:'var(--text-muted)', background:'var(--bg-input)', border:'1px solid var(--border-color)', padding:'2px 6px', borderRadius:'4px' }}>#{idx+1}</span>
                           <span style={{ fontSize:'12px', fontWeight:600, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'160px' }}>{m.nombre}</span>
                         </div>
                         <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                           <span style={{ fontSize:'13px', fontWeight:800, color:'var(--accent-blue)' }}>{money(m.valor_total)}</span>
                           <span style={{ fontSize:'10px', color:'var(--text-muted)' }}>{m.stock} unidades</span>
                         </div>
                       </div>
                       <div style={{ height:'5px', background:'var(--bg-input)', borderRadius:'99px', overflow:'hidden' }}>
                         <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius:'99px', transition:'width 600ms ease' }}/>
                       </div>
                     </div>
                   )
                })}
              </div>
          }
        </div>
      </div>

      {/* ── FILA 5 — STATUS DETALLADO ─────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'12px' }}>
        {[
          { label:'Activos Operativos',   value:act.operativos,      total:act.total, color:'#10b981', icon:<CheckCircle2 size={15}/> },
          { label:'En Mantenimiento',      value:act.enMantenimiento, total:act.total, color:'#f59e0b', icon:<Wrench size={15}/> },
          { label:'Fuera de Servicio',     value:act.fueraServicio,   total:act.total, color:'#ef4444', icon:<AlertTriangle size={15}/> },
          { label:'PM Vencidos',           value:pm.vencidos,         total:pm.total,  color:'#ef4444', icon:<Calendar size={15}/> },
          { label:'PM Próximos (<3d)',      value:pm.proximos3d,       total:pm.total,  color:'#f59e0b', icon:<Clock size={15}/> },
          { label:'PM Al Día',             value:pm.alDia,            total:pm.total,  color:'#10b981', icon:<Shield size={15}/> },
        ].map(({ label, value, total, color, icon }) => {
          const pct = total > 0 ? Math.round((value / total) * 100) : 0
          return (
            <div key={label} style={{ background:'var(--bg-card)', border:`1px solid ${color}22`, borderRadius:'var(--radius-lg)', padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                <span style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:600, lineHeight:1.3 }}>{label}</span>
                <span style={{ color }}>{icon}</span>
              </div>
              <div style={{ fontSize:'30px', fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>{value}</div>
              <div style={{ marginTop:'8px', height:'4px', background:'var(--bg-input)', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${color},${color}80)`, borderRadius:'99px', transition:'width 700ms ease' }}/>
              </div>
              <div style={{ fontSize:'10px', color:'var(--text-muted)', marginTop:'4px' }}>{pct}% de {total}</div>
            </div>
          )
        })}
      </div>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <div style={{ textAlign:'center', fontSize:'11px', color:'var(--text-muted)', paddingTop:'4px', borderTop:'1px solid var(--border-color)' }}>
        Generado: {new Date(data.generado).toLocaleString('es-ES')} · Actualización automática vía WebSocket
      </div>
    </div>
  )
}
