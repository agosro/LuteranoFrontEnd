const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/reporteAsistenciaPerfecta`;

export const obtenerAsistenciaPerfecta = async (token, anio) => {
  const url = `${API_URL}?anio=${encodeURIComponent(anio)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.mensaje || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
};

export default {
  obtenerAsistenciaPerfecta,
};
