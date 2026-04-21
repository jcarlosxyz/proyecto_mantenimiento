import React, { useState, useEffect } from 'react';
import { listarOrdenes } from '../api/ordenes';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight,
  User,
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        onBack={() => setSelectedId(null)} 
        onUpdated={() => fetchOrdenes()}
      />
    );
  }

  return (
    <div className="page-content">
      {/* ... cabecera y filtros se mantienen igual ... */}
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
                      <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-muted" />
                        {ot.tecnico_asignado}
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
    </div>
  );
};

export default OrdenesPage;
