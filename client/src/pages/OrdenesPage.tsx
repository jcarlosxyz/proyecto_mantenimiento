import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarOrdenes } from '../api/ordenes';
import { listarTecnicos, Tecnico } from '../api/tecnicos';
import { listarActivos, type Activo } from '../api/activos';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight,
  Wrench
} from 'lucide-react';
import OrdenForm from '../components/OrdenForm';
import OrdenDetail from '../components/OrdenDetail';

interface OrdenTrabajo {
  id: string;
  numero_ot: string;
  activo_tag: string;
  prioridad: string;
  tipo_mantenimiento: string;
  estado: string;
  tecnico_asignado: string;
  fecha_limite_inicio: string;
  created_at: string;
}

const OrdenesPage: React.FC = () => {
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('ot_id'));

  useEffect(() => {
    const otIdQuery = searchParams.get('ot_id');
    if (otIdQuery) {
      setSelectedId(otIdQuery);
    } else {
      setSelectedId(null);
    }
  }, [searchParams]);

  // Limpiar el query param cuando se cierra el detalle de la orden
  const handleCloseDetail = () => {
    setSelectedId(null);
    searchParams.delete('ot_id');
    setSearchParams(searchParams);
  };


  // Mapa nombre → técnico para mostrar foto y datos
  const [tecnicoMap, setTecnicoMap] = useState<Record<string, Tecnico>>({})
  // Técnico sobre el que está el cursor (para el tooltip)
  const [hoveredTecnico, setHoveredTecnico] = useState<Tecnico | null>(null)
  const [tooltipPos, setTooltipPos]         = useState({ top: 0, left: 0 })

  // Mapa tag → activo
  const [activoMap, setActivoMap] = useState<Record<string, Activo>>({})
  const [hoveredActivo, setHoveredActivo] = useState<Activo | null>(null)
  const [tooltipActivoPos, setTooltipActivoPos] = useState({ top: 0, left: 0 })

  const fetchOrdenes = async () => {
    try {
      setLoading(true);
      const res = await listarOrdenes({ 
        estado: filtroEstado || undefined, 
        prioridad: filtroPrioridad || undefined 
      });
      let data = res.data || res.ordenes || res || [];
      
      if (busqueda) {
        data = data.filter((ot: any) => 
          ot.numero_ot?.toLowerCase().includes(busqueda.toLowerCase()) || 
          ot.activo_tag?.toLowerCase().includes(busqueda.toLowerCase())
        );
      }
      setOrdenes(data);
    } catch (err: any) {
      console.error('Error al cargar órdenes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdenes();
  }, [filtroEstado, filtroPrioridad]);

  // Cargar técnicos y activos una sola vez para el mapa de fotos
  useEffect(() => {
    listarTecnicos().then(res => {
      const data: Tecnico[] = res.data || [];
      const map: Record<string, Tecnico> = {};
      data.forEach(t => { map[t.nombre] = t; });
      setTecnicoMap(map);
    }).catch(() => {});

    listarActivos().then(res => {
      const data: Activo[] = res.data || [];
      const map: Record<string, Activo> = {};
      data.forEach(a => { map[a.tag] = a; });
      setActivoMap(map);
    }).catch(() => {});
  }, []);

  // Genera las iniciales de un nombre
  const getInitials = (nombre: string) =>
    nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  const getPriorityClass = (prio: string) => {
    switch (prio) {
      case 'P1 Emergencia': return 'badge-crit-a';
      case 'P2 Urgente': return 'badge-crit-b';
      case 'P3 Normal': return 'badge-crit-c';
      default: return 'badge-area';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Abierta': return 'badge-operativo';
      case 'En proceso': return 'badge-mantenimiento';
      case 'En espera': return 'badge-crit-b';
      case 'Cerrada': return 'badge-area';
      default: return '';
    }
  };

  if (selectedId) {
    return (
      <OrdenDetail 
        ordenId={selectedId} 
        onBack={handleCloseDetail} 
        onUpdated={() => fetchOrdenes()}
      />
    );
  }

  return (
    <div className="page-content">
      <div className="detail-header">
        <div>
          <h2 className="detail-title">Órdenes de Trabajo</h2>
          <p className="topbar-subtitle">Gestión y seguimiento de mantenimientos preventivos y correctivos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nueva OT
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar por OT o TAG..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrdenes()}
          />
        </div>
        
        <select 
          className="filter-select"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="Abierta">Abierta</option>
          <option value="En proceso">En proceso</option>
          <option value="En espera">En espera</option>
          <option value="Cerrada">Cerrada</option>
        </select>

        <select 
          className="filter-select"
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
        >
          <option value="">Todas las prioridades</option>
          <option value="P1 Emergencia">P1 Emergencia</option>
          <option value="P2 Urgente">P2 Urgente</option>
          <option value="P3 Normal">P3 Normal</option>
          <option value="P4 Mejora">P4 Mejora</option>
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>OT Numero</th>
                <th>Activo (TAG)</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Técnico</th>
                <th>Fecha Límite</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Cargando datos...</td>
                </tr>
              ) : ordenes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No hay órdenes registradas.</td>
                </tr>
              ) : (
                ordenes.map((ot) => (
                  <tr key={ot.id}>
                    <td className="detail-tag">{ot.numero_ot}</td>
                    <td>
                      <div 
                        className="flex items-center gap-2"
                        style={{ position: 'relative', cursor: 'default' }}
                        onMouseEnter={(e) => {
                          const act = activoMap[ot.activo_tag]
                          if (!act) return
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setTooltipActivoPos({ top: rect.top + window.scrollY - 8, left: rect.left + window.scrollX })
                          setHoveredActivo(act)
                        }}
                        onMouseLeave={() => setHoveredActivo(null)}
                      >
                        <Wrench size={14} className="text-secondary" />
                        <strong>{ot.activo_tag}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getPriorityClass(ot.prioridad)}`}>
                        <div className="badge-dot" />
                        {ot.prioridad.split(' ')[0]}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusClass(ot.estado)}`}>
                        {ot.estado}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', cursor: 'default' }}
                        onMouseEnter={(e) => {
                          const tec = tecnicoMap[ot.tecnico_asignado]
                          if (!tec) return
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setTooltipPos({ top: rect.top + window.scrollY - 8, left: rect.left + window.scrollX })
                          setHoveredTecnico(tec)
                        }}
                        onMouseLeave={() => setHoveredTecnico(null)}
                      >
                        {/* Avatar con foto o iniciales */}
                        {(() => {
                          const tec = tecnicoMap[ot.tecnico_asignado]
                          return tec?.foto_url ? (
                            <img
                              src={tec.foto_url}
                              alt={ot.tecnico_asignado}
                              style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%', objectFit: 'cover',
                                border: '2px solid var(--border-color)', flexShrink: 0
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0
                            }}>
                              {getInitials(ot.tecnico_asignado)}
                            </div>
                          )
                        })()}
                        <span style={{ fontSize: '13px' }}>{ot.tecnico_asignado}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {new Date(ot.fecha_limite_inicio).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-muted">
                          {new Date(ot.fecha_limite_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm btn-icon"
                        onClick={() => setSelectedId(ot.id)}
                      >
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span className="pagination-info">Mostrando {ordenes.length} registros</span>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled>&lt;</button>
            <button className="pagination-btn active">1</button>
            <button className="pagination-btn" disabled>&gt;</button>
          </div>
        </div>
      </div>

      {showModal && (
        <OrdenForm 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            fetchOrdenes();
          }} 
        />
      )}

      {/* ── Tooltip de Técnico (tamaño doble) ── */}
      {hoveredTecnico && (
        <div
          style={{
            position: 'fixed',
            top:  tooltipPos.top - 320,
            left: tooltipPos.left,
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'fadeIn 150ms ease'
          }}
        >
          {/* Tarjeta */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
            minWidth: '440px',
            maxWidth: '520px'
          }}>
            {/* Cabecera: foto grande + nombre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
              {hoveredTecnico.foto_url ? (
                <img
                  src={hoveredTecnico.foto_url}
                  alt={hoveredTecnico.nombre}
                  style={{
                    width: '104px', height: '104px',
                    borderRadius: '50%', objectFit: 'cover',
                    border: '3px solid var(--accent-blue)',
                    boxShadow: '0 0 0 6px var(--accent-blue-glow)',
                    flexShrink: 0
                  }}
                />
              ) : (
                <div style={{
                  width: '104px', height: '104px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '36px', fontWeight: 800, color: '#fff', flexShrink: 0,
                  boxShadow: '0 0 0 6px var(--accent-blue-glow)'
                }}>
                  {getInitials(hoveredTecnico.nombre)}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '20px', color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '8px' }}>
                  {hoveredTecnico.nombre}
                </div>
                <div style={{
                  fontSize: '13px',
                  background: 'var(--accent-blue-glow)',
                  color: 'var(--accent-blue)',
                  borderRadius: '100px', padding: '4px 14px',
                  display: 'inline-block', fontWeight: 700,
                  letterSpacing: '0.3px'
                }}>
                  {hoveredTecnico.especialidad}
                </div>
              </div>
            </div>

            {/* Separador */}
            <div style={{ borderTop: '1px solid var(--border-color)', marginBottom: '16px' }} />

            {/* Datos de contacto */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              {hoveredTecnico.telefono && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '20px' }}>📱</span>
                  <span style={{ fontWeight: 500 }}>{hoveredTecnico.telefono}</span>
                </div>
              )}
              {hoveredTecnico.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '20px' }}>✉️</span>
                  <span style={{ wordBreak: 'break-all', fontWeight: 500 }}>{hoveredTecnico.email}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>
                  {hoveredTecnico.estado === 'Activo' ? '🟢' : '🔴'}
                </span>
                <span style={{
                  color: hoveredTecnico.estado === 'Activo' ? 'var(--accent-emerald)' : 'var(--accent-red)',
                  fontWeight: 700, fontSize: '15px'
                }}>
                  {hoveredTecnico.estado}
                </span>
              </div>
              {hoveredTecnico.turno && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '20px' }}>
                    {hoveredTecnico.turno === 'Mañana' ? '🌅'
                      : hoveredTecnico.turno === 'Tarde' ? '🌇'
                      : hoveredTecnico.turno === 'Noche' ? '🌙'
                      : '🔄'}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    Turno{' '}
                    <span style={{
                      color: hoveredTecnico.turno === 'Mañana' ? '#f59e0b'
                        : hoveredTecnico.turno === 'Tarde' ? '#f97316'
                        : hoveredTecnico.turno === 'Noche' ? '#818cf8'
                        : '#10b981'
                    }}>{hoveredTecnico.turno}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Flecha apuntando hacia abajo */}
          <div style={{
            width: 0, height: 0,
            borderLeft:  '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop:   '12px solid var(--bg-card)',
            margin: '0 24px',
            filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.3))'
          }} />
        </div>
      )}

      {/* ── Tooltip de Activo (tamaño doble) ── */}
      {hoveredActivo && (
        <div
          style={{
            position: 'fixed',
            top:  tooltipActivoPos.top - 330,
            left: tooltipActivoPos.left,
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'fadeIn 150ms ease'
          }}
        >
          {/* Tarjeta */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
            minWidth: '440px',
            maxWidth: '520px'
          }}>
            {/* Cabecera: foto grande + tag/nombre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
              {hoveredActivo.imagen_url ? (
                <img
                  src={hoveredActivo.imagen_url}
                  alt={hoveredActivo.tag}
                  style={{
                    width: '104px', height: '104px',
                    borderRadius: '16px', objectFit: 'cover',
                    border: '3px solid var(--accent-emerald)',
                    boxShadow: '0 0 0 6px rgba(16, 185, 129, 0.15)',
                    flexShrink: 0
                  }}
                />
              ) : (
                <div style={{
                  width: '104px', height: '104px', borderRadius: '16px',
                  background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-blue))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '44px', color: '#fff', flexShrink: 0,
                  boxShadow: '0 0 0 6px rgba(16, 185, 129, 0.15)'
                }}>
                  ⚙️
                </div>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '22px', color: 'var(--accent-emerald)', lineHeight: 1.2, marginBottom: '6px' }}>
                  {hoveredActivo.tag}
                </div>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '10px' }}>
                  {hoveredActivo.nombre}
                </div>
                <div style={{
                  fontSize: '13px',
                  background: 'var(--accent-blue-glow)',
                  color: 'var(--accent-blue)',
                  borderRadius: '100px', padding: '4px 14px',
                  display: 'inline-block', fontWeight: 700,
                  letterSpacing: '0.3px'
                }}>
                  {hoveredActivo.area}
                </div>
              </div>
            </div>

            {/* Separador */}
            <div style={{ borderTop: '1px solid var(--border-color)', marginBottom: '16px' }} />

            {/* Detalles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Criticidad: <span style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{hoveredActivo.criticidad}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>
                  {hoveredActivo.estado === 'Operativo' ? '🟢' : hoveredActivo.estado === 'En mantenimiento' ? '🔧' : '🔴'}
                </span>
                <span style={{
                  color: hoveredActivo.estado === 'Operativo' ? 'var(--accent-emerald)' : hoveredActivo.estado === 'En mantenimiento' ? '#f59e0b' : 'var(--accent-red)',
                  fontWeight: 700, fontSize: '15px'
                }}>
                  {hoveredActivo.estado}
                </span>
              </div>
            </div>
          </div>

          {/* Flecha apuntando hacia abajo */}
          <div style={{
            width: 0, height: 0,
            borderLeft:  '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop:   '12px solid var(--bg-card)',
            margin: '0 24px',
            filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.3))'
          }} />
        </div>
      )}

    </div>
  );
};

export default OrdenesPage;
