import React, { useState, useEffect } from 'react';
import { obtenerOrden, actualizarOrden } from '../api/ordenes';
import { listarTecnicos, Tecnico } from '../api/tecnicos';
import { compartirPorWhatsApp, DatosOT } from '../lib/whatsapp';
import MaterialesOT from './MaterialesOT';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Wrench, 
  User, 
  FileText,
  AlertCircle,
  Package,
  CheckCircle,
  Save,
  MessageCircle
} from 'lucide-react';

interface OrdenDetailProps {
  ordenId: string;
  onBack: () => void;
  onUpdated: () => void;
}

const OrdenDetail: React.FC<OrdenDetailProps> = ({ ordenId, onBack, onUpdated }) => {
  const [orden, setOrden] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  
  // Estado para el cierre
  const [closingData, setClosingData] = useState({
    estado: '',
    trabajo_realizado: '',
    causa_raiz: '',
    tiempo_reparacion_horas: 0,
    firma_cierre: '',
    fecha_cierre: '' as string   // ISO cuando se selecciona "Cerrada"
  });

  // Calcula horas entre dos fechas ISO (redondeado a 2 decimales)
  const calcularHoras = (inicio: string, fin: string): number => {
    const diff = new Date(fin).getTime() - new Date(inicio).getTime()
    return Math.max(0, Math.round((diff / 3_600_000) * 100) / 100)
  };

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await obtenerOrden(ordenId);
      
      const ordenData = data.data || data.orden || data;
      setOrden(ordenData);
      const yaFechaCierre = ordenData.fecha_cierre || '';
      const tiempoGuardado = ordenData.tiempo_reparacion_horas || 0;
      setClosingData({
        estado: ordenData.estado,
        trabajo_realizado: ordenData.trabajo_realizado || '',
        causa_raiz: ordenData.causa_raiz || '',
        tiempo_reparacion_horas: tiempoGuardado,
        firma_cierre: ordenData.firma_cierre || '',
        fecha_cierre: yaFechaCierre
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // Cargar técnicos para obtener el teléfono al compartir
    listarTecnicos().then(res => {
      if (res.data) setTecnicos(res.data);
    }).catch(() => {});
  }, [ordenId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    try {
      await actualizarOrden(ordenId, closingData);
      onUpdated();
      fetchDetail();
    } catch (err: any) {
      setSaveError(err.message);
    }
  };

  if (loading) return <div className="page-content">Cargando detalles...</div>;
  if (!orden) return <div className="page-content">No se encontró la orden.</div>;

  return (
    <div className="page-content">
      <button onClick={onBack} className="btn btn-ghost mb-6 gap-2">
        <ArrowLeft size={18} /> Volver al listado
      </button>

      <div className="detail-header">
        <div>
          <span className="detail-tag">{orden.numero_ot}</span>
          <h2 className="detail-title">{orden.activo_tag}</h2>
          <div className="detail-meta">
            <span className={`badge ${orden.prioridad === 'P1 Emergencia' ? 'badge-crit-a' : 'badge-area'}`}>
              {orden.prioridad}
            </span>
            <span className="badge badge-secondary">{orden.tipo_mantenimiento}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <div className={`badge ${orden.estado === 'Cerrada' ? 'badge-area' : 'badge-mantenimiento'} py-2 px-4 text-sm`}>
            Estado: {orden.estado}
          </div>
          {/* Botón WhatsApp */}
          <button
            className="btn btn-sm flex items-center gap-2"
            style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            onClick={() => {
              const tecnico = tecnicos.find(t => t.nombre === orden.tecnico_asignado);
              const datosOT: DatosOT = {
                numero_ot:            orden.numero_ot,
                activo_tag:           orden.activo_tag,
                tipo_mantenimiento:   orden.tipo_mantenimiento,
                prioridad:            orden.prioridad,
                estado:               orden.estado,
                tecnico_asignado:     orden.tecnico_asignado,
                descripcion_problema: orden.descripcion_problema,
                fecha_limite_inicio:  orden.fecha_limite_inicio,
                trabajo_realizado:    orden.trabajo_realizado,
                causa_raiz:           orden.causa_raiz,
                tiempo_reparacion_horas: orden.tiempo_reparacion_horas,
                firma_cierre:         orden.firma_cierre,
              };
              compartirPorWhatsApp(datosOT, tecnico?.telefono);
            }}
            title="Compartir esta OT por WhatsApp"
          >
            <MessageCircle size={15} />
            WhatsApp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Info General */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h4 className="flex items-center gap-2"><FileText size={18} className="text-blue-500" /> Información de la Falla</h4>
            </div>
            <div className="card-body">
              <p className="text-secondary leading-relaxed bg-input p-4 rounded-md border border-color">
                {orden.descripcion_problema}
              </p>
              
              <div className="detail-grid mt-6">
                <div className="detail-field">
                  <div className="detail-field-label">Técnico Responsable</div>
                  <div className="detail-field-value flex items-center gap-2"><User size={14} /> {orden.tecnico_asignado}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Fecha Apertura</div>
                  <div className="detail-field-value">{new Date(orden.created_at).toLocaleString()}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Límite de Inicio</div>
                  <div className="detail-field-value flex items-center gap-2 text-amber-500">
                    <Clock size={14} /> {new Date(orden.fecha_limite_inicio).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gestión de Materiales */}
          <div className="card">
            <div className="card-header">
              <h4 className="flex items-center gap-2"><Package size={18} className="text-purple-500" /> Materiales y Refacciones</h4>
            </div>
            <div className="card-body">
              <MaterialesOT
                ordenId={ordenId}
                ordenCerrada={orden.estado === 'Cerrada'}
              />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Formulario de Cierre */}
        <div className="space-y-6">
          <div className="card border-blue-500/30">
            <div className="card-header">
              <h4 className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" /> Actualizar Proceso</h4>
            </div>
            <div className="card-body">
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Cambiar Estado</label>
                  <select 
                    className="form-select"
                    value={closingData.estado}
                    onChange={(e) => {
                      const nuevoEstado = e.target.value;
                      if (nuevoEstado === 'Cerrada') {
                        // Calcular automáticamente al cambiar a Cerrada
                        const ahora = new Date().toISOString();
                        const horas = calcularHoras(orden.created_at, ahora);
                        setClosingData(prev => ({
                          ...prev,
                          estado: nuevoEstado,
                          fecha_cierre: ahora,
                          tiempo_reparacion_horas: horas
                        }));
                      } else {
                        setClosingData(prev => ({ ...prev, estado: nuevoEstado, fecha_cierre: '' }));
                      }
                    }}
                  >
                    <option value="Abierta">Abierta</option>
                    <option value="En proceso">En proceso</option>
                    <option value="En espera">En espera</option>
                    <option value="Cerrada">Cerrada</option>
                  </select>
                </div>

                {/* Tiempo de Reparación — auto-calculado al cerrar */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Tiempo de Reparación (Horas)</span>
                    {closingData.estado === 'Cerrada' && (
                      <span style={{
                        fontSize: '10px',
                        background: 'var(--accent-emerald-glow)',
                        color: 'var(--accent-emerald)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontWeight: 700,
                        letterSpacing: '0.5px'
                      }}>
                        ⏱ CALCULADO
                      </span>
                    )}
                  </label>

                  {/* Campo: de solo lectura siempre para evitar manipulación manual */}
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    readOnly={true}
                    style={{
                      background: 'var(--bg-input)',
                      color: closingData.estado === 'Cerrada' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                      fontWeight: closingData.estado === 'Cerrada' ? 700 : 400,
                      fontSize: closingData.estado === 'Cerrada' ? '18px' : '14px',
                      cursor: 'not-allowed',
                      borderColor: closingData.estado === 'Cerrada' ? 'rgba(16,185,129,0.4)' : 'var(--border-color)',
                      opacity: closingData.estado === 'Cerrada' ? 1 : 0.6
                    }}
                    value={closingData.tiempo_reparacion_horas}
                  />

                  {/* Desglose de cálculo */}
                  {closingData.estado === 'Cerrada' && closingData.fecha_cierre && (
                    <div style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--accent-emerald)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      lineHeight: '1.8'
                    }}>
                      <div>
                        📅 <strong style={{ color: 'var(--text-secondary)' }}>Apertura:</strong>{' '}
                        {new Date(orden.created_at).toLocaleString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                      <div>
                        🔒 <strong style={{ color: 'var(--accent-emerald)' }}>Cierre:</strong>{' '}
                        {new Date(closingData.fecha_cierre).toLocaleString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                      <div style={{ marginTop: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '4px' }}>
                        ⏱ <strong style={{ color: 'var(--accent-emerald)', fontSize: '12px' }}>
                          {closingData.tiempo_reparacion_horas} hrs
                        </strong>
                        {' '}= (Cierre &minus; Apertura)
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Trabajo Realizado</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="Describe las acciones tomadas..."
                    value={closingData.trabajo_realizado}
                    onChange={(e) => setClosingData({...closingData, trabajo_realizado: e.target.value})}
                  />
                </div>

                {orden.tipo_mantenimiento === 'Correctivo' && (
                  <div className="form-group">
                    <label className="form-label text-amber-500">Causa Raíz Identificada</label>
                    <textarea 
                      className="form-textarea border-amber-500/30" 
                      placeholder="Identifica por qué falló el activo..."
                      value={closingData.causa_raiz}
                      onChange={(e) => setClosingData({...closingData, causa_raiz: e.target.value})}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Firma Supervisor</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Nombre de quien valida..."
                    value={closingData.firma_cierre}
                    onChange={(e) => setClosingData({...closingData, firma_cierre: e.target.value})}
                  />
                </div>

                {/* Error de guardado */}
                {saveError && (
                  <div style={{
                    background: 'var(--accent-red-glow)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: 'var(--accent-red)',
                    lineHeight: '1.6'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>⚠️ No se pudo guardar:</strong>
                    {saveError.split(' | ').map((msg, i) => (
                      <div key={i}>• {msg}</div>
                    ))}
                  </div>
                )}

                <button type="submit" className="btn btn-primary w-full mt-4">
                  <Save size={18} /> Guardar Cambios
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdenDetail;
