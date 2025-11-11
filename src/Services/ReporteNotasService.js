import { httpClient } from './httpClient'
const BASE = '/reporteNotas'

// GET /reporteNotas/alumnos/{alumnoId}/notas/resumen?anio=YYYY
export async function resumenNotasAlumnoPorAnio(token, alumnoId, anio) {
  void token
  const url = `${BASE}/alumnos/${encodeURIComponent(alumnoId)}/notas/resumen?anio=${encodeURIComponent(anio)}`
  return httpClient.get(url)
}

export default {
  resumenNotasAlumnoPorAnio,
};

// GET /reporteNotas/curso/{cursoId}/notas/resumen?anio=YYYY
export async function resumenNotasCursoPorAnio(token, cursoId, anio) {
  void token
  const url = `${BASE}/curso/${encodeURIComponent(cursoId)}/notas/resumen?anio=${encodeURIComponent(anio)}`
  return httpClient.get(url)
}
