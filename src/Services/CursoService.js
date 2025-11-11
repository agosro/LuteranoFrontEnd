import { httpClient } from './httpClient'

// Obtener lista de cursos
export const listarCursos = async (token) => {
  try {
    void token
    const data = await httpClient.get('/curso/list')
    return Array.isArray(data.cursoDtos) ? data.cursoDtos : []
  } catch (error) {
    console.error('Error al listar cursos:', error);
    throw error;
  }
};

// Crear un curso
export const crearCurso = async (token, curso) => {
  try {
    void token
    const data = await httpClient.post('/curso/create', curso)
    return data
  } catch (error) {
    console.error('Error al crear curso:', error);
    throw error;
  }
};

// Editar curso
export const editarCurso = async (token, curso) => {
  try {
    void token
    const data = await httpClient.put('/curso/update', curso)
    return data
  } catch (error) {
    console.error('Error al editar curso:', error);
    throw error;
  }
};

// Eliminar curso
export const eliminarCurso = async (token, id) => {
  try {
    void token
    const data = await httpClient.delete(`/curso/delete/${id}`)
    return data
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    throw error;
  }
};

// Obtener curso por ID
export const obtenerCursoPorId = async (token, id) => {
  try {
    void token
    const data = await httpClient.get(`/curso/${id}`)
    return data
  } catch (error) {
    console.error('Error al obtener curso por ID:', error);
    throw error;
  }
};

// 🆕 📌 Listar cursos por docente
export const listarCursosPorDocente = async (token, docenteId) => {
  try {
    void token
    const data = await httpClient.get(`/curso/list/docente/${docenteId}`)
    return data.cursoDtos || []
  } catch (error) {
    console.error("Error al listar cursos por docente:", error);
    throw error;
  }
};

// 🆕 📌 Listar cursos por preceptor
export const listarCursosPorPreceptor = async (token, preceptorId) => {
  try {
    void token
    const data = await httpClient.get(`/curso/list/preceptor/${preceptorId}`)
    return data.cursoDtos || []
  } catch (error) {
    console.error("Error al listar cursos por preceptor:", error);
    throw error;
  }
};