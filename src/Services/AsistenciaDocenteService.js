const API_URL = 'http://localhost:8080';

// POST: Crea o actualiza una asistencia de docente (upsert)
// req: { docenteId, fecha (YYYY-MM-DD), estado: 'PRESENTE'|'AUSENTE'|'TARDE'|'JUSTIFICADO', observacion? }
export const upsertAsistenciaDocente = async (token, req) => {
  try {
    const response = await fetch(`${API_URL}/asistencia-docente/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(req),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const base = data?.mensaje || `Error ${response.status}`;
      if (response.status === 403) throw new Error(`${base}: no autorizado (403)`);
      throw new Error(base || 'Error al guardar asistencia del docente');
    }

    return data; // { asistenciaDocenteDto, code, mensaje }
  } catch (error) {
    console.error('Error en upsertAsistenciaDocente:', error);
    throw error;
  }
};

// GET: Lista asistencias de todos los docentes en una fecha
export const listarAsistenciasDocentesPorFecha = async (token, fechaISO) => {
  try {
    const response = await fetch(`${API_URL}/asistencia-docente/fecha?fecha=${encodeURIComponent(fechaISO)}`, {
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
      throw new Error(base || 'Error al listar asistencias de docentes');
    }

    return Array.isArray(data?.items) ? data.items : [];
  } catch (error) {
    console.error('Error en listarAsistenciasDocentesPorFecha:', error);
    throw error;
  }
};

// GET: Lista asistencias de un docente en una fecha
export const listarAsistenciasPorDocenteYFecha = async (token, docenteId, fechaISO) => {
  try {
    const response = await fetch(`${API_URL}/asistencia-docente/docente/${docenteId}?fecha=${encodeURIComponent(fechaISO)}`, {
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
      throw new Error(base || 'Error al listar asistencia del docente');
    }

    return Array.isArray(data?.items) ? data.items : [];
  } catch (error) {
    console.error('Error en listarAsistenciasPorDocenteYFecha:', error);
    throw error;
  }
};

export const ESTADOS_ASISTENCIA_DOCENTE = [
  'PRESENTE',
  'AUSENTE',
  'TARDE',
  'JUSTIFICADO',
];
