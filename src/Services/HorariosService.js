import { httpClient } from './httpClient'

// 🔹 Asignar horarios (día + módulo) a una materia del curso
export const asignarHorario = async (token, cursoId, materiaId, slots) => {
  try {
    void token
    const data = await httpClient.post(`/api/horarios/cursos/${cursoId}/materias/${materiaId}`, slots)
    return data
  } catch (error) {
    console.error("Error en asignarHorario:", error);
    throw error;
  }
};

// 🔹 Desasignar horarios (día + módulo) de una materia del curso
export const desasignarHorario = async (token, cursoId, materiaId, slots) => {
  try {
    void token
    const data = await httpClient.delete(`/api/horarios/cursos/${cursoId}/materias/${materiaId}`, { body: slots })
    return data
  } catch (error) {
    console.error("Error en desasignarHorario:", error);
    throw error;
  }
};
