import React, { useState, useEffect } from 'react';
import { planesAPI } from '../api/planes';
import { listarActivos, Activo } from '../api/activos';
import { listarTecnicos, Tecnico } from '../api/tecnicos';
import { X, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from './Toast';

interface PlanFormProps {
  onClose: () => void;
  onSuccess: () => void;
  planToEdit?: any;
}

const FRECUENCIAS = [
  { label: 'Diario (1)', dias: 1 },
  { label: 'Semanal (7)', dias: 7 },
  { label: 'Mensual (30)', dias: 30 },
  { label: 'Trimestral (90)', dias: 90 },
  { label: 'Anual (365)', dias: 365 },
];

const PlanForm: React.FC<PlanFormProps> = ({ onClose, onSuccess, planToEdit }) => {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loadingDatos, setLoadingDatos] = useState(true);
  
  const [activoTag, setActivoTag] = useState(planToEdit?.activo_tag || '');
  const [tarea, setTarea] = useState(planToEdit?.tarea || '');
  const [frecuencia, setFrecuencia] = useState<number | ''>(planToEdit?.frecuencia_dias || '');
  const [tecnicoAsignado, setTecnicoAsignado] = useState(planToEdit?.tecnico_asignado || '');
  
  const [checklist, setChecklist] = useState<string[]>(planToEdit?.checklist || []);
  const [nuevoItem, setNuevoItem] = useState('');

  const [saving, setSaving] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resActivos, resTecnicos] = await Promise.all([
          listarActivos({ limite: 1000 }),
          listarTecnicos()
        ]);
        setActivos(resActivos.data || []);
        // API tecnicos returns { success: true, data: [...] } ? Let's verify: yes, resTecnicos.data
        setTecnicos(resTecnicos.data || []);
      } catch (err) {
        showError('Error al cargar datos necesarios');
      } finally {
        setLoadingDatos(false);
      }
    };
    fetchData();
  }, [showError]);

  const handleAddItem = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (nuevoItem.trim()) {
      setChecklist([...checklist, nuevoItem.trim()]);
      setNuevoItem('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const getInitials = (nombre: string) =>
    nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  const activoSeleccionado = activos.find(a => a.tag === activoTag);
  const tecnicoSeleccionado = tecnicos.find(t => t.nombre === tecnicoAsignado);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activoTag || !tarea || !frecuencia) {
      showError('Por favor, completa los campos obligatorios');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        activo_tag: activoTag,
        tarea,
        frecuencia_dias: Number(frecuencia),
        tecnico_asignado: tecnicoAsignado || null,
        checklist
      };

      if (planToEdit) {
        await planesAPI.update(planToEdit.id, payload);
      } else {
        await planesAPI.create(payload);
      }
      onSuccess();
    } catch (err: any) {
      showError(err.message || 'Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '850px', width: '95vw' }}>
        <div className="modal-header">
          <h3 className="modal-title">{planToEdit ? 'Editar Plan de Mantenimiento' : 'Nuevo Plan de Mantenimiento Preventivo'}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="space-y-4">
            
            <div className="grid grid-cols-2 gap-6">
              {/* Columna Izquierda: Activo */}
              <div className="flex flex-col gap-4">
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '24px', marginBottom: 0 }}>
                  <div className="shrink-0">
                    {activoSeleccionado ? (
                      activoSeleccionado.imagen_url ? (
                        <img 
                          src={activoSeleccionado.imagen_url} 
                          alt={activoSeleccionado.tag} 
                          style={{
                            width: '104px', height: '104px',
                            borderRadius: '16px', objectFit: 'cover',
                            border: '3px solid var(--accent-emerald)',
                            boxShadow: '0 0 0 6px rgba(16, 185, 129, 0.15)'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '104px', height: '104px', borderRadius: '16px',
                          background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-blue))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '44px', color: '#fff',
                          boxShadow: '0 0 0 6px rgba(16, 185, 129, 0.15)'
                        }}>
                          ⚙️
                        </div>
                      )
                    ) : (
                      <div style={{
                        width: '104px', height: '104px', borderRadius: '16px',
                        background: 'var(--bg-input)', border: '1px dashed var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7
                      }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>Sin<br/>activo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-[6px]">
                    <label className="form-label mb-0">Activo Vinculado <span className="text-red-500">*</span></label>
                    <select 
                      className="form-input w-full" 
                      value={activoTag}
                      onChange={(e) => setActivoTag(e.target.value)}
                      required
                      disabled={loadingDatos}
                    >
                      <option value="">{loadingDatos ? 'Cargando activos...' : 'Seleccione un activo...'}</option>
                      {activos.map(a => (
                        <option key={a.id} value={a.tag}>{a.tag} - {a.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Técnico */}
              <div className="flex flex-col gap-4">
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '24px', marginBottom: 0 }}>
                  <div className="shrink-0">
                    {tecnicoSeleccionado ? (
                      tecnicoSeleccionado.foto_url ? (
                        <img 
                          src={tecnicoSeleccionado.foto_url} 
                          alt={tecnicoSeleccionado.nombre} 
                          style={{
                            width: '104px', height: '104px',
                            borderRadius: '50%', objectFit: 'cover',
                            border: '3px solid var(--accent-blue)',
                            boxShadow: '0 0 0 6px var(--accent-blue-glow)'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '104px', height: '104px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '36px', fontWeight: 800, color: '#fff',
                          boxShadow: '0 0 0 6px var(--accent-blue-glow)'
                        }}>
                          {getInitials(tecnicoSeleccionado.nombre)}
                        </div>
                      )
                    ) : (
                      <div style={{
                        width: '104px', height: '104px', borderRadius: '50%',
                        background: 'var(--bg-input)', border: '1px dashed var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7
                      }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>Sin<br/>foto</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-[6px]">
                    <label className="form-label mb-0">Técnico Asignado</label>
                    <select 
                      className="form-input w-full" 
                      value={tecnicoAsignado}
                      onChange={(e) => setTecnicoAsignado(e.target.value)}
                      disabled={loadingDatos}
                    >
                      <option value="">{loadingDatos ? 'Cargando...' : 'Seleccione técnico...'}</option>
                      {tecnicos.map(t => (
                        <option key={t.id} value={t.nombre}>{t.nombre}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted m-0">Se asignará a las OT preventivas.</p>
                  </div>
                </div>
              </div>
            </div>

          <div className="form-group">
            <label className="form-label">Descripción de la Tarea <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej: Mantenimiento preventivo general, lubricación..." 
              value={tarea}
              onChange={(e) => setTarea(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Frecuencia (días) <span className="text-red-500">*</span></label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {FRECUENCIAS.map(f => (
                <button
                  key={f.dias}
                  type="button"
                  className={`btn ${frecuencia === f.dias ? 'btn-primary' : 'btn-secondary'} px-2 py-1 text-xs`}
                  onClick={() => setFrecuencia(f.dias)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input 
              type="number" 
              className="form-input" 
              placeholder="Frecuencia en días" 
              value={frecuencia}
              onChange={(e) => setFrecuencia(Number(e.target.value) || '')}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Checklist de pasos (opcional)</label>
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                className="form-input" 
                placeholder="Añadir paso a verificar..." 
                value={nuevoItem}
                onChange={(e) => setNuevoItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem(e)}
              />
              <button 
                type="button" 
                className="btn btn-secondary px-3"
                onClick={handleAddItem}
              >
                <Plus size={18} />
              </button>
            </div>
            
            {checklist.length > 0 && (
              <ul className="bg-input rounded p-3 space-y-2 max-h-[150px] overflow-y-auto">
                {checklist.map((item, index) => (
                  <li key={index} className="flex justify-between items-center bg-[var(--bg-card)] p-2 rounded text-sm">
                    <span className="truncate flex-1">- {item}</span>
                    <button 
                      type="button"
                      className="text-red-400 hover:text-red-300 ml-2 p-1"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </div>

          <div className="modal-footer mt-6 pt-4 border-t border-color">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Plan PM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanForm;
