import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Camera, User } from 'lucide-react';
import { crearTecnico, actualizarTecnico, subirFotoTecnico, Tecnico } from '../api/tecnicos';

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
    estado: 'Activo',
    foto_url: '',
    turno: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (tecnico) {
      setFormData({
        nombre: tecnico.nombre,
        especialidad: tecnico.especialidad,
        telefono: tecnico.telefono || '',
        email: tecnico.email || '',
        estado: tecnico.estado,
        foto_url: tecnico.foto_url || '',
        turno: tecnico.turno || ''
      });
    }
  }, [tecnico]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFotoFile(file);
      // Preview local inmediato
      const reader = new FileReader();
      reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let currentFotoUrl = formData.foto_url || '';

      // Si hay un archivo nuevo, subirlo primero
      if (fotoFile) {
        const uploadRes = await subirFotoTecnico(fotoFile, tecnicoId || formData.nombre?.replace(/\s+/g, '-').toLowerCase());
        currentFotoUrl = uploadRes.data.url;
      }

      const dataToSend = { ...formData, foto_url: currentFotoUrl };

      if (isEditing) {
        await actualizarTecnico(tecnicoId!, dataToSend);
      } else {
        await crearTecnico(dataToSend);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Foto a mostrar: preview local > foto guardada > null
  const fotoMostrada = fotoPreview || formData.foto_url || null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '520px' }}>
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

          {/* ── Foto de perfil ── */}
          <div className="form-group full-width mb-4">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={15} /> Foto de Perfil
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
              {/* Avatar / preview */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--border-color)',
                flexShrink: 0,
                background: 'var(--bg-input)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {fotoMostrada ? (
                  <img
                    src={fotoMostrada}
                    alt="Foto técnico"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <User size={36} style={{ opacity: 0.3 }} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label
                  htmlFor="foto-tecnico"
                  className="btn btn-secondary"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Camera size={14} />
                  {fotoFile ? 'Cambiar foto' : fotoMostrada ? 'Reemplazar foto' : 'Subir foto'}
                </label>
                <input
                  id="foto-tecnico"
                  type="file"
                  accept="image/jpeg, image/png, image/webp, image/gif"
                  style={{ display: 'none' }}
                  onChange={handleFotoChange}
                />
                {fotoFile && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--accent-blue)' }}>
                    📎 {fotoFile.name}
                  </div>
                )}
                {!fotoFile && !fotoMostrada && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    JPG, PNG, WebP o GIF · máx. 5 MB
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Nombre Completo <span className="form-required">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Nombre del técnico..."
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Especialidad <span className="form-required">*</span></label>
              <select
                className="form-select"
                value={formData.especialidad}
                onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
              >
                <option value="General">General</option>
                <option value="Mecánico">Mecánico</option>
                <option value="Eléctrico">Eléctrico</option>
                <option value="Electromecánico">Electromecánico</option>
                <option value="Instrumentista">Instrumentista</option>
                <option value="Sistemas">Sistemas</option>
              </select>
            </div>

            {/* ── Turno ── */}
            <div className="form-group full-width">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                🗓️ Turno de Trabajo
              </label>
              <select
                className="form-select"
                value={formData.turno || ''}
                onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
              >
                <option value="">Sin turno asignado</option>
                <option value="Mañana">🌅 Mañana (6:00 – 14:00)</option>
                <option value="Tarde">🌇 Tarde (14:00 – 22:00)</option>
                <option value="Noche">🌙 Noche (22:00 – 6:00)</option>
                <option value="Rotativo">🔄 Rotativo</option>
              </select>
              {formData.turno && (
                <div style={{
                  marginTop: '8px', fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: formData.turno === 'Mañana' ? '#f59e0b'
                      : formData.turno === 'Tarde' ? '#f97316'
                      : formData.turno === 'Noche' ? '#6366f1'
                      : '#10b981'
                  }} />
                  Turno <strong style={{ color: 'var(--text-primary)' }}>{formData.turno}</strong> seleccionado
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                type="text"
                className="form-input"
                placeholder="Número de contacto..."
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="Correo electrónico..."
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {isEditing && (
              <div className="form-group full-width">
                <label className="form-label">Estado</label>
                <select
                  className="form-select"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
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
