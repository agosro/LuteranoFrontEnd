const API_URL = 'http://localhost:8080'; // Cambialo si usás otro host/puerto
const token = localStorage.getItem('token');

// Obtener lista de docentes
export const listarDocentes = async () => {
  try {
    const response = await fetch(`${API_URL}/docente/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Error al obtener docentes');

    const data = await response.json();

    // Asegurate de devolver solo el array
    return Array.isArray(data.docenteDtos) ? data.docenteDtos : [];
  } catch (error) {
    console.error('Error al listar docentes:', error);
    throw error;
  }
};

// Crear un nuevo docente
export const crearDocente = async (docente) => {
  try {
    const response = await fetch(`${API_URL}/docente/create`, {
      method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(docente),
    });
    if (!response.ok) throw new Error('Error al crear docente');
    console.log(response);
    return await response.json();
  } catch (error) {
    console.error('Error al crear docente:', error);
    throw error;
  }
};

// Editar docente existente
export const editarDocente = async (id, docente) => {
  try {
    const response = await fetch(`${API_URL}/docente/update`, {
      method: 'PUT',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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


// Eliminar docente por ID
export const eliminarDocente = async (id) => {
  try {
    const response = await fetch(`${API_URL}/docente/${id}`, {
      method: 'DELETE',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Error al eliminar docente');
    return true;
  } catch (error) {
    console.error('Error al eliminar docente:', error);
    throw error;
  }
};
