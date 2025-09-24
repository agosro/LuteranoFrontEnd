const API_URL = 'http://localhost:8080'; // Cambialo si usás otro host/puerto

// Obtener lista de cursos
export const listarCursos = async (token) => {
  try {
    const response = await fetch(`${API_URL}/curso/list`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener cursos');

    return Array.isArray(data.cursoDtos) ? data.cursoDtos : [];
  } catch (error) {
    console.error('Error al listar cursos:', error);
    throw error;
  }
};

// Crear un curso
export const crearCurso = async (token, curso) => {
  try {
    const response = await fetch(`${API_URL}/curso/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(curso),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al crear curso');

    return data;
  } catch (error) {
    console.error('Error al crear curso:', error);
    throw error;
  }
};

// Editar curso
export const editarCurso = async (token, curso) => {
  try {
    const response = await fetch(`${API_URL}/curso/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(curso),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al editar curso');

    return data;
  } catch (error) {
    console.error('Error al editar curso:', error);
    throw error;
  }
};

// Eliminar curso
export const eliminarCurso = async (token, id) => {
  try {
    const response = await fetch(`${API_URL}/curso/delete/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al eliminar curso');

    return data;
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    throw error;
  }
};

// Obtener curso por ID
export const obtenerCursoPorId = async (token, id) => {
  try {
    const response = await fetch(`${API_URL}/curso/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || 'Error al obtener curso');

    return data;
  } catch (error) {
    console.error('Error al obtener curso por ID:', error);
    throw error;
  }
};

// 🆕 📌 Listar cursos por docente
export const listarCursosPorDocente = async (token, docenteId) => {
  try {
    const response = await fetch(`${API_URL}/curso/list/docente/${docenteId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Error al listar cursos por docente");
    const data = await response.json();
    return data.cursoDtos || [];
  } catch (error) {
    console.error("Error al listar cursos por docente:", error);
    throw error;
  }
};

// 🆕 📌 Listar cursos por preceptor
export const listarCursosPorPreceptor = async (token, preceptorId) => {
  try {
    const response = await fetch(`${API_URL}/curso/list/preceptor/${preceptorId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Error al listar cursos por preceptor");
    const data = await response.json();
    return data.cursoDtos || [];
  } catch (error) {
    console.error("Error al listar cursos por preceptor:", error);
    throw error;
  }
};