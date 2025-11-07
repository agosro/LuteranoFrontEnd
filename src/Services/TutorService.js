// src/Services/TutorService.js
import { httpClient } from './httpClient'

// 📌 Listar todos los tutores
export const listarTutores = async (token) => {
  try {
    void token
    const data = await httpClient.get('/api/tutor/list')
    return data.tutores || []
  } catch (error) {
    console.error("Error al listar tutores:", error);
    throw error;
  }
};

// 📌 Crear tutor
export const crearTutor = async (tutor, token) => {
  try {
    void token
    return await httpClient.post('/api/tutor/create', tutor)
  } catch (error) {
    console.error("Error al crear tutor:", error);
    throw error;
  }
};

// 📌 Actualizar tutor
export const editarTutor = async (tutor, token) => {
  try {
    void token
    return await httpClient.put('/api/tutor/update', tutor)
  } catch (error) {
    console.error("Error al actualizar tutor:", error);
    throw error;
  }
};

// 📌 Eliminar tutor por ID
export const eliminarTutor = async (id, token) => {
  try {
    void token
    return await httpClient.delete(`/api/tutor/delete/${id}`)
  } catch (error) {
    console.error("Error al eliminar tutor:", error);
    throw error;
  }
};