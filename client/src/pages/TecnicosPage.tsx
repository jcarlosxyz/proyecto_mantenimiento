import React, { useState, useEffect } from 'react';
import { listarTecnicos, eliminarTecnico, Tecnico } from '../api/tecnicos';
import TecnicoForm from '../components/TecnicoForm';
import { 
  Plus, 
  Search, 
  Users, 
  Trash2, 
  Edit,
  Phone,
  Mail,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '../components/Toast';

// Helper: genera iniciales del nombre (máx 2 letras)
const getInitials = (nombre: string) => {
  const parts = nombre.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const TecnicosPage: React.FC = () => {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [busqueda, setBusqueda] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | undefined>(undefined);
  const { showSuccess, showError } = useToast();

  const fetchTecnicos = async () => {
    try {
      setLoading(true);
      const res = await listarTecnicos(filtroEstado || undefined, filtroEspecialidad || undefined);
      let data = res.data || [];
      
      if (busqueda) {
        data = data.filter((t: Tecnico) => 
          t.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
          t.especialidad.toLowerCase().includes(busqueda.toLowerCase())
        );
      }
      setTecnicos(data);
    } catch (err: any) {
      console.error('Error al cargar técnicos:', err.message);
      showError('No se pudo cargar la lista de técnicos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTecnicos();
  }, [filtroEstado, filtroEspecialidad]);

  const handleEdit = (tecnico: Tecnico) => {
    setSelectedTecnico(tecnico);
    setShowModal(true);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`)) {
      try {
        await eliminarTecnico(id);
        showSuccess('Técnico eliminado correctamente');
        fetchTecnicos();
      } catch (err: any) {
        showError(err.message || 'Error al eliminar el técnico');
      }
    }
  };

  const openNewForm = () => {
    setSelectedTecnico(undefined);
    setShowModal(true);
  };

  const getBadgeClass = (estado: string) => {
    switch (estado) {
      case 'Activo': return 'badge-operativo';
      case 'Ocupado': return 'badge-mantenimiento';
      case 'Inactivo': return 'badge-crit-a';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="page-content">
      <div className="detail-header">
        <div>
          <h2 className="detail-title flex items-center gap-2">
            <Users size={24} className="text-blue-500" />
            Directorio de Técnicos
          </h2>
          <p className="topbar-subtitle">Gestión del personal de mantenimiento</p>
        </div>
        <button className="btn btn-primary" onClick={openNewForm}>
          <Plus size={18} /> Nuevo Técnico
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar por nombre o especialidad..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTecnicos()}
          />
        </div>
        
        <select 
          className="filter-select"
          value={filtroEspecialidad}
          onChange={(e) => setFiltroEspecialidad(e.target.value)}
        >
          <option value="">Todas las especialidades</option>
          <option value="General">General</option>
          <option value="Mecánico">Mecánico</option>
          <option value="Eléctrico">Eléctrico</option>
          <option value="Electromecánico">Electromecánico</option>
          <option value="Instrumentista">Instrumentista</option>
          <option value="Sistemas">Sistemas</option>
        </select>

        <select 
          className="filter-select"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
          <option value="Ocupado">Ocupado</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted">Cargando personal...</div>
        ) : tecnicos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted bg-input rounded-xl border border-dashed border-color">
            <ShieldAlert className="mx-auto mb-3 opacity-50" size={32} />
            No hay técnicos registrados con los filtros actuales.
          </div>
        ) : (
          tecnicos.map((tecnico) => (
            <div key={tecnico.id} className="card relative group">
              {/* Foto de perfil + badge de estado */}
              <div className="card-header pb-3" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Avatar */}
                <div style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '3px solid var(--accent-blue)',
                  boxShadow: '0 0 0 4px var(--accent-blue-glow)',
                  background: 'var(--bg-input)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '27px',
                  fontWeight: 800,
                  color: 'var(--accent-blue)',
                  letterSpacing: '0.5px'
                }}>
                  {tecnico.foto_url ? (
                    <img
                      src={tecnico.foto_url}
                      alt={tecnico.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    getInitials(tecnico.nombre)
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-white" style={{ lineHeight: '1.2' }}>{tecnico.nombre}</h3>
                    <span className={`badge ${getBadgeClass(tecnico.estado)}`} style={{ marginLeft: '8px', flexShrink: 0 }}>
                      {tecnico.estado}
                    </span>
                  </div>
                  <div className="text-secondary" style={{ fontSize: '13px', marginTop: '2px' }}>
                    {tecnico.especialidad}
                  </div>
                </div>
              </div>

              <div className="card-body pt-0 space-y-3">
                <div className="space-y-2 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    {tecnico.telefono || 'Sin teléfono'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    {tecnico.email || 'Sin email'}
                  </div>
                </div>

                <div className="pt-4 flex gap-2 border-t border-color mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="btn btn-secondary flex-1 flex justify-center py-1"
                    onClick={() => handleEdit(tecnico)}
                  >
                    <Edit size={16} /> Editar
                  </button>
                  <button
                    className="btn btn-ghost text-red-500 hover:bg-red-500/10 px-3"
                    onClick={() => handleDelete(tecnico.id, tecnico.nombre)}
                    title="Eliminar técnico"
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
        <TecnicoForm 
          tecnicoId={selectedTecnico?.id}
          tecnico={selectedTecnico}
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            fetchTecnicos();
            showSuccess(selectedTecnico ? 'Técnico actualizado' : 'Técnico creado correctamente');
          }} 
        />
      )}
    </div>
  );
};

export default TecnicosPage;
