const API_URL = 'http://localhost:8080';

// Lista el historial completo del alumno. Si no se indica cicloLectivoId, se usa 1 temporalmente.
export const listarHistorialAlumnoFiltrado = async (token, alumnoId, { cicloLectivoId = null, cursoId = null } = {}) => {
  try {
    let url = `${API_URL}/historial-curso/alumno/${alumnoId}/historial-completo`;

    const params = [];
    // Hardcode: si no viene cicloLectivoId, enviar 1 por ahora.
    params.push(`cicloLectivoId=${cicloLectivoId ?? 1}`);
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
      if (response.status === 404 || response.status === 422) {
        return { historialCursoDto: null };
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


// Lista los alumnos del curso (usa ciclo lectivo activo si no se especifica)
export const listarAlumnosPorCurso = async (token, cursoId, cicloLectivoId = null) => {
  try {
    // Alinear con lo que funciona en Postman: /historial-curso/{cursoId}/alumnos?cicloLectivoId=1
    const cl = cicloLectivoId ?? 1;
    const url = `${API_URL}/historial-curso/${cursoId}/alumnos?cicloLectivoId=${cl}`;

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