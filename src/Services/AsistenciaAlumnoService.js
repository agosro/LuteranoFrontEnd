import { httpClient } from './httpClient'

// GET: Lista la asistencia de un curso en una fecha
export const listarAsistenciaCursoPorFecha = async (token, cursoId, fechaISO) => {
  try {
    void token
    try {
      const data = await httpClient.get(`/api/asistencia/alumnos/curso/${cursoId}?fecha=${encodeURIComponent(fechaISO)}`)
      return Array.isArray(data?.items) ? data.items : []
    } catch (e) {
      if (e.status === 403) throw new Error('No autorizado (403)')
      throw e
    }
  } catch (error) {
    console.error('Error en listarAsistenciaCursoPorFecha:', error);
    throw error;
  }
};

// POST: Registra/actualiza asistencia del curso en una fecha (bulk)
// req: { cursoId, fecha (YYYY-MM-DD), presentesIds: number[], overridesPorAlumnoId: { [alumnoId]: 'PRESENTE'|'AUSENTE'|'TARDE'|'CON_LICENCIA'|'JUSTIFICADO' } }
export const registrarAsistenciaCurso = async (token, req) => {
  try {
    void token
    try {
      const data = await httpClient.post('/api/asistencia/alumnos/curso', req)
      return data
    } catch (e) {
      if (e.status === 403) throw new Error('No autorizado (403)')
      throw e
    }
  } catch (error) {
    console.error('Error en registrarAsistenciaCurso:', error);
    throw error;
  }
};

// PUT: Actualiza la asistencia puntual de un alumno (upsert por alumnoId+fecha)
// req: { alumnoId, fecha (YYYY-MM-DD), estado, observacion }
export const actualizarAsistenciaAlumno = async (token, req) => {
  try {
    void token
    try {
      const data = await httpClient.put('/api/asistencia/alumnos/update', req)
      return data
    } catch (e) {
      if (e.status === 403) throw new Error('No autorizado (403)')
      throw e
    }
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
