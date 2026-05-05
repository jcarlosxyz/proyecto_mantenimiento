import React, { useState, useEffect } from 'react';
import { planesAPI, PlanMantenimiento } from '../api/planes';
import { listarTecnicos, Tecnico } from '../api/tecnicos';
import { listarActivos, Activo } from '../api/activos';
import PlanForm from '../components/PlanForm';
import { Calendar, Plus, Search, CheckCircle, Play, Trash2, Activity, Clock, Wrench, XCircle, Archive } from 'lucide-react';
import { useToast } from '../components/Toast';

const PlanesPage: React.FC = () => {
  const [planes, setPlanes] = useState<PlanMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pestana, setPestana] = useState<'activos' | 'cerrados'>('activos');
  
  const [showModal, setShowModal] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<PlanMantenimiento | null>(null);
  const { showSuccess, showError } = useToast();

  const [tecnicoMap, setTecnicoMap] = useState<Record<string, Tecnico>>({});
  const [activoMap, setActivoMap] = useState<Record<string, Activo>>({});

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

  const getInitials = (nombre: string) =>
    nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  const fetchPlanes = async () => {
    try {
      setLoading(true);
      const data = await planesAPI.getAll();
      setPlanes(data);
    } catch (err: any) {
      console.error('Error al cargar planes:', err.message);
      showError('No se pudo cargar la lista de planes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanes();
  }, []);

  const handleEjecutar = async (id: string, activo: string) => {
    if (window.confirm(`¿Deseas generar la OT preventiva para el activo ${activo}?`)) {
      try {
        await planesAPI.ejecutar(id);
        showSuccess(`OT Preventiva generada para ${activo}`);
        fetchPlanes();
      } catch (err: any) {
        showError(err.message || 'Error al ejecutar plan');
      }
    }
  };
  const handleCerrar = async (id: string) => {
    if (window.confirm('¿Deseas cerrar este plan? Ya no aparecerá en la lista de planes activos.')) {
      try {
        await planesAPI.cerrar(id);
        showSuccess('Plan cerrado correctamente');
        fetchPlanes();
      } catch (err: any) {
        showError(err.message || 'Error al cerrar el plan');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este plan de mantenimiento?')) {
      try {
        await planesAPI.delete(id);
        showSuccess('Plan eliminado correctamente');
        fetchPlanes();
      } catch (err: any) {
        showError(err.message || 'Error al eliminar el plan');
      }
    }
  };

  const getBadgeClass = (estado: string) => {
    if (estado === 'Al dia') return 'badge-operativo';
    if (estado === 'Proximo en <3 dias') return 'badge-mantenimiento';
    if (estado === 'Vencido') return 'badge-crit-a';
    return 'badge-secondary';
  };

  const planesActivos = planes.filter(p => !p.cerrado && (
    p.activo_tag.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.tarea.toLowerCase().includes(busqueda.toLowerCase())
  ));

  const planesCerrados = planes.filter(p => p.cerrado && (
    p.activo_tag.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.tarea.toLowerCase().includes(busqueda.toLowerCase())
  ));

  const planesFiltrados = pestana === 'activos' ? planesActivos : planesCerrados;

  // Calcular cumplimiento mensual
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  let ejecutados = 0;
  let pendientes = 0;

  planes.forEach(p => {
    if (p.cerrado) return; // excluir cerrados del KPI
    const fUltima = p.ultima_ejecucion ? new Date(p.ultima_ejecucion) : null;
    const fProxima = new Date(p.proxima_fecha);

    const ejecutadoEsteMes = fUltima && fUltima.getMonth() === mesActual && fUltima.getFullYear() === anioActual;
    const venceEsteMes = fProxima.getMonth() === mesActual && fProxima.getFullYear() === anioActual;

    if (ejecutadoEsteMes) {
      ejecutados++;
    } else if (venceEsteMes || p.estado === 'Vencido') {
      pendientes++;
    }
  });

  const programados = ejecutados + pendientes;
  const porcentajeCumplimiento = programados === 0 ? 100 : Math.round((ejecutados / programados) * 100);

  // Solo calcular sobre activos
  const planesParaKPI = planes.filter(p => !p.cerrado);

  const getSemaforoIcon = (estado: string) => {
    if (estado === 'Al dia') return <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>;
    if (estado === 'Proximo en <3 dias') return <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-pulse"></span>;
    if (estado === 'Vencido') return <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>;
    return null;
  };

  return (
    <div className="page-content">
      <div className="detail-header">
        <div>
          <h2 className="detail-title flex items-center gap-2">
            <Calendar size={24} className="text-blue-500" />
            Planes de Mantenimiento (PM)
          </h2>
          <p className="topbar-subtitle">Gestión de tareas preventivas programadas</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setPlanToEdit(null);
          setShowModal(true);
        }}>
          <Plus size={18} /> Nuevo Plan PM
        </button>
      </div>

      <div className="filters-bar flex flex-wrap gap-4 items-center justify-between">
        <div className="search-wrapper" style={{ flex: 1, minWidth: '250px', maxWidth: '400px' }}>
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar por Activo o Tarea..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* KPI: Cumplimiento Mensual */}
        <div className="bg-input border border-color rounded-lg px-4 py-2 flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted">
            <Activity size={20} className="text-blue-400" />
            <span className="text-sm font-medium">Cumplimiento Mensual:</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-white leading-none">{porcentajeCumplimiento}%</div>
              <div className="text-[10px] uppercase tracking-wider opacity-60 mt-1">{ejecutados} de {programados} PMs</div>
            </div>
            {/* Barra de progreso circular o lineal */}
            <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${porcentajeCumplimiento < 50 ? 'bg-red-500' : porcentajeCumplimiento < 80 ? 'bg-yellow-400' : 'bg-green-500'}`} 
                style={{ width: `${porcentajeCumplimiento}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas: Activos / Cerrados */}
      <div className="flex gap-3 mb-6">
        <button
          className={`btn ${pestana === 'activos' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPestana('activos')}
        >
          <Wrench size={18} />
          Planes Activos
          <span className={`ml-1 text-xs font-bold px-2 py-0.5 rounded-full ${pestana === 'activos' ? 'bg-white/20 text-white' : 'bg-gray-600 text-gray-300'}`}>
            {planesActivos.length}
          </span>
        </button>
        <button
          className={`btn ${pestana === 'cerrados' ? 'btn-secondary' : 'btn-ghost'}`}
          style={pestana === 'cerrados' ? { background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' } : {}}
          onClick={() => setPestana('cerrados')}
        >
          <Archive size={18} />
          Planes Cerrados
          <span className={`ml-1 text-xs font-bold px-2 py-0.5 rounded-full ${pestana === 'cerrados' ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-400'}`}>
            {planesCerrados.length}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted">Cargando planes...</div>
        ) : planesFiltrados.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted bg-input rounded-xl border border-dashed border-color">
            <Calendar className="mx-auto mb-3 opacity-50" size={32} />
            No hay planes registrados o que coincidan con la búsqueda.
          </div>
        ) : (
          planesFiltrados.map((plan) => {
            const activoInfo = activoMap[plan.activo_tag];
            const tecnicoInfo = plan.tecnico_asignado ? tecnicoMap[plan.tecnico_asignado] : null;

            return (
              <div key={plan.id} className="card flex flex-col h-full bg-[var(--bg-card)] border border-color hover:border-blue-500/30 transition-all p-4 rounded-xl shadow-sm hover:shadow-md">
                
                {/* Contenido Superior del Plan */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* 1. TAG del Activo y Estado */}
                  <div className="mb-4">
                    <h3 className="font-bold text-[18px] text-white leading-tight truncate flex items-center gap-2">
                      <Wrench size={16} className="text-secondary" />
                      {plan.activo_tag}
                    </h3>

                    <div className="mt-2">
                      <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${plan.estado === 'Vencido' ? 'bg-red-500/20 text-red-400' : plan.estado === 'Próximo' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {plan.estado}
                      </span>
                    </div>
                  </div>

                {/* 4. Tarea */}
                <p className="text-[13px] text-white/90 mb-4 line-clamp-3">
                  {plan.tarea}
                </p>

                {/* (El técnico se movió a la columna derecha) */}

                {/* 6. Detalles (Frecuencia, Última vez, Próxima) */}
                <div className="flex flex-col gap-0.5 text-[12px] mb-4">
                  <div className="flex items-center gap-1.5 text-gray-400 mt-1">
                    <Activity size={12} /> Frecuencia
                  </div>
                  <div className="text-white">{plan.frecuencia_dias} días</div>

                  <div className="flex items-center gap-1.5 text-gray-400 mt-2">
                    <Calendar size={12} /> Última vez
                  </div>
                  <div className="text-white">{plan.ultima_ejecucion || 'Nunca'}</div>

                  <div className="flex items-center gap-1.5 text-gray-400 mt-2">
                    <Clock size={12} /> Próxima OT:
                  </div>
                  <div className="text-white">{plan.proxima_fecha}</div>

                  {/* 7. Checklist */}
                  {plan.checklist && plan.checklist.length > 0 && (
                    <>
                      <div className="flex items-center gap-1.5 text-gray-400 mt-2 mb-0.5">
                        <CheckCircle size={12} /> Checklist ({plan.checklist.length} items)
                      </div>
                      <div className="text-white flex flex-col gap-0.5">
                        {plan.checklist.slice(0, 3).map((item, i) => (
                          <div key={i} className="truncate">{item}</div>
                        ))}
                        {plan.checklist.length > 3 && (
                          <div className="text-blue-400">+{plan.checklist.length - 3} más...</div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex-1"></div>

                {/* 8. Botones de Acción (solo en activos) */}
                {pestana === 'activos' && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-color flex-wrap">
                  <button
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                    onClick={() => handleEjecutar(plan.id, plan.activo_tag)}
                  >
                    <Play size={13} className="fill-current" /> Ejecutar
                  </button>
                  <button
                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    onClick={() => {
                      setPlanToEdit(plan);
                      setShowModal(true);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Editar
                  </button>
                  <button
                    className="btn btn-sm flex items-center gap-1.5"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                    title="Cerrar plan"
                    onClick={() => handleCerrar(plan.id)}
                  >
                    <XCircle size={13} /> Cerrar
                  </button>
                  <button
                    className="btn btn-sm flex items-center gap-1.5"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                    onClick={() => handleDelete(plan.id)}
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
                )}

                {/* Badge de fecha cierre en planes cerrados */}
                {pestana === 'cerrados' && plan.fecha_cierre && (
                  <div className="mt-4 pt-2 border-t border-color flex items-center gap-2 text-xs text-gray-500">
                    <Archive size={12} className="text-gray-500" />
                    Cerrado el: {new Date(plan.fecha_cierre).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                )}

                {/* Técnico Asignado (Estilo texto compacto) */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-color w-full">
                  <span className="text-[12px] text-gray-400 uppercase tracking-wider font-bold">Técnico:</span>
                  <span className="text-[13px] text-white font-medium">
                    {plan.tecnico_asignado || 'Sin asignar'}
                  </span>
                </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <PlanForm 
          planToEdit={planToEdit}
          onClose={() => {
            setShowModal(false);
            setPlanToEdit(null);
          }} 
          onSuccess={() => {
            setShowModal(false);
            setPlanToEdit(null);
            fetchPlanes();
            showSuccess(planToEdit ? 'Plan actualizado correctamente' : 'Plan creado correctamente');
          }} 
        />
      )}
    </div>
  );
};

export default PlanesPage;
