// src/Services/ReporteExamenesConsecutivosService.js
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

export const institucional = async (token, anio) => {
  const res = await fetch(`${API_URL}/reportes/examenes-consecutivos/institucional/${anio}`,
    { headers: auth(token) });
  return parseOrThrow(res);
};

export const porMateria = async (token, materiaId, anio) => {
  const res = await fetch(`${API_URL}/reportes/examenes-consecutivos/materia/${materiaId}/${anio}`,
    { headers: auth(token) });
  return parseOrThrow(res);
};

export const porCurso = async (token, cursoId, anio) => {
  const res = await fetch(`${API_URL}/reportes/examenes-consecutivos/curso/${cursoId}/${anio}`,
    { headers: auth(token) });
  return parseOrThrow(res);
};

export const resumen = async (token, anio) => {
  const res = await fetch(`${API_URL}/reportes/examenes-consecutivos/resumen/${anio}`,
    { headers: auth(token) });
  return parseOrThrow(res);
};

export default { institucional, porMateria, porCurso, resumen };
