const API_URL = 'http://localhost:8080';

// GET /reportesTardanza/curso/{cursoId}?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&limit=N
export const listarTardanzasPorCurso = async (token, { cursoId, desde, hasta, limit } = {}) => {
  if (!cursoId) throw new Error('cursoId es obligatorio');
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (limit != null) params.set('limit', String(limit));
  const url = `${API_URL}/reportesTardanza/curso/${cursoId}${params.toString() ? `?${params.toString()}` : ''}`;
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
      throw new Error(base || 'Error al obtener reporte de tardanzas por curso');
    }
    return Array.isArray(data?.items) ? data.items : [];
  } catch (err) {
    console.error('Error en listarTardanzasPorCurso:', err);
    throw err;
  }
};

// GET /reportesTardanza/todos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&limit=N
export const listarTardanzasTodos = async (token, { desde, hasta, limit } = {}) => {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (limit != null) params.set('limit', String(limit));
  const url = `${API_URL}/reportesTardanza/todos${params.toString() ? `?${params.toString()}` : ''}`;
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
      throw new Error(base || 'Error al obtener reporte de tardanzas');
    }
    return Array.isArray(data?.items) ? data.items : [];
  } catch (err) {
    console.error('Error en listarTardanzasTodos:', err);
    throw err;
  }
};
