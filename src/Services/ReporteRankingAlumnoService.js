// src/Services/ReporteRankingAlumnoService.js
import { httpClient } from './httpClient'

// httpClient maneja headers y errores

export const rankingCurso = async (token, cursoId, anio, top = 3) => {
  void token
  const data = await httpClient.get(`/reportes/ranking-alumnos/curso/${cursoId}?anio=${encodeURIComponent(anio)}&top=${encodeURIComponent(top)}`, { timeoutMs: 120000 })
  if (typeof data?.code === 'number' && data.code < 0) throw new Error(data?.mensaje || 'Error al generar ranking del curso')
  return data
};

export const rankingTodosCursos = async (token, anio, top = 3) => {
  void token
  const data = await httpClient.get(`/reportes/ranking-alumnos/todos-cursos?anio=${encodeURIComponent(anio)}&top=${encodeURIComponent(top)}`, { timeoutMs: 120000 })
  if (typeof data?.code === 'number' && data.code < 0) throw new Error(data?.mensaje || 'Error al generar ranking de todos los cursos')
  return data
};

export default { rankingCurso, rankingTodosCursos };
