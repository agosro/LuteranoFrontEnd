// src/Services/ReporteRankingAlumnoService.js
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

export const rankingCurso = async (token, cursoId, anio) => {
  const url = new URL(`${API_URL}/reportes/ranking-alumnos/curso/${cursoId}`);
  url.searchParams.set('anio', anio);
  const res = await fetch(url.toString(), { headers: auth(token) });
  return parseOrThrow(res);
};

export const rankingColegio = async (token, anio) => {
  const url = new URL(`${API_URL}/reportes/ranking-alumnos/colegio`);
  url.searchParams.set('anio', anio);
  const res = await fetch(url.toString(), { headers: auth(token) });
  return parseOrThrow(res);
};

export const rankingTodosCursos = async (token, anio) => {
  const url = new URL(`${API_URL}/reportes/ranking-alumnos/todos-cursos`);
  url.searchParams.set('anio', anio);
  const res = await fetch(url.toString(), { headers: auth(token) });
  return parseOrThrow(res);
};

export default { rankingCurso, rankingColegio, rankingTodosCursos };
