import { httpClient } from './httpClient'

// Obtener lista de docentes
export const listarDocentes = async (token) => {
  try {
    void token
    const data = await httpClient.get('/api/docente/list')
    return Array.isArray(data.docenteDtos) ? data.docenteDtos : []
  } catch (error) {
    console.error('Error al listar docentes:', error);
    throw error;
  }
};

// Crear un nuevo docente
export const crearDocente = async (token, docente) => {
  try {
    void token
    const data = await httpClient.post('/api/docente/create', docente)
    return data
  } catch (error) {
    console.error('Error al crear docente:', error);
    throw error;
  }
};

// Editar docente
export const editarDocente = async (token, docente) => {
  try {
    void token
    const data = await httpClient.put('/api/docente/update', docente)
    return data
  } catch (error) {
    console.error('Error al editar docente:', error);
    throw error;
  }
};

// Eliminar docente por ID
export const eliminarDocente = async (token, id) => {
  try {
    void token
    const data = await httpClient.delete(`/api/docente/delete/${id}`)
    return data
  } catch (error) {
    console.error('Error al eliminar docente:', error);
    throw error;
  }
};

export const obtenerDocentePorUserId = async (token, userId) => {
  try {
    const data = await httpClient.get(`/api/docente/usuario/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    return data.docente || null
  } catch (error) {
    console.error("Error en obtenerDocentePorUserId:", error);
    throw error;
  }
};