// src/Services/ReporteExamenesConsecutivosService.js
import { httpClient } from './httpClient'

// httpClient maneja autorización y errores

export const institucional = async (token, anio) => {
  void token
  const data = await httpClient.get(`/reportes/examenes-consecutivos/institucional/${anio}`)
  if (typeof data?.code === 'number' && data.code < 0) throw new Error(data?.mensaje || 'Error reporte institucional')
  return data
};

export const porMateria = async (token, materiaId, anio) => {
  void token
  const data = await httpClient.get(`/reportes/examenes-consecutivos/materia/${materiaId}/${anio}`)
  if (typeof data?.code === 'number' && data.code < 0) throw new Error(data?.mensaje || 'Error reporte por materia')
  return data
};

export const porCurso = async (token, cursoId, anio) => {
  void token
  const data = await httpClient.get(`/reportes/examenes-consecutivos/curso/${cursoId}/${anio}`)
  if (typeof data?.code === 'number' && data.code < 0) throw new Error(data?.mensaje || 'Error reporte por curso')
  return data
};

export const resumen = async (token, anio) => {
  void token
  const data = await httpClient.get(`/reportes/examenes-consecutivos/resumen/${anio}`)
  if (typeof data?.code === 'number' && data.code < 0) throw new Error(data?.mensaje || 'Error resumen')
  return data
};

export default { institucional, porMateria, porCurso, resumen };
