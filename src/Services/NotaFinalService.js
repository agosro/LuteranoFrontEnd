import { httpClient } from './httpClient'
const BASE = `/notas-finales`;

// GET /notas-finales/simple/alumno/{alumnoId}/materia/{materiaId}?anio=YYYY
export async function obtenerNotaFinalSimple(token, alumnoId, materiaId, anio) {
  void token
  const url = `${BASE}/simple/alumno/${encodeURIComponent(alumnoId)}/materia/${encodeURIComponent(materiaId)}?anio=${encodeURIComponent(anio)}`;
  const data = await httpClient.get(url)
  return data
}

// GET /notas-finales/alumno/{alumnoId}/materia/{materiaId}?anio=YYYY
export async function obtenerNotaFinalDetallada(token, alumnoId, materiaId, anio) {
  void token
  const url = `${BASE}/alumno/${encodeURIComponent(alumnoId)}/materia/${encodeURIComponent(materiaId)}?anio=${encodeURIComponent(anio)}`;
  const data = await httpClient.get(url)
  return data
}

export default {
  obtenerNotaFinalSimple,
  obtenerNotaFinalDetallada,
};
