const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function obtenerInformeAnualAlumno(token, alumnoId, anio) {
  if (!token) throw new Error('Sin token');
  const url = `${API_BASE}/reporteAnual/alumnos/${alumnoId}?anio=${encodeURIComponent(anio)}`;
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || (data?.code && data.code < 0)) {
    const msg = data?.mensaje || `Error ${resp.status}`;
    throw new Error(msg);
  }
  return data; // ReporteAnualAlumnoResponse { data, code, mensaje }
}
