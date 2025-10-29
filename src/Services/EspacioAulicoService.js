const API_URL = 'http://localhost:8080';

// Lista todos los espacios áulicos
export const listarEspaciosAulicos = async (token) => {
  const res = await fetch(`${API_URL}/espacio-aulico/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.mensaje || 'Error al obtener espacios áulicos';
    throw new Error(msg);
  }

  // La respuesta esperada contiene { espacioAulicoDtos: [...] }
  return Array.isArray(data.espacioAulicoDtos) ? data.espacioAulicoDtos : [];
};

// Crear un espacio áulico
export const crearEspacioAulico = async (token, espacio) => {
  const res = await fetch(`${API_URL}/espacio-aulico/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(espacio),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code < 0) {
    throw new Error(data.mensaje || 'Error al crear espacio áulico');
  }
  return data; // se espera { espacioAulicoDto, code, mensaje } o similar
};

// Editar un espacio áulico
export const editarEspacioAulico = async (token, espacio) => {
  const res = await fetch(`${API_URL}/espacio-aulico/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(espacio),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code < 0) {
    throw new Error(data.mensaje || 'Error al editar espacio áulico');
  }
  return data;
};

// Eliminar un espacio áulico
export const eliminarEspacioAulico = async (token, id) => {
  const res = await fetch(`${API_URL}/espacio-aulico/delete/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code < 0) {
    throw new Error(data.mensaje || 'Error al eliminar espacio áulico');
  }
  return data;
};
