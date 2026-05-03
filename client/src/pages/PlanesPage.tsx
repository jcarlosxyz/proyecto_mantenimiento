import React, { useState, useEffect } from 'react';
import { planesAPI, PlanMantenimiento } from '../api/planes';
import PlanForm from '../components/PlanForm';
import { Calendar, Plus, Search, CheckCircle, AlertTriangle, XCircle, Play, Trash2, Activity } from 'lucide-react';
import { useToast } from '../components/Toast';

const PlanesPage: React.FC = () => {
  const [planes, setPlanes] = useState<PlanMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<PlanMantenimiento | null>(null);
  const { showSuccess, showError } = useToast();

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

  const planesFiltrados = planes.filter(p => 
    p.activo_tag.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.tarea.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Calcular cumplimiento mensual
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  let ejecutados = 0;
  let pendientes = 0;

  planes.forEach(p => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted">Cargando planes...</div>
        ) : planesFiltrados.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted bg-input rounded-xl border border-dashed border-color">
            <Calendar className="mx-auto mb-3 opacity-50" size={32} />
            No hay planes registrados o que coincidan con la búsqueda.
          </div>
        ) : (
          planesFiltrados.map((plan) => (
            <div key={plan.id} className="card relative group">
              <div className="card-header pb-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-white" style={{ lineHeight: '1.2' }}>{plan.activo_tag}</h3>
                  <div className="flex items-center gap-2">
                    {getSemaforoIcon(plan.estado)}
                    <span className={`badge ${getBadgeClass(plan.estado)}`}>
                      {plan.estado}
                    </span>
                  </div>
                </div>
                <div className="text-secondary font-medium mt-1">
                  {plan.tarea}
                </div>
              </div>

              <div className="card-body pt-0 space-y-3 text-sm text-muted">
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-input p-2 rounded">
                    <span className="block text-xs opacity-70">Frecuencia</span>
                    <span className="text-white font-medium">{plan.frecuencia_dias} días</span>
                  </div>
                  <div className="bg-input p-2 rounded">
                    <span className="block text-xs opacity-70">Última Ejecución</span>
                    <span className="text-white font-medium">{plan.ultima_ejecucion || 'Nunca'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded border border-color mt-2">
                  <span className="text-xs">Técnico Asignado:</span>
                  <span className="text-white font-medium">{plan.tecnico_asignado || 'Por Asignar'}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded border border-color mt-2">
                  <span className="text-xs">Próxima Fecha:</span>
                  <span className={`font-bold ${plan.estado === 'Vencido' ? 'text-red-400' : 'text-white'}`}>
                    {plan.proxima_fecha}
                  </span>
                </div>

                {plan.checklist && plan.checklist.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-semibold mb-1 block">Checklist ({plan.checklist.length} items):</span>
                    <ul className="list-disc pl-4 text-xs opacity-80 space-y-1">
                      {plan.checklist.slice(0, 3).map((item, i) => (
                        <li key={i} className="truncate">{item}</li>
                      ))}
                      {plan.checklist.length > 3 && (
                        <li className="text-blue-400 italic">+{plan.checklist.length - 3} más...</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="pt-4 flex gap-2 border-t border-color mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="btn btn-primary flex-1 flex justify-center py-1 bg-green-600 hover:bg-green-500 text-white"
                    onClick={() => handleEjecutar(plan.id, plan.activo_tag)}
                  >
                    <Play size={16} className="mr-1" /> Ejecutar PM
                  </button>
                  <button
                    className="btn btn-ghost text-blue-400 hover:bg-blue-500/10 px-3"
                    onClick={() => {
                      setPlanToEdit(plan);
                      setShowModal(true);
                    }}
                    title="Editar plan"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button
                    className="btn btn-ghost text-red-500 hover:bg-red-500/10 px-3"
                    onClick={() => handleDelete(plan.id)}
                    title="Eliminar plan"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
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
