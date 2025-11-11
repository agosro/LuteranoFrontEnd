// src/Services/ReporteDesempenoDocenteService.js
import { httpClient } from './httpClient'

// httpClient maneja errores y token

export const reporteCompleto = async (token, anio) => {
  void token
  const data = await httpClient.get(`/reportes/desempeno-docente/${anio}`)
  if (typeof data?.code === 'number' && data.code < 0) throw new Error(data?.mensaje || 'Error al generar el reporte')
  return data
};

export const reportePorMateria = async (token, anio, materiaId) => {
  void token
  const data = await httpClient.get(`/reportes/desempeno-docente/${anio}/materia/${materiaId}`)
  if (typeof data?.code === 'number' && data.code < 0) throw new Error(data?.mensaje || 'Error al generar el reporte por materia')
  return data
};

export const reportePorDocente = async (token, anio, docenteId) => {
  void token
  const data = await httpClient.get(`/reportes/desempeno-docente/${anio}/docente/${docenteId}`)
  if (typeof data?.code === 'number' && data.code < 0) throw new Error(data?.mensaje || 'Error al generar el reporte por docente')
  return data
};

export default { reporteCompleto, reportePorMateria, reportePorDocente };
