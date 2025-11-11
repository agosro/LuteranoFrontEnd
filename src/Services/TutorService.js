// src/Services/TutorService.js
import { httpClient } from './httpClient'

// Cache simple en memoria para evitar pedir toda la lista repetidamente
let _cacheTutores = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minuto

// 📌 Listar todos los tutores
export const listarTutores = async (token, { force = false } = {}) => {
  try {
    void token;
    const now = Date.now();
    if (!force && _cacheTutores && (now - _cacheTimestamp) < CACHE_TTL_MS) {
      return _cacheTutores;
    }
    const data = await httpClient.get('/api/tutor/list');
    _cacheTutores = data.tutores || [];
    _cacheTimestamp = now;
    return _cacheTutores;
  } catch (error) {
    console.error('Error al listar tutores:', error);
    throw error;
  }
};

// 🆕 Búsqueda client-side (placeholder hasta que exista endpoint backend)
export const buscarTutores = async (query, token) => {
  try {
    void token;
    if (!query || query.trim().length < 2) return [];
    const lista = await listarTutores(token);
    const q = query.trim().toLowerCase();
    return lista.filter(t =>
      (t.nombre && t.nombre.toLowerCase().includes(q)) ||
      (t.apellido && t.apellido.toLowerCase().includes(q)) ||
      (t.dni && t.dni.toLowerCase().includes(q))
    ).slice(0, 20); // limitar resultados visibles
  } catch (error) {
    console.error('Error en buscarTutores:', error);
    return [];
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