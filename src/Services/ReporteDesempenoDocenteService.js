// src/Services/ReporteDesempenoDocenteService.js
const API_URL = 'http://localhost:8080';

const auth = (token) => ({ 'Authorization': `Bearer ${token}` });

const parseOrThrow = async (res) => {
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  const code = data?.code;
  if (!res.ok || (typeof code === 'number' && code < 0)) {
    throw new Error(data?.mensaje || 'Error al generar el reporte');
  }
  return data ?? {};
};

export const reporteCompleto = async (token, anio) => {
  const res = await fetch(`${API_URL}/reportes/desempeno-docente/${anio}`, { headers: auth(token) });
  return parseOrThrow(res);
};

export const reportePorMateria = async (token, anio, materiaId) => {
  const res = await fetch(`${API_URL}/reportes/desempeno-docente/${anio}/materia/${materiaId}`, { headers: auth(token) });
  return parseOrThrow(res);
};

export const reportePorDocente = async (token, anio, docenteId) => {
  const res = await fetch(`${API_URL}/reportes/desempeno-docente/${anio}/docente/${docenteId}`, { headers: auth(token) });
  return parseOrThrow(res);
};

export default { reporteCompleto, reportePorMateria, reportePorDocente };
