import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Package } from 'lucide-react';

interface Material {
  id: string;
  nombre: string;
  unidad: string;
  costo_unitario: number;
  stock: number;
}

interface MaterialFormProps {
  material?: Material | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MaterialForm: React.FC<MaterialFormProps> = ({ material, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    unidad: 'Pieza',
    costo_unitario: 0,
    stock: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (material) {
      setFormData({
        nombre: material.nombre,
        unidad: material.unidad,
        costo_unitario: material.costo_unitario,
        stock: material.stock
      });
    }
  }, [material]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (material) {
        // Actualizar
        const { error } = await supabase
          .from('materiales')
          .update(formData)
          .eq('id', material.id);
        if (error) throw error;
      } else {
        // Crear
        const { error } = await supabase
          .from('materiales')
          .insert(formData);
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="flex justify-between items-center mb-6">
          <h3 className="modal-title">
            {material ? 'Editar Material' : 'Nuevo Material'}
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del Material</label>
            <div className="relative">
               <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Filtro de Aceite"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Unidad de Medida</label>
              <select 
                className="form-select"
                value={formData.unidad}
                onChange={(e) => setFormData({...formData, unidad: e.target.value})}
              >
                <option value="Pieza">Pieza</option>
                <option value="Litro">Litro</option>
                <option value="Kg">Kg</option>
                <option value="Metro">Metro</option>
                <option value="Bote">Bote</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Costo Unitario ($)</label>
              <input 
                type="number" 
                step="0.01"
                className="form-input" 
                required
                value={formData.costo_unitario}
                onChange={(e) => setFormData({...formData, costo_unitario: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Stock Inicial / Actual</label>
            <input 
              type="number" 
              className="form-input" 
              required
              value={formData.stock}
              onChange={(e) => setFormData({...formData, stock: parseFloat(e.target.value)})}
            />
          </div>

          <div className="modal-actions mt-8">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} />
              {loading ? 'Guardando...' : 'Guardar Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialForm;
