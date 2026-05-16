const API_URL = '/api/tecnicos';

export interface Tecnico {
  id: string;
  nombre: string;
  especialidad: string;
  telefono?: string;
  email?: string;
  estado: string;
  foto_url?: string;
  turno?: string;
  password?: string;
  created_at: string;
}

export interface UploadFotoResponse {
  success: boolean;
  mensaje: string;
  data: {
    path: string;
    url: string;
    nombre_original: string;
    tamaño: number;
  };
}

export async function listarTecnicos(estado?: string, especialidad?: string) {
  const query = new URLSearchParams();
  if (estado) query.append('estado', estado);
  if (especialidad) query.append('especialidad', especialidad);

  const res = await fetch(`${API_URL}?${query.toString()}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al listar técnicos');
  }
  return res.json();
}

export async function crearTecnico(data: Partial<Tecnico>) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errorData = await res.json();
    const mensaje = errorData.detalle ? `${errorData.error}: ${errorData.detalle}` : errorData.error;
    throw new Error(mensaje || 'Error al crear técnico');
  }
  return res.json();
}

export async function actualizarTecnico(id: string, data: Partial<Tecnico>) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al actualizar técnico');
  }
  return res.json();
}

export async function eliminarTecnico(id: string) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al eliminar técnico');
  }
  return res.json();
}

// Subir foto de perfil de técnico (reutiliza el mismo endpoint de upload)
export async function subirFotoTecnico(file: File, tecnicoId?: string): Promise<UploadFotoResponse> {
  const formData = new FormData();
  formData.append('imagen', file);
  if (tecnicoId) formData.append('activo_id', `tecnicos/${tecnicoId}`);
  else formData.append('activo_id', 'tecnicos/temp');

  const res = await fetch('/api/upload/imagen', {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al subir la foto');
  return data;
}
