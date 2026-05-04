import React, { useState, useEffect } from 'react';
import { crearOrden } from '../api/ordenes';
import { listarActivos } from '../api/activos';
import { listarTecnicos, Tecnico } from '../api/tecnicos';
import { X, Save, AlertTriangle, CheckCircle, MessageCircle, Loader } from 'lucide-react';
import { compartirPorWhatsApp, enviarOTPorWhatsApp, DatosOT } from '../lib/whatsapp';

interface OrdenFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const OrdenForm: React.FC<OrdenFormProps> = ({ onClose, onSuccess }) => {
  const [activos, setActivos] = useState<{tag: string, nombre: string, estado: string, imagen_url?: string}[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [formData, setFormData] = useState({
    activo_tag: '',
    tipo_mantenimiento: 'Preventivo',
    prioridad: 'P3 Normal',
    descripcion_problema: '',
    tecnico_asignado: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetalle, setErrorDetalle] = useState('');

  // Estado del activo seleccionado
  const activoSeleccionado = activos.find(a => a.tag === formData.activo_tag);
  const estadosBloqueados = ['En mantenimiento', 'Fuera de servicio'];
  const activoBloqueado = activoSeleccionado ? estadosBloqueados.includes(activoSeleccionado.estado) : false;

  // Estado del técnico seleccionado
  const tecnicoSeleccionado = tecnicos.find(t => t.nombre === formData.tecnico_asignado);

  const getInitials = (name: string) => {
    if (!name) return '👤';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Estado de OT recién creada (para mostrar panel con botón WhatsApp)
  const [otCreada, setOtCreada] = useState<DatosOT | null>(null);
  const [tecTelefono, setTecTelefono] = useState<string>('');

  // Estado del envío WhatsApp: 'idle' | 'sending' | 'sent' | 'error'
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [whatsappError, setWhatsappError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [resActivos, resTecnicos] = await Promise.all([
          listarActivos(),
          listarTecnicos('Activo')
        ]);
        if (resActivos.data) setActivos(resActivos.data);
        if (resTecnicos.data) setTecnicos(resTecnicos.data);
      } catch (err) {
        console.error('Error al cargar datos del formulario:', err);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setErrorDetalle('');

    try {
      const res = await crearOrden(formData);
      const nuevaOT = res.data || res;

      const tecnicoElegido = tecnicos.find(t => t.nombre === formData.tecnico_asignado);
      const datosOT: DatosOT = {
        numero_ot:            nuevaOT.numero_ot || 'OT-NUEVA',
        activo_tag:           formData.activo_tag,
        tipo_mantenimiento:   formData.tipo_mantenimiento,
        prioridad:            formData.prioridad,
        estado:               'Abierta',
        tecnico_asignado:     formData.tecnico_asignado,
        descripcion_problema: formData.descripcion_problema,
        fecha_limite_inicio:  nuevaOT.fecha_limite_inicio,
      };

      setOtCreada(datosOT);
      setTecTelefono(tecnicoElegido?.telefono || '');
      onSuccess(); // Refresca la lista
    } catch (err: any) {
      // El backend puede devolver { error, detalle } en el body
      const body = err.responseBody || {};
      setError(body.error || err.message);
      setErrorDetalle(body.detalle || '');
    } finally {
      setLoading(false);
    }
  };

  // ── Enviar directamente por WhatsApp ──
  const handleEnviarWhatsApp = async () => {
    if (!otCreada) return;

    if (!tecTelefono) {
      // Sin teléfono: abrir wa.me como fallback
      compartirPorWhatsApp(otCreada);
      return;
    }

    setWhatsappStatus('sending');
    setWhatsappError('');

    const result = await enviarOTPorWhatsApp(tecTelefono, otCreada);

    if (result.success) {
      setWhatsappStatus('sent');
    } else {
      // Si falla la API, ofrecer fallback wa.me
      setWhatsappStatus('error');
      setWhatsappError(result.error || 'Error al enviar');
    }
  };

  // ── Panel de éxito: OT creada ──
  if (otCreada) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: '480px', textAlign: 'center' }}>
          {/* Icono de éxito */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircle size={36} style={{ color: '#10b981' }} />
          </div>

          <h3 className="modal-title" style={{ marginBottom: '8px' }}>¡Orden Creada!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            La OT <strong style={{ color: 'var(--text-primary)' }}>{otCreada.numero_ot}</strong> fue
            registrada y asignada a <strong style={{ color: 'var(--text-primary)' }}>{otCreada.tecnico_asignado}</strong>.
          </p>

          {/* Resumen rápido */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            textAlign: 'left',
            marginBottom: '24px',
            fontSize: '13px',
            lineHeight: '1.8'
          }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Activo:</span> <strong>{otCreada.activo_tag}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Tipo:</span> {otCreada.tipo_mantenimiento}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Prioridad:</span> {otCreada.prioridad}</div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Técnico:</span> {otCreada.tecnico_asignado}
              {tecTelefono
                ? <span style={{ color: 'var(--accent-blue)', marginLeft: '6px', fontSize: '11px' }}>📱 {tecTelefono}</span>
                : <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '11px' }}>(sin teléfono)</span>
              }
            </div>
          </div>

          {/* ── Botón WhatsApp con estados ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Estado: enviado con éxito */}
            {whatsappStatus === 'sent' && (
              <div style={{
                background: 'rgba(37, 211, 102, 0.1)',
                border: '1px solid rgba(37, 211, 102, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                color: '#25D366', fontSize: '14px', fontWeight: 600
              }}>
                <CheckCircle size={20} />
                ✅ Mensaje enviado a {otCreada.tecnico_asignado}
              </div>
            )}

            {/* Estado: error + botón fallback */}
            {whatsappStatus === 'error' && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                fontSize: '13px',
                color: 'var(--accent-red)',
                textAlign: 'left'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>⚠️ Error al enviar directo:</div>
                <div style={{ marginBottom: '10px', opacity: 0.8 }}>{whatsappError}</div>
                <button
                  className="btn btn-sm"
                  style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => compartirPorWhatsApp(otCreada, tecTelefono)}
                >
                  <MessageCircle size={14} /> Abrir WhatsApp Web como alternativa
                </button>
              </div>
            )}

            {/* Botón principal de envío (oculto si ya se envió) */}
            {whatsappStatus !== 'sent' && (
              <button
                className="btn btn-primary"
                style={{
                  background: '#25D366',
                  borderColor: '#25D366',
                  gap: '8px',
                  justifyContent: 'center',
                  opacity: whatsappStatus === 'sending' ? 0.7 : 1,
                  cursor: whatsappStatus === 'sending' ? 'not-allowed' : 'pointer'
                }}
                disabled={whatsappStatus === 'sending'}
                onClick={handleEnviarWhatsApp}
              >
                {whatsappStatus === 'sending' ? (
                  <>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Enviando a WhatsApp...
                  </>
                ) : (
                  <>
                    <MessageCircle size={18} />
                    {tecTelefono
                      ? `📲 Enviar a ${otCreada.tecnico_asignado}`
                      : '💬 Compartir OT por WhatsApp'}
                  </>
                )}
              </button>
            )}

            <button className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario normal ──
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '850px' }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="modal-title">Nueva Orden de Trabajo</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="detail-field mb-4" style={{
              borderColor: 'rgba(239,68,68,0.5)',
              background: 'rgba(239,68,68,0.08)',
              display: 'flex', flexDirection: 'column', gap: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)' }}>
                <AlertTriangle size={18} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{error}</span>
              </div>
              {errorDetalle && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '26px' }}>{errorDetalle}</span>
              )}
            </div>
          )}

          <div className="form-grid">
            {/* Cabecera con Selectores Visuales (Activo y Técnico) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 full-width mb-2">
              {/* Columna Izquierda: Activo */}
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '20px', marginBottom: 0 }}>
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

                <div className="flex-1 flex flex-col gap-[6px] min-w-0">
                  <label className="form-label mb-0">Activo Vinculado <span className="form-required">*</span></label>
                  <select
                    className="form-select w-full"
                    required
                    value={formData.activo_tag}
                    onChange={(e) => {
                      setError('');
                      setErrorDetalle('');
                      setFormData({...formData, activo_tag: e.target.value});
                    }}
                    style={activoBloqueado ? { borderColor: '#f59e0b', boxShadow: '0 0 0 2px rgba(245,158,11,0.2)' } : {}}
                  >
                    <option value="">Seleccione un activo...</option>
                    {activos.map(a => {
                      const bloqueado = estadosBloqueados.includes(a.estado);
                      return (
                        <option key={a.tag} value={a.tag} disabled={bloqueado}
                          style={bloqueado ? { color: '#6b7280' } : {}}>
                          {bloqueado ? '🔒 ' : ''}{a.tag} - {a.nombre}{bloqueado ? ` (${a.estado})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Columna Derecha: Técnico */}
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '20px', marginBottom: 0 }}>
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
                          boxShadow: '0 0 0 6px var(--accent-blue-glow)',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '104px', height: '104px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '36px', fontWeight: 800, color: '#fff',
                        boxShadow: '0 0 0 6px var(--accent-blue-glow)', flexShrink: 0
                      }}>
                        {getInitials(tecnicoSeleccionado.nombre)}
                      </div>
                    )
                  ) : (
                    <div style={{
                      width: '104px', height: '104px', borderRadius: '50%',
                      background: 'var(--bg-input)', border: '1px dashed var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7, flexShrink: 0
                    }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>Sin<br/>técnico</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-[6px] min-w-0">
                  <label className="form-label mb-0">Técnico Asignado <span className="form-required">*</span></label>
                  <select
                    className="form-select w-full"
                    required
                    value={formData.tecnico_asignado}
                    onChange={(e) => setFormData({...formData, tecnico_asignado: e.target.value})}
                  >
                    <option value="">Seleccione un técnico...</option>
                    {tecnicos.map(t => (
                      <option key={t.id} value={t.nombre}>{t.nombre} - {t.especialidad}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

              {/* Advertencia inline cuando el activo seleccionado está bloqueado */}
              {activoBloqueado && activoSeleccionado && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px 14px',
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  fontSize: '13px'
                }}>
                  <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <span style={{ fontWeight: 700, color: '#f59e0b' }}>Activo no disponible — </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      El activo <strong>{activoSeleccionado.tag}</strong> está en estado
                      <strong style={{ color: '#f59e0b' }}> {activoSeleccionado.estado}</strong>.
                      No es posible crear una OT hasta que vuelva a estar <strong>Operativo</strong>.
                    </span>
                  </div>
                </div>
              )}
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

            {/* Eliminado de aquí porque se subió a la cabecera */}

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
            <button type="submit" className="btn btn-primary" disabled={loading || activoBloqueado}
              title={activoBloqueado ? `No se puede crear OT: activo ${activoSeleccionado?.estado}` : ''}
              style={activoBloqueado ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
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
