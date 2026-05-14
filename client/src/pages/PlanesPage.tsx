import React, { useState, useEffect } from 'react';
import { planesAPI, PlanMantenimiento } from '../api/planes';
import { listarTecnicos, Tecnico } from '../api/tecnicos';
import { listarActivos, Activo } from '../api/activos';
import PlanForm from '../components/PlanForm';
import {
  Calendar, Plus, Search, CheckCircle2, Play, Trash2,
  Activity, Clock, Wrench, XCircle, Archive, User,
  AlertTriangle, Shield, ChevronRight, Zap
} from 'lucide-react';
import { useToast } from '../components/Toast';

const PlanesPage: React.FC = () => {
  const [planes, setPlanes] = useState<PlanMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pestana, setPestana] = useState<'activos' | 'cerrados'>('activos');
  const [showModal, setShowModal] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<PlanMantenimiento | null>(null);
  const [errorModal, setErrorModal] = useState<{ show: boolean, message: string, detalle: string } | null>(null);
  const { showSuccess, showError } = useToast();

  const [tecnicoMap, setTecnicoMap] = useState<Record<string, Tecnico>>({});
  const [activoMap, setActivoMap] = useState<Record<string, Activo>>({});

  useEffect(() => {
    listarTecnicos().then(res => {
      const map: Record<string, Tecnico> = {};
      (res.data || []).forEach((t: Tecnico) => { map[t.nombre] = t; });
      setTecnicoMap(map);
    }).catch(() => {});
    listarActivos().then(res => {
      const map: Record<string, Activo> = {};
      (res.data || []).forEach((a: Activo) => { map[a.tag] = a; });
      setActivoMap(map);
    }).catch(() => {});
  }, []);

  const fetchPlanes = async () => {
    try {
      setLoading(true);
      setPlanes(await planesAPI.getAll());
    } catch (err: any) {
      showError('No se pudo cargar la lista de planes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlanes(); }, []);

  const handleEjecutar = async (id: string, activo: string) => {
    if (!window.confirm(`¿Generar OT preventiva para ${activo}?`)) return;
    try {
      await planesAPI.ejecutar(id);
      showSuccess(`OT Preventiva generada para ${activo}`);
      fetchPlanes();
    } catch (err: any) {
      if (err.detalle) {
        setErrorModal({ show: true, message: err.message, detalle: err.detalle });
      } else {
        showError(err.message || 'Error al ejecutar plan');
      }
    }
  };

  const handleCerrar = async (id: string) => {
    if (!window.confirm('¿Cerrar este plan?')) return;
    try {
      await planesAPI.cerrar(id);
      showSuccess('Plan cerrado correctamente');
      fetchPlanes();
    } catch (err: any) { showError(err.message || 'Error al cerrar el plan'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este plan de mantenimiento?')) return;
    try {
      await planesAPI.delete(id);
      showSuccess('Plan eliminado correctamente');
      fetchPlanes();
    } catch (err: any) { showError(err.message || 'Error al eliminar el plan'); }
  };

  const planesActivos = planes.filter(p => !p.cerrado &&
    (p.activo_tag.toLowerCase().includes(busqueda.toLowerCase()) ||
     p.tarea.toLowerCase().includes(busqueda.toLowerCase()))
  );
  const planesCerrados = planes.filter(p => p.cerrado &&
    (p.activo_tag.toLowerCase().includes(busqueda.toLowerCase()) ||
     p.tarea.toLowerCase().includes(busqueda.toLowerCase()))
  );
  const planesFiltrados = pestana === 'activos' ? planesActivos : planesCerrados;

  // KPIs
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();
  let ejecutados = 0, pendientes = 0;
  planes.filter(p => !p.cerrado).forEach(p => {
    const fUltima = p.ultima_ejecucion ? new Date(p.ultima_ejecucion) : null;
    const fProxima = new Date(p.proxima_fecha);
    const ejecutadoEsteMes = fUltima && fUltima.getMonth() === mesActual && fUltima.getFullYear() === anioActual;
    const venceEsteMes = fProxima.getMonth() === mesActual && fProxima.getFullYear() === anioActual;
    if (ejecutadoEsteMes) ejecutados++;
    else if (venceEsteMes || p.estado === 'Vencido') pendientes++;
  });
  const programados = ejecutados + pendientes;
  const pct = programados === 0 ? 100 : Math.round((ejecutados / programados) * 100);

  const vencidos = planesActivos.filter(p => p.estado === 'Vencido').length;
  const proximos = planesActivos.filter(p => p.estado === 'Proximo en <3 dias').length;
  const alDia    = planesActivos.filter(p => p.estado === 'Al dia').length;

  // Color config por estado
  const estadoConfig = (estado: string) => {
    if (estado === 'Vencido')            return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', glow: '0 0 20px rgba(239,68,68,0.15)', label: 'Vencido', icon: <AlertTriangle size={13}/> };
    if (estado === 'Proximo en <3 dias') return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', glow: '0 0 20px rgba(245,158,11,0.1)', label: 'Próximo', icon: <Clock size={13}/> };
    return                                      { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)',  glow: '0 0 20px rgba(16,185,129,0.08)', label: 'Al día',  icon: <Shield size={13}/> };
  };

  // Días restantes para próxima ejecución
  const diasRestantes = (proxima: string) => {
    const diff = Math.ceil((new Date(proxima).getTime() - hoy.getTime()) / 86400000);
    return diff;
  };

  const getInitials = (nombre: string) =>
    nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  return (
    <div className="page-content">

      {/* ── HEADER ── */}
      <div className="detail-header">
        <div>
          <h2 className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.35)' }}>
              <Calendar size={18} color="white" />
            </div>
            Planes de Mantenimiento
          </h2>
          <p className="topbar-subtitle">Gestión de tareas preventivas programadas</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setPlanToEdit(null); setShowModal(true); }}>
          <Plus size={18} /> Nuevo Plan PM
        </button>
      </div>

      {/* ── KPI STATS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { icon: <Activity size={18} />, color: '#3b82f6', glow: 'rgba(59,130,246,0.2)',  value: `${pct}%`,          label: 'Cumplimiento',    sub: `${ejecutados}/${programados} PMs` },
          { icon: <Shield size={18} />,   color: '#10b981', glow: 'rgba(16,185,129,0.2)',  value: alDia,              label: 'Al Día',           sub: 'planes en orden' },
          { icon: <Clock size={18} />,    color: '#f59e0b', glow: 'rgba(245,158,11,0.2)',  value: proximos,           label: 'Próximos',         sub: 'vencen en <3 días' },
          { icon: <AlertTriangle size={18}/>, color: '#ef4444', glow: 'rgba(239,68,68,0.2)', value: vencidos,         label: 'Vencidos',         sub: 'requieren atención' },
        ].map(({ icon, color, glow, value, label, sub }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: `0 0 0 0 ${glow}`, transition: 'all 200ms ease' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── BARRA DE FILTROS ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div className="search-wrapper" style={{ flex: 1, minWidth: '240px', maxWidth: '420px' }}>
          <Search className="search-icon" size={17} />
          <input type="text" className="search-input" placeholder="Buscar por activo o tarea..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>

        {/* Barra cumplimiento compacta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 16px' }}>
          <Zap size={15} color="#3b82f6" />
          <div style={{ width: '80px', height: '6px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct < 50 ? '#ef4444' : pct < 80 ? '#f59e0b' : '#10b981', borderRadius: '99px', transition: 'width 600ms ease' }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{pct}%</span>
        </div>
      </div>

      {/* ── PESTAÑAS ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {([
          { key: 'activos',   label: 'Planes Activos',  count: planesActivos.length,  icon: <Wrench size={15}/> },
          { key: 'cerrados',  label: 'Planes Cerrados', count: planesCerrados.length, icon: <Archive size={15}/> },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setPestana(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', borderRadius: 'var(--radius-md)',
              border: pestana === tab.key ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border-color)',
              background: pestana === tab.key ? 'linear-gradient(135deg,rgba(59,130,246,0.18),rgba(99,102,241,0.1))' : 'var(--bg-card)',
              color: pestana === tab.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              boxShadow: pestana === tab.key ? '0 0 20px rgba(59,130,246,0.1)' : 'none',
              transition: 'all 200ms ease',
            }}
          >
            {tab.icon} {tab.label}
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', background: pestana === tab.key ? 'rgba(59,130,246,0.2)' : 'var(--bg-input)', color: pestana === tab.key ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── GRID DE CARDS ── */}
      {loading ? (
        <div className="loading-spinner" style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
      ) : planesFiltrados.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <div className="empty-state-icon"><Calendar size={32} /></div>
          <div className="empty-state-title">Sin planes registrados</div>
          <div className="empty-state-text">No hay planes que coincidan con la búsqueda.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '18px' }}>
          {planesFiltrados.map(plan => {
            const cfg = estadoConfig(plan.estado);
            const activoInfo = activoMap[plan.activo_tag];
            const tecnicoInfo = plan.tecnico_asignado ? tecnicoMap[plan.tecnico_asignado] : null;
            const dias = diasRestantes(plan.proxima_fecha);
            const diasLabel = dias < 0 ? `Venció hace ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoy' : `En ${dias} días`;
            // Progreso visual de frecuencia (cuánto ha pasado desde última ejecución)
            const frecTotal = plan.frecuencia_dias || 1;
            let progPct = 100;
            if (plan.ultima_ejecucion) {
              const diasTranscurridos = Math.ceil((hoy.getTime() - new Date(plan.ultima_ejecucion).getTime()) / 86400000);
              progPct = Math.min(100, Math.round((diasTranscurridos / frecTotal) * 100));
            }

            return (
              <div
                key={plan.id}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${cfg.border}`,
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: cfg.glow,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 220ms ease',
                  position: 'relative',
                }}
              >
                {/* Barra superior de color por estado */}
                <div style={{ height: '3px', background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}80)` }} />

                {/* Cabecera de card */}
                <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'flex-start', gap: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  {/* Avatar activo */}
                  <div style={{ flexShrink: 0 }}>
                    {activoInfo?.imagen_url ? (
                      <img src={activoInfo.imagen_url} alt={plan.activo_tag} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: `2px solid ${cfg.color}60` }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: `${cfg.color}18`, border: `2px solid ${cfg.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                        ⚙️
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {plan.activo_tag}
                    </div>
                    {activoInfo?.nombre && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activoInfo.nombre}
                      </div>
                    )}
                  </div>

                  {/* Badge de estado */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, padding: '4px 9px', borderRadius: '99px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                    {cfg.icon} {cfg.label}
                  </div>
                </div>

                {/* Cuerpo */}
                <div style={{ padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  {/* Descripción tarea */}
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {plan.tarea}
                  </p>

                  {/* Frecuencia + barra de progreso */}
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Activity size={11} /> Frecuencia cada {plan.frecuencia_dias}d
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color }}>{diasLabel}</span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progPct}%`, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}bb)`, borderRadius: '99px', transition: 'width 600ms ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Última: {plan.ultima_ejecucion ? new Date(plan.ultima_ejecucion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Nunca'}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Próxima: {new Date(plan.proxima_fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Checklist preview */}
                  {plan.checklist && plan.checklist.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={11} /> Checklist ({plan.checklist.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {plan.checklist.slice(0, 3).map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item}</span>
                          </div>
                        ))}
                        {plan.checklist.length > 3 && (
                          <div style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '2px' }}>
                            +{plan.checklist.length - 3} ítems más
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Técnico */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    {tecnicoInfo?.foto_url ? (
                      <img src={tecnicoInfo.foto_url} alt={plan.tecnico_asignado || ''} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent-blue)' }} />
                    ) : (
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent-blue),var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {plan.tecnico_asignado ? getInitials(plan.tecnico_asignado) : <User size={12} />}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Técnico</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{plan.tecnico_asignado || 'Sin asignar'}</div>
                    </div>
                  </div>
                </div>

                {/* Footer acciones */}
                {pestana === 'activos' ? (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '7px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.12)' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '7px 10px' }}
                      onClick={() => handleEjecutar(plan.id, plan.activo_tag)}
                    >
                      <Play size={13} className="fill-current" /> Ejecutar OT
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px', padding: '7px 12px' }}
                      onClick={() => { setPlanToEdit(plan); setShowModal(true); }}
                      title="Editar"
                    >
                      <ChevronRight size={13} /> Editar
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontSize: '12px', padding: '7px 10px' }}
                      onClick={() => handleCerrar(plan.id)}
                      title="Cerrar plan"
                    >
                      <XCircle size={13} />
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', fontSize: '12px', padding: '7px 10px' }}
                      onClick={() => handleDelete(plan.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : plan.fecha_cierre ? (
                  <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)' }}>
                    <Archive size={12} />
                    Cerrado el {new Date(plan.fecha_cierre).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <PlanForm
          planToEdit={planToEdit}
          onClose={() => { setShowModal(false); setPlanToEdit(null); }}
          onSuccess={() => {
            setShowModal(false);
            setPlanToEdit(null);
            fetchPlanes();
            showSuccess(planToEdit ? 'Plan actualizado' : 'Plan creado correctamente');
          }}
        />
      )}

      {errorModal && errorModal.show && (
        <div className="modal-overlay" onClick={() => setErrorModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '16px' }}>
                <AlertTriangle size={30} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', marginTop: 0 }}>No se puede generar la OT</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', marginTop: 0 }}>{errorModal.message}</p>
              <div style={{ background: 'var(--bg-input)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
                {errorModal.detalle}
              </div>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setErrorModal(null)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanesPage;
