import React, { useState, useEffect } from 'react';
import { crearOrden } from '../api/ordenes';
import { listarActivos } from '../api/activos';
import { X, Save, AlertTriangle } from 'lucide-react';

interface OrdenFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const OrdenForm: React.FC<OrdenFormProps> = ({ onClose, onSuccess }) => {
  const [activos, setActivos] = useState<{tag: string, nombre: string}[]>([]);
  const [formData, setFormData] = useState({
    activo_tag: '',
    tipo_mantenimiento: 'Preventivo',
    prioridad: 'P3 Normal',
    descripcion_problema: '',
    tecnico_asignado: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadActivos = async () => {
      try {
        const res = await listarActivos();
        if (res.data) setActivos(res.data);
      } catch (err) {
        console.error('Error al cargar activos:', err);
      }
    };
    loadActivos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await crearOrden(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="modal-title">Nueva Orden de Trabajo</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="detail-field mb-4 border-red-500 bg-red-500/10 text-red-500 flex items-center gap-2">
              <AlertTriangle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Activo Vinculado <span className="form-required">*</span></label>
              <select 
                className="form-select" 
                required
                value={formData.activo_tag}
                onChange={(e) => setFormData({...formData, activo_tag: e.target.value})}
              >
                <option value="">Seleccione un activo...</option>
                {activos.map(a => (
                  <option key={a.tag} value={a.tag}>{a.tag} - {a.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo <span className="form-required">*</span></label>
              <select 
                className="form-select"
                value={formData.tipo_mantenimiento}
                onChange={(e) => setFormData({...formData, tipo_mantenimiento: e.target.value})}
              >
                <option value="Correctivo">Correctivo</option>
                <option value="Preventivo">Preventivo</option>
                <option value="Predictivo">Predictivo</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Prioridad <span className="form-required">*</span></label>
              <select 
                className="form-select"
                value={formData.prioridad}
                onChange={(e) => setFormData({...formData, prioridad: e.target.value})}
              >
                <option value="P1 Emergencia">P1 Emergencia</option>
                <option value="P2 Urgente">P2 Urgente</option>
                <option value="P3 Normal">P3 Normal</option>
                <option value="P4 Mejora">P4 Mejora</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Técnico Asignado <span className="form-required">*</span></label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Nombre del responsable..." 
                required
                value={formData.tecnico_asignado}
                onChange={(e) => setFormData({...formData, tecnico_asignado: e.target.value})}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Descripción del Problema <span className="form-required">*</span></label>
              <textarea 
                className="form-textarea" 
                placeholder="Detalla el reporte o falla encontrada..."
                required
                value={formData.descripcion_problema}
                onChange={(e) => setFormData({...formData, descripcion_problema: e.target.value})}
              />
            </div>
          </div>

          <div className="modal-actions mt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} />
              {loading ? 'Guardando...' : 'Crear Orden de Trabajo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrdenForm;
