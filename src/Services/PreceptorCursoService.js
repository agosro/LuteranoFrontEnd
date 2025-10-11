const API_URL = "http://localhost:8080";

const parseCursoResponse = async (response, defaultErrorMsg) => {
  let body = null;
  try { body = await response.json(); } catch { /* ignorar parse json */ }
  if (!response.ok) {
    const msg = body?.mensaje || defaultErrorMsg;
    throw new Error(msg);
  }
  if (body && typeof body.code !== 'undefined' && body.code < 0) {
    throw new Error(body.mensaje || defaultErrorMsg);
  }
  return body;
};

// Asignar preceptor a curso
export const asignarPreceptorACurso = async (token, cursoId, preceptorId) => {
  try {
    const response = await fetch(
      `${API_URL}/preceptorCurso/${cursoId}/preceptor/${preceptorId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return await parseCursoResponse(response, "Error al asignar preceptor al curso");
  } catch (error) {
    console.error("Error en asignarPreceptorACurso:", error);
    throw error;
  }
};

// Desasignar preceptor de curso
export const desasignarPreceptorDeCurso = async (token, cursoId) => {
  try {
    const response = await fetch(
      `${API_URL}/preceptorCurso/${cursoId}/preceptor`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return await parseCursoResponse(response, "Error al desasignar preceptor del curso");
  } catch (error) {
    console.error("Error en desasignarPreceptorDeCurso:", error);
    throw error;
  }
};
