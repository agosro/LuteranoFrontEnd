import { httpClient } from './httpClient'

// Lista todos los espacios áulicos
export const listarEspaciosAulicos = async (token) => {
  void token
  const data = await httpClient.get('/api/espacio-aulico/list')
  return Array.isArray(data.espacioAulicoDtos) ? data.espacioAulicoDtos : []
};

// Crear un espacio áulico
export const crearEspacioAulico = async (token, espacio) => {
  void token
  const data = await httpClient.post('/api/espacio-aulico/create', espacio)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al crear espacio áulico')
  return data
};

// Editar un espacio áulico
export const editarEspacioAulico = async (token, espacio) => {
  void token
  const data = await httpClient.put('/api/espacio-aulico/update', espacio)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al editar espacio áulico')
  return data
};

// Eliminar un espacio áulico
export const eliminarEspacioAulico = async (token, id) => {
  void token
  const data = await httpClient.delete(`/api/espacio-aulico/delete/${id}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al eliminar espacio áulico')
  return data
};
