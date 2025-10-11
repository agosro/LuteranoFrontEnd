const API_URL = "http://localhost:8080";
const BASE = `${API_URL}/reporteNotas`;

// GET /reporteNotas/alumnos/{alumnoId}/notas/resumen?anio=YYYY
export async function resumenNotasAlumnoPorAnio(token, alumnoId, anio) {
  const url = `${BASE}/alumnos/${encodeURIComponent(alumnoId)}/notas/resumen?anio=${encodeURIComponent(anio)}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await resp.text();
  const data = text ? JSON.parse(text) : null;
  if (!resp.ok) {
    const base = data?.mensaje || `Error ${resp.status}`;
    throw new Error(base);
  }
  return data; // CalificacionesAlumnoAnioResponse
}

export default {
  resumenNotasAlumnoPorAnio,
};

// GET /reporteNotas/curso/{cursoId}/notas/resumen?anio=YYYY
export async function resumenNotasCursoPorAnio(token, cursoId, anio) {
  const url = `${BASE}/curso/${encodeURIComponent(cursoId)}/notas/resumen?anio=${encodeURIComponent(anio)}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await resp.text();
  const data = text ? JSON.parse(text) : null;
  if (!resp.ok) {
    const base = data?.mensaje || `Error ${resp.status}`;
    throw new Error(base);
  }
  return data; // CalificacionesCursoAnioResponse
}
