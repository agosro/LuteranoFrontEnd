// src/Services/MesaExamenService.js
const API_URL = 'http://localhost:8080';

const authJson = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

export const crearMesa = async (token, payload) => {
  const res = await fetch(`${API_URL}/mesas`, {
    method: 'POST',
    headers: authJson(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al crear mesa');
  return data.mesa;
};

export const actualizarMesa = async (token, payload) => {
  const res = await fetch(`${API_URL}/mesas`, {
    method: 'PUT',
    headers: authJson(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al actualizar mesa');
  return data.mesa;
};

export const eliminarMesa = async (token, id) => {
  const res = await fetch(`${API_URL}/mesas/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al eliminar mesa');
  return true;
};

export const obtenerMesa = async (token, id) => {
  const res = await fetch(`${API_URL}/mesas/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al obtener mesa');
  return data.mesa;
};

export const listarMesasPorMateriaCurso = async (token, materiaCursoId) => {
  const res = await fetch(`${API_URL}/mesas/materiaCurso/${materiaCursoId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al listar mesas');
  return Array.isArray(data.mesas) ? data.mesas : [];
};

export const listarMesasPorCurso = async (token, cursoId) => {
  const res = await fetch(`${API_URL}/mesas/curso/${cursoId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al listar mesas');
  return Array.isArray(data.mesas) ? data.mesas : [];
};

export const agregarConvocados = async (token, mesaId, alumnoIds) => {
  const res = await fetch(`${API_URL}/mesas/${mesaId}/convocados`, {
    method: 'POST',
    headers: authJson(token),
    body: JSON.stringify({ alumnoIds }),
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al agregar convocados');
  return data.mesa;
};

export const quitarConvocado = async (token, mesaId, alumnoId) => {
  const res = await fetch(`${API_URL}/mesas/${mesaId}/convocados/${alumnoId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al quitar convocado');
  return data.mesa;
};

export const cargarNotasFinales = async (token, mesaId, notasPorAlumno) => {
  const res = await fetch(`${API_URL}/mesas/${mesaId}/notasFinales`, {
    method: 'POST',
    headers: authJson(token),
    body: JSON.stringify(notasPorAlumno),
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al cargar notas');
  return data.mesa;
};

export const finalizarMesa = async (token, mesaId) => {
  const res = await fetch(`${API_URL}/mesas/${mesaId}/finalizar`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al finalizar mesa');
  return data.mesa;
};
