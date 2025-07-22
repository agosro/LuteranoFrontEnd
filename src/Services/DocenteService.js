const API_URL = 'http://localhost:8080'; // Cambialo si usás otro host/puerto

// Obtener lista de docentes
export const listarDocentes = async () => {
  try {
    const response = await fetch(`${API_URL}/docentes`);
    if (!response.ok) throw new Error('Error al obtener docentes');
    return await response.json();
  } catch (error) {
    console.error('Error al listar docentes:', error);
    throw error;
  }
};

// Crear un nuevo docente
export const crearDocente = async (docente) => {
  try {
    const response = await fetch(`${API_URL}/docentes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(docente),
    });
    if (!response.ok) throw new Error('Error al crear docente');
    return await response.json();
  } catch (error) {
    console.error('Error al crear docente:', error);
    throw error;
  }
};

// Editar docente existente
export const editarDocente = async (id, docente) => {
  try {
    const response = await fetch(`${API_URL}/docentes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(docente),
    });
    if (!response.ok) throw new Error('Error al actualizar docente');
    return await response.json();
  } catch (error) {
    console.error('Error al editar docente:', error);
    throw error;
  }
};

export const actualizarDocente = async (id, docente) => {
  const res = await fetch(`${API_URL}/docentes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(docente),
  });
  return res.json();
};

// Eliminar docente por ID
export const eliminarDocente = async (id) => {
  try {
    const response = await fetch(`${API_URL}/docentes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error al eliminar docente');
    return true;
  } catch (error) {
    console.error('Error al eliminar docente:', error);
    throw error;
  }
};
