import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { crearTecnico, actualizarTecnico, Tecnico } from '../api/tecnicos';

interface TecnicoFormProps {
  tecnicoId?: string;
  tecnico?: Tecnico;
  onClose: () => void;
  onSuccess: () => void;
}

const TecnicoForm: React.FC<TecnicoFormProps> = ({ tecnicoId, tecnico, onClose, onSuccess }) => {
  const isEditing = !!tecnicoId;
  const [formData, setFormData] = useState<Partial<Tecnico>>({
    nombre: '',
    especialidad: 'General',
    telefono: '',
    email: '',
    estado: 'Activo'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tecnico) {
      setFormData({
        nombre: tecnico.nombre,
        especialidad: tecnico.especialidad,
        telefono: tecnico.telefono || '',
        email: tecnico.email || '',
        estado: tecnico.estado
      });
    }
  }, [tecnico]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        await actualizarTecnico(tecnicoId!, formData);
      } else {
        await crearTecnico(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="modal-title">{isEditing ? 'Editar Técnico' : 'Nuevo Técnico'}</h3>
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
              <label className="form-label">Nombre Completo <span className="form-required">*</span></label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Nombre del técnico..." 
                required
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Especialidad <span className="form-required">*</span></label>
              <select 
                className="form-select"
                value={formData.especialidad}
                onChange={(e) => setFormData({...formData, especialidad: e.target.value})}
              >
                <option value="General">General</option>
                <option value="Mecánico">Mecánico</option>
                <option value="Eléctrico">Eléctrico</option>
                <option value="Electromecánico">Electromecánico</option>
                <option value="Instrumentista">Instrumentista</option>
                <option value="Sistemas">Sistemas</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Número de contacto..."
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="Correo electrónico..."
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {isEditing && (
              <div className="form-group full-width">
                <label className="form-label">Estado</label>
                <select 
                  className="form-select"
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Ocupado">Ocupado</option>
                </select>
              </div>
            )}
          </div>

          <div className="modal-actions mt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} />
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar Técnico' : 'Guardar Técnico')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TecnicoForm;
