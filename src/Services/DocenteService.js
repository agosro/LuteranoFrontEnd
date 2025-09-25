const API_URL = 'http://localhost:8080'; // Cambialo si usás otro host/puerto

// Obtener lista de docentes
export const listarDocentes = async (token) => {
  try {
    const response = await fetch(`${API_URL}/docente/list`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener docentes');

    return Array.isArray(data.docenteDtos) ? data.docenteDtos : [];
  } catch (error) {
    console.error('Error al listar docentes:', error);
    throw error;
  }
};

// Crear un nuevo docente
export const crearDocente = async (token, docente) => {
  try {
    const response = await fetch(`${API_URL}/docente/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(docente),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al crear docente');

    return data;
  } catch (error) {
    console.error('Error al crear docente:', error);
    throw error;
  }
};

// Editar docente
export const editarDocente = async (token, docente) => {
  try {
    const response = await fetch(`${API_URL}/docente/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(docente),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al editar docente');

    return data;
  } catch (error) {
    console.error('Error al editar docente:', error);
    throw error;
  }
};

// Eliminar docente por ID
export const eliminarDocente = async (token, id) => {
  try {
    const response = await fetch(`${API_URL}/docente/delete/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al eliminar docente');

    return data;
  } catch (error) {
    console.error('Error al eliminar docente:', error);
    throw error;
  }
};

export const obtenerDocentePorUserId = async (token, userId) => {
  try {
    const response = await fetch(`${API_URL}/docente/usuario/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Error al obtener docente por userId");

    const data = await response.json();
    return data.docente || null; // devuelve el objeto docente o null
  } catch (error) {
    console.error("Error en obtenerDocentePorUserId:", error);
    throw error;
  }
};