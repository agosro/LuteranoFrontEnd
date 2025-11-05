const API_URL = 'http://localhost:8080';

// Lista el historial completo del alumno. Requiere cicloLectivoId explícito.
export const listarHistorialAlumnoFiltrado = async (token, alumnoId, { cicloLectivoId = null, cursoId = null } = {}) => {
  try {
    if (cicloLectivoId == null) {
      throw new Error('Debe seleccionar un ciclo lectivo');
    }
    let url = `${API_URL}/historial-curso/alumno/${alumnoId}/historial-completo`;

    const params = [];
    params.push(`cicloLectivoId=${cicloLectivoId}`);
    if (cursoId) params.push(`cursoId=${cursoId}`);

    if (params.length > 0) {
      url += "?" + params.join("&");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      // Si no tiene curso aún, el backend puede responder 404/422: tratamos como historial vacío
      if (response.status === 404 || response.status === 422) {
        return { historialCursos: [] };
      }
      const base = data?.mensaje || `Error ${response.status}`;
      if (response.status === 403) throw new Error(`${base}: no autorizado (403)`);
      throw new Error(base || "Error al obtener historial completo");
    }

    return data;
  } catch (error) {
    console.error("Error en listarHistorialAlumnoFiltrado:", error);
    throw error;
  }
};

// Devuelve el historial vigente; si el backend responde 404/422, devolvemos null.
export const obtenerHistorialActualAlumno  = async (token, alumnoId) => {
  try {
    const response = await fetch(`${API_URL}/historial-curso/alumno/${alumnoId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      // Sin curso vigente también es un caso normal: devolvemos null en la propiedad esperada por el front
      if (response.status === 404 || response.status === 422) {
        return { historialCurso: null };
      }
      const base = data?.mensaje || `Error ${response.status}`;
      if (response.status === 403) throw new Error(`${base}: no autorizado (403)`);
      throw new Error(base || "Error al obtener historial actual");
    }
    return data;
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
    const url = `${API_URL}/historial-curso/${cursoId}/alumnos?cicloLectivoId=${cicloLectivoId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const base = data?.mensaje || `Error ${response.status}`;
      if (response.status === 403) throw new Error(`${base}: no autorizado (403)`);
      throw new Error(base || "Error al obtener alumnos del curso");
    }

    // Devuelve solo el array limpio, tolerando distintos formatos de respuesta
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.alumnos)) return data.alumnos;
    if (Array.isArray(data?.alumnosDtoList)) return data.alumnosDtoList;
    return [];
  } catch (error) {
    console.error("Error en listarAlumnosPorCurso:", error);
    throw error;
  }
};