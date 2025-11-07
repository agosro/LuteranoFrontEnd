import { httpClient } from './httpClient'

// Lista el historial completo del alumno. Requiere cicloLectivoId explícito.
export const listarHistorialAlumnoFiltrado = async (token, alumnoId, { cicloLectivoId = null, cursoId = null } = {}) => {
  try {
    if (cicloLectivoId == null) {
      throw new Error('Debe seleccionar un ciclo lectivo');
    }
    let url = `/api/historial-curso/alumno/${alumnoId}/historial-completo`;

    const params = [];
    params.push(`cicloLectivoId=${cicloLectivoId}`);
    if (cursoId) params.push(`cursoId=${cursoId}`);

    if (params.length > 0) {
      url += "?" + params.join("&");
    }

    void token
    try {
      const data = await httpClient.get(url)
      return data
    } catch (e) {
      if (e.status && [404, 422].includes(e.status)) {
        return { historialCursos: [] }
      }
      throw e
    }
  } catch (error) {
    console.error("Error en listarHistorialAlumnoFiltrado:", error);
    throw error;
  }
};

// Devuelve el historial vigente; si el backend responde 404/422, devolvemos null.
export const obtenerHistorialActualAlumno  = async (token, alumnoId) => {
  try {
    void token
    try {
      const data = await httpClient.get(`/api/historial-curso/alumno/${alumnoId}`)
      return data
    } catch (e) {
      if (e.status && [404, 422].includes(e.status)) {
        return { historialCurso: null }
      }
      throw e
    }
  } catch (error) {
    console.error("Error en obtenerHistorialActualAlumno :", error);
    throw error;
  }
};


// Lista los alumnos del curso: requiere ciclo lectivo explícito
export const listarAlumnosPorCurso = async (token, cursoId, cicloLectivoId = null) => {
  try {
    if (cicloLectivoId == null) {
      throw new Error('Debe seleccionar un ciclo lectivo');
    }
    const url = `/api/historial-curso/${cursoId}/alumnos?cicloLectivoId=${cicloLectivoId}`;
    void token
    try {
      const data = await httpClient.get(url)
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.alumnos)) return data.alumnos
      if (Array.isArray(data?.alumnosDtoList)) return data.alumnosDtoList
      return []
    } catch (e) {
      if (e.status === 403) throw new Error('Error 403: no autorizado')
      throw e
    }
  } catch (error) {
    console.error("Error en listarAlumnosPorCurso:", error);
    throw error;
  }
};