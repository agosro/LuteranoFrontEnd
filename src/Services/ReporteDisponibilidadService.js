const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/reporteDisponibilidad`;

export const obtenerDisponibilidadDocente = async (token, docenteId) => {
  if (!docenteId) throw new Error('Falta docente');
  const res = await fetch(`${API_URL}/docentes/${encodeURIComponent(docenteId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.mensaje || `Error ${res.status}`);
  }
  return data; // { data: DocenteDisponibilidadDto, code?, mensaje? }
};

export default { obtenerDisponibilidadDocente };
