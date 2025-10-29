const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/reporteLibres/libres`;

export const fetchAlumnosLibres = async (anio, cursoId = null, token) => {
  const params = new URLSearchParams({ anio });
  if (cursoId) params.append('cursoId', cursoId);
  const url = `${API_URL}?${params.toString()}`;
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw errorData.mensaje || 'Error al cargar el reporte';
  }
  return await response.json();
};
