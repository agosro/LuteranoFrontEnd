const API_URL = 'http://localhost:8080';

// GET: Lista la asistencia de un curso en una fecha
export const listarAsistenciaCursoPorFecha = async (token, cursoId, fechaISO) => {
  try {
    const response = await fetch(`${API_URL}/asistencia/alumnos/curso/${cursoId}?fecha=${encodeURIComponent(fechaISO)}`, {
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
      throw new Error(base || 'Error al listar asistencia');
    }

    // Respuesta backend: { items: AsistenciaAlumnoDto[], code, mensaje }
    return Array.isArray(data?.items) ? data.items : [];
  } catch (error) {
    console.error('Error en listarAsistenciaCursoPorFecha:', error);
    throw error;
  }
};

// POST: Registra/actualiza asistencia del curso en una fecha (bulk)
// req: { cursoId, fecha (YYYY-MM-DD), presentesIds: number[], overridesPorAlumnoId: { [alumnoId]: 'PRESENTE'|'AUSENTE'|'TARDE'|'CON_LICENCIA'|'JUSTIFICADO' } }
export const registrarAsistenciaCurso = async (token, req) => {
  try {
    const response = await fetch(`${API_URL}/asistencia/alumnos/curso`, {
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
      throw new Error(base || 'Error al registrar asistencia');
    }

    return data; // { items, code, mensaje }
  } catch (error) {
    console.error('Error en registrarAsistenciaCurso:', error);
    throw error;
  }
};

// PUT: Actualiza la asistencia puntual de un alumno (upsert por alumnoId+fecha)
// req: { alumnoId, fecha (YYYY-MM-DD), estado, observacion }
export const actualizarAsistenciaAlumno = async (token, req) => {
  try {
    const response = await fetch(`${API_URL}/asistencia/alumnos/update`, {
      method: 'PUT',
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
      throw new Error(base || 'Error al actualizar asistencia');
    }

    return data; // { asistenciaAlumnoDto, code, mensaje }
  } catch (error) {
    console.error('Error en actualizarAsistenciaAlumno:', error);
    throw error;
  }
};

export const ESTADOS_ASISTENCIA = [
  'PRESENTE',
  'AUSENTE',
  'TARDE',
  'CON_LICENCIA',
  'JUSTIFICADO',
];
