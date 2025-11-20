import { httpClient } from './httpClient'

const BASE = '/reporte/inasistencias';

export const obtenerInasistenciasPorCurso = async (token, cursoId, anio) => {
  void token;
  const data = await httpClient.get(`${BASE}/curso/${cursoId}?anio=${anio}`);
  return data;
};

export const obtenerInasistenciasPorAlumno = async (token, alumnoId, anio) => {
  void token;
  const data = await httpClient.get(`${BASE}/alumno/${alumnoId}?anio=${anio}`);
  return data;
};
