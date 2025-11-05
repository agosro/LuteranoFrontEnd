const API_URL = "http://localhost:8080";
const BASE = `${API_URL}/notas-finales`;

// GET /notas-finales/simple/alumno/{alumnoId}/materia/{materiaId}?anio=YYYY
export async function obtenerNotaFinalSimple(token, alumnoId, materiaId, anio) {
  const url = `${BASE}/simple/alumno/${encodeURIComponent(alumnoId)}/materia/${encodeURIComponent(materiaId)}?anio=${encodeURIComponent(anio)}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await resp.text();
  const data = text ? JSON.parse(text) : null;
  if (!resp.ok) {
    const base = data?.mensaje || `Error ${resp.status}`;
    throw new Error(base);
  }
  // Expected shape: { code, mensaje, notaFinal, alumnoId, materiaId, anio }
  return data;
}

// GET /notas-finales/alumno/{alumnoId}/materia/{materiaId}?anio=YYYY
export async function obtenerNotaFinalDetallada(token, alumnoId, materiaId, anio) {
  const url = `${BASE}/alumno/${encodeURIComponent(alumnoId)}/materia/${encodeURIComponent(materiaId)}?anio=${encodeURIComponent(anio)}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await resp.text();
  const data = text ? JSON.parse(text) : null;
  if (!resp.ok) {
    const base = data?.mensaje || `Error ${resp.status}`;
    throw new Error(base);
  }
  // Expected shape: { code, mensaje, notaFinal, origen, promedioGeneral, mesaExamenId, alumnoId, materiaId, anio }
  return data;
}

export default {
  obtenerNotaFinalSimple,
  obtenerNotaFinalDetallada,
};
