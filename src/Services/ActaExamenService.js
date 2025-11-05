// src/Services/ActaExamenService.js
const API_URL = 'http://localhost:8080';

const auth = (token) => ({ 'Authorization': `Bearer ${token}` });
const authJson = (token) => ({ 'Content-Type': 'application/json', ...auth(token) });

const parseActa = (data) => {
  // Tolerante al shape: intenta encontrar el objeto de acta
  const acta = data?.acta || data?.data || data?.resultado || data;
  return acta;
};

export const generarActa = async (token, payload) => {
  // payload esperado: { mesaId, numeroActa?, observaciones? }
  const res = await fetch(`${API_URL}/actas/generar`, {
    method: 'POST', headers: authJson(token), body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al generar acta');
  return parseActa(data);
};

export const actualizarActa = async (token, payload) => {
  // payload esperado: { id, numeroActa?, observaciones? }
  const res = await fetch(`${API_URL}/actas`, {
    method: 'PUT', headers: authJson(token), body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al actualizar acta');
  return parseActa(data);
};

export const eliminarActa = async (token, id) => {
  const res = await fetch(`${API_URL}/actas/${id}`, { method: 'DELETE', headers: auth(token) });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al eliminar acta');
  return true;
};

export const obtenerActaPorId = async (token, id) => {
  const res = await fetch(`${API_URL}/actas/${id}`, { headers: auth(token) });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al obtener acta');
  return parseActa(data);
};

export const obtenerActaPorMesa = async (token, mesaId) => {
  const res = await fetch(`${API_URL}/actas/mesa/${mesaId}`, { headers: auth(token) });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Acta no encontrada');
  return parseActa(data);
};

export const buscarActas = async (token, q) => {
  const res = await fetch(`${API_URL}/actas/buscar?q=${encodeURIComponent(q)}`, { headers: auth(token) });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error en la búsqueda');
  return Array.isArray(data.actas) ? data.actas : (Array.isArray(data.lista) ? data.lista : []);
};

export const listarActasPorTurno = async (token, turnoId) => {
  const res = await fetch(`${API_URL}/actas/turno/${turnoId}`, { headers: auth(token) });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al listar por turno');
  return Array.isArray(data.actas) ? data.actas : [];
};

export const listarActasPorCurso = async (token, cursoId) => {
  const res = await fetch(`${API_URL}/actas/curso/${cursoId}`, { headers: auth(token) });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al listar por curso');
  return Array.isArray(data.actas) ? data.actas : [];
};

export const listarActasEntreFechas = async (token, desde, hasta) => {
  const params = new URLSearchParams({ desde, hasta }).toString();
  const res = await fetch(`${API_URL}/actas/entre-fechas?${params}`, { headers: auth(token) });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al listar entre fechas');
  return Array.isArray(data.actas) ? data.actas : [];
};
