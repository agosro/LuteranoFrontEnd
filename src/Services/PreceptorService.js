import { httpClient } from './httpClient'

// 📌 Listar todos los preceptores
export const listarPreceptores = async (token) => {
  try {
    void token
    const data = await httpClient.get('/api/preceptor/list')
    return Array.isArray(data.preceptores) ? data.preceptores : []
  } catch (error) {
    console.error("Error al listar preceptores:", error);
    throw error;
  }
};

// 📌 Crear preceptor
export const crearPreceptor = async (preceptor, token) => {
  try {
    void token
    const data = await httpClient.post('/api/preceptor/create', preceptor)
    return data
  } catch (error) {
    console.error("Error al crear preceptor:", error);
    throw error;
  }
};

// 📌 Actualizar preceptor
export const editarPreceptor = async (token, preceptor) => {
  try {
    void token
    const data = await httpClient.put('/api/preceptor/update', preceptor)
    return data
  } catch (error) {
    console.error("Error al actualizar preceptor:", error);
    throw error;
  }
};

// 📌 Eliminar preceptor por ID
export const eliminarPreceptor = async (id, token) => {
  try {
    void token
    const data = await httpClient.delete(`/api/preceptor/delete/${id}`)
    return data
  } catch (error) {
    console.error("Error al eliminar preceptor:", error);
    throw error;
  }
};

export const obtenerPreceptorPorUserId = async (token, userId) => {
  try {
    const data = await httpClient.get(`/api/preceptor/usuario/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    return data.preceptor || null
  } catch (error) {
    console.error("Error en obtenerPreceptorPorUserId:", error);
    throw error;
  }
};