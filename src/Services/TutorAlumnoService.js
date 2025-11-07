import { httpClient } from './httpClient'

// Asignar tutor a alumno
export const asignarTutorAAlumno = async (token, tutorId, alumnoId) => {
  try {
    void token
    return await httpClient.post(`/api/tutorAlumno/asignarTutor/${tutorId}/${alumnoId}`)
  } catch (error) {
    console.error("Error al asignar tutor:", error);
    throw error;
  }
};

// Desasignar tutor de alumno
export const desasignarTutorDeAlumno = async (token, tutorId, alumnoId) => {
  try {
    void token
    return await httpClient.post(`/api/tutorAlumno/desasignarTutor/${tutorId}/${alumnoId}`)
  } catch (error) {
    console.error("Error al desasignar tutor:", error);
    throw error;
  }
};

// 📌 Listar alumnos a cargo de un tutor
export const listarAlumnosACargo = async (token, tutorId) => {
  try {
    void token
    const data = await httpClient.get(`/api/tutorAlumno/${tutorId}/alumnos`)
    return data?.alumnoDtos ?? []
  } catch (error) {
    console.error("Error al listar alumnos a cargo:", error);
    throw error;
  }
};