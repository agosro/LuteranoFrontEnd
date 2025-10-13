const API_URL = 'http://localhost:8080';

// GET /reporteRinde/cursos/{cursoId}/rinden?anio=YYYY
export const listarRindenPorCurso = async (token, { cursoId, anio }) => {
  if (!cursoId) throw new Error('cursoId es obligatorio');
  if (!anio) throw new Error('anio es obligatorio');
  const url = `${API_URL}/reporteRinde/cursos/${cursoId}/rinden?anio=${encodeURIComponent(anio)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const base = data?.mensaje || `Error ${response.status}`;
      if (response.status === 403) throw new Error(`${base}: no autorizado (403)`);
      throw new Error(base || 'Error al obtener reporte de rinden');
    }
    return data; // ReporteRindenResponse
  } catch (err) {
    console.error('Error en listarRindenPorCurso:', err);
    throw err;
  }
};
