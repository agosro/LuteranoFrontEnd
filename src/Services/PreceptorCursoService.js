const API_URL = "http://localhost:8080";

// 📌 Asignar preceptor a curso
export const asignarPreceptorACurso = async (token, preceptorId, cursoId) => {
  try {
    const response = await fetch(
      `${API_URL}/preceptorCurso/asignarPreceptor/${preceptorId}/${cursoId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) throw new Error("Error al asignar preceptor al curso");
    return await response.json();
  } catch (error) {
    console.error("Error en asignarPreceptorACurso:", error);
    throw error;
  }
};

// 📌 Desasignar preceptor de curso
export const desasignarPreceptorDeCurso = async (token, preceptorId, cursoId) => {
  try {
    const response = await fetch(
      `${API_URL}/preceptorCurso/desasignarPreceptor/${preceptorId}/${cursoId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) throw new Error("Error al desasignar preceptor del curso");
    return await response.json();
  } catch (error) {
    console.error("Error en desasignarPreceptorDeCurso:", error);
    throw error;
  }
};
