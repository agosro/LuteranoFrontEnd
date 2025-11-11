import { httpClient } from './httpClient'

// Helper para normalizar respuesta de Alumno (unifica códigos 0 y 200)
const normalizarAlumnoResponse = (data) => {
  if (!data) return { success: false, alumno: null, message: 'Sin datos', raw: data };
  const code = data.code;
  const success = code === 0 || code === 200;
  return {
    success,
    alumno: data.alumno ?? null,
    message: data.mensaje ?? '',
    raw: data
  };
};

// Asignar tutor a alumno
export const asignarTutorAAlumno = async (token, tutorId, alumnoId) => {
  try {
    void token;
    const data = await httpClient.post(`/tutorAlumno/asignarTutor/${tutorId}/${alumnoId}`);
    return normalizarAlumnoResponse(data);
  } catch (error) {
    console.error('Error al asignar tutor:', error);
    throw error;
  }
};

// Desasignar tutor de alumno
export const desasignarTutorDeAlumno = async (token, tutorId, alumnoId) => {
  try {
    void token;
    const data = await httpClient.post(`/tutorAlumno/desasignarTutor/${tutorId}/${alumnoId}`);
    return normalizarAlumnoResponse(data);
  } catch (error) {
    console.error('Error al desasignar tutor:', error);
    throw error;
  }
};

// 📌 Listar alumnos a cargo de un tutor
export const listarAlumnosACargo = async (token, tutorId) => {
  try {
    void token;
    const data = await httpClient.get(`/tutorAlumno/${tutorId}/alumnos`);
    return data?.alumnoDtos ?? [];
  } catch (error) {
    console.error('Error al listar alumnos a cargo:', error);
    throw error;
  }
};

// 🆕 Asignar múltiples tutores a un alumno
export const asignarMultiplesTutores = async (token, alumnoId, tutorIds) => {
  try {
    void token;
    const data = await httpClient.post('/tutorAlumno/asignar-multiples-tutores', { alumnoId, tutorIds });
    return normalizarAlumnoResponse(data);
  } catch (error) {
    console.error('Error al asignar múltiples tutores:', error);
    throw error;
  }
};

// 🆕 Desasignar múltiples tutores de un alumno
export const desasignarMultiplesTutores = async (token, alumnoId, tutorIds) => {
  try {
    void token;
    const data = await httpClient.post('/tutorAlumno/desasignar-multiples-tutores', { alumnoId, tutorIds });
    return normalizarAlumnoResponse(data);
  } catch (error) {
    console.error('Error al desasignar múltiples tutores:', error);
    throw error;
  }
};

// 🆕 Helper para actualizar lista local tras asignaciones/desasignaciones
export const mergeTutoresEnAlumno = (alumno, nuevosTutores) => {
  if (!alumno) return alumno;
  const existentes = alumno.tutores || [];
  const mapa = new Map(existentes.map(t => [t.id, t]));
  nuevosTutores.forEach(t => mapa.set(t.id, t));
  return { ...alumno, tutores: Array.from(mapa.values()) };
};

export const removerTutoresDeAlumno = (alumno, tutorIds) => {
  if (!alumno) return alumno;
  return { ...alumno, tutores: (alumno.tutores || []).filter(t => !tutorIds.includes(t.id)) };
};