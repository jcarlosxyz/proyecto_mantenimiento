import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  DollarSign, 
  Layers,
  AlertCircle
} from 'lucide-react';
import MaterialForm from './MaterialForm';

interface Material {
  id: string;
  nombre: string;
  unidad: string;
  costo_unitario: number;
  stock: number;
  created_at: string;
}

const MaterialesPage: React.FC = () => {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const fetchMateriales = async () => {
    try {
      setLoading(true);
      let query = supabase.from('materiales').select('*').order('nombre');
      
      if (busqueda) {
        query = query.ilike('nombre', `%${busqueda}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMateriales(data || []);
    } catch (err: any) {
      console.error('Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMateriales();
  }, [busqueda]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este material del catálogo?')) return;
    
    const { error } = await supabase.from('materiales').delete().eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      fetchMateriales();
    }
  };

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setSelectedMaterial(null);
    setShowModal(true);
  };

  return (
    <div className="page-content">
      <div className="detail-header">
        <div>
          <h2 className="detail-title">Catálogo de Materiales</h2>
          <p className="topbar-subtitle">Gestión de inventario y costos de refacciones</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddNew}>
          <Plus size={18} /> Nuevo Material
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar por nombre de material..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Unidad</th>
                <th>Costo Unitario</th>
                <th>Stock Disponible</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Cargando catálogo...</td></tr>
              ) : materiales.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted">No se encontraron materiales.</td></tr>
              ) : (
                materiales.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-blue-500" />
                        <span className="font-semibold">{m.nombre}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-secondary">{m.unidad}</span></td>
                    <td>
                      <div className="flex items-center gap-1 text-emerald-500 font-medium">
                        <DollarSign size={14} />
                        {m.costo_unitario.toFixed(2)}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Layers size={14} className="text-muted" />
                        <span className={m.stock < 5 ? 'text-red-500 font-bold' : ''}>
                          {m.stock}
                        </span>
                        {m.stock < 5 && <AlertCircle size={14} className="text-red-500" title="Stock bajo" />}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleEdit(m)}>
                          <Edit size={16} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon text-red-500" onClick={() => handleDelete(m.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <MaterialForm 
          material={selectedMaterial} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            fetchMateriales();
          }} 
        />
      )}
    </div>
  );
};

export default MaterialesPage;
