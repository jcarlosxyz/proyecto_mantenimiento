import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Tool, 
  User, 
  FileText,
  AlertCircle,
  Package,
  CheckCircle,
  Save
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
  
  // Estado para el cierre
  const [closingData, setClosingData] = useState({
    estado: '',
    trabajo_realizado: '',
    causa_raiz: '',
    tiempo_reparacion_horas: 0,
    firma_cierre: ''
  });

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select('*')
        .eq('id', ordenId)
        .single();
      
      if (error) throw error;
      setOrden(data);
      setClosingData({
        estado: data.estado,
        trabajo_realizado: data.trabajo_realizado || '',
        causa_raiz: data.causa_raiz || '',
        tiempo_reparacion_horas: data.tiempo_reparacion_horas || 0,
        firma_cierre: data.firma_cierre || ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [ordenId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:3000/api/ordenes/${ordenId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closingData)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.errores?.join(', ') || result.error);
      
      onUpdated();
      fetchDetail();
    } catch (err: any) {
      alert(err.message);
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

          {/* Gestión de Materiales (Simplificado) */}
          <div className="card">
            <div className="card-header">
              <h4 className="flex items-center gap-2"><Package size={18} className="text-purple-500" /> Materiales y Refacciones</h4>
            </div>
            <div className="card-body">
               <div className="bg-input rounded-md p-8 text-center border border-dashed border-color">
                  <p className="text-muted text-sm italic">Módulo de materiales en desarrollo para sincronización de almacén.</p>
               </div>
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
                    onChange={(e) => setClosingData({...closingData, estado: e.target.value})}
                  >
                    <option value="Abierta">Abierta</option>
                    <option value="En proceso">En proceso</option>
                    <option value="En espera">En espera</option>
                    <option value="Cerrada">Cerrada</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tiempo de Reparación (Horas)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="form-input" 
                    value={closingData.tiempo_reparacion_horas}
                    onChange={(e) => setClosingData({...closingData, tiempo_reparacion_horas: parseFloat(e.target.value)})}
                  />
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
