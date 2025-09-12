const API_URL = 'http://localhost:8080'; // Cambialo si usás otro host/puerto

// Obtener lista de aulas
export const listarAulas = async (token) => {
  try {
    const response = await fetch(`${API_URL}/aula/list`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener aulas');

    return Array.isArray(data.aulaDtos) ? data.aulaDtos : [];
  } catch (error) {
    console.error('Error al listar aulas:', error);
    throw error;
  }
};

// Crear un aula
export const crearAula = async (token, aula) => {
  try {
    const response = await fetch(`${API_URL}/aula/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(aula),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al crear aula');

    return data;
  } catch (error) {
    console.error('Error al crear aula:', error);
    throw error;
  }
};

// Editar un aula
export const editarAula = async (token, aula) => {
  try {
    const response = await fetch(`${API_URL}/aula/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(aula),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al editar aula');

    return data;
  } catch (error) {
    console.error('Error al editar aula:', error);
    throw error;
  }
};

// Eliminar un aula
export const eliminarAula = async (token, id) => {
  try {
    const response = await fetch(`${API_URL}/aula/delete/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al eliminar aula');

    return data;
  } catch (error) {
    console.error('Error al eliminar aula:', error);
    throw error;
  }
};

// Obtener aula por ID
export const obtenerAulaPorId = async (token, id) => {
  try {
    const response = await fetch(`${API_URL}/aula/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener aula');

    return data;
  } catch (error) {
    console.error('Error al obtener aula por ID:', error);
    throw error;
  }
};