import { httpClient } from './httpClient'

// Obtener lista de aulas
export const listarAulas = async (token) => {
  try {
    void token
    const data = await httpClient.get('/aula/list')
    return Array.isArray(data.aulaDtos) ? data.aulaDtos : []
  } catch (error) {
    console.error('Error al listar aulas:', error);
    throw error;
  }
};

// Obtener lista de aulas libres (no asignadas a cursos)
export const listarAulasLibres = async (token) => {
  try {
    void token
    const data = await httpClient.get('/aula/list/libres')
    return Array.isArray(data.aulaDtos) ? data.aulaDtos : []
  } catch (error) {
    console.error('Error al listar aulas libres:', error);
    throw error;
  }
};

// Crear un aula
export const crearAula = async (token, aula) => {
  try {
    void token
    const data = await httpClient.post('/aula/create', aula)
    return data
  } catch (error) {
    console.error('Error al crear aula:', error);
    throw error;
  }
};

// Editar un aula
export const editarAula = async (token, aula) => {
  try {
    void token
    const data = await httpClient.put('/aula/update', aula)
    return data
  } catch (error) {
    console.error('Error al editar aula:', error);
    throw error;
  }
};

// Eliminar un aula
export const eliminarAula = async (token, id) => {
  try {
    void token
    const data = await httpClient.delete(`/aula/delete/${id}`)
    return data
  } catch (error) {
    console.error('Error al eliminar aula:', error);
    throw error;
  }
};

// Obtener aula por ID
export const obtenerAulaPorId = async (token, id) => {
  try {
    void token
    const data = await httpClient.get(`/aula/${id}`)
    return data
  } catch (error) {
    console.error('Error al obtener aula por ID:', error);
    throw error;
  }
};