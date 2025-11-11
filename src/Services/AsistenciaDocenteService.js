import { httpClient } from './httpClient'

// POST: Crea o actualiza una asistencia de docente (upsert)
// req: { docenteId, fecha (YYYY-MM-DD), estado: 'PRESENTE'|'AUSENTE'|'TARDE'|'JUSTIFICADO', observacion? }
export const upsertAsistenciaDocente = async (token, req) => {
  try {
    void token
    try {
      const data = await httpClient.post('/asistencia-docente/upsert', req)
      return data
    } catch (e) {
      if (e.status === 403) throw new Error('No autorizado (403)')
      throw e
    }
  } catch (error) {
    console.error('Error en upsertAsistenciaDocente:', error);
    throw error;
  }
};

// GET: Lista asistencias de todos los docentes en una fecha
export const listarAsistenciasDocentesPorFecha = async (token, fechaISO) => {
  try {
    void token
    try {
      const data = await httpClient.get(`/asistencia-docente/fecha?fecha=${encodeURIComponent(fechaISO)}`)
      return Array.isArray(data?.items) ? data.items : []
    } catch (e) {
      if (e.status === 403) throw new Error('No autorizado (403)')
      throw e
    }
  } catch (error) {
    console.error('Error en listarAsistenciasDocentesPorFecha:', error);
    throw error;
  }
};

// GET: Lista asistencias de un docente en una fecha
export const listarAsistenciasPorDocenteYFecha = async (token, docenteId, fechaISO) => {
  try {
    void token
    try {
      const data = await httpClient.get(`/asistencia-docente/docente/${docenteId}?fecha=${encodeURIComponent(fechaISO)}`)
      return Array.isArray(data?.items) ? data.items : []
    } catch (e) {
      if (e.status === 403) throw new Error('No autorizado (403)')
      throw e
    }
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
