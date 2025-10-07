const API_URL = "http://localhost:8080"; // Cambiá si usás otro host/puerto

// 🔹 Asignar horarios (día + módulo) a una materia del curso
export const asignarHorario = async (token, cursoId, materiaId, slots) => {
  try {
    const response = await fetch(`${API_URL}/horarios/cursos/${cursoId}/materias/${materiaId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(slots),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.mensaje || "Error al asignar horarios");
    }

    return await response.json();
  } catch (error) {
    console.error("Error en asignarHorario:", error);
    throw error;
  }
};

// 🔹 Desasignar horarios (día + módulo) de una materia del curso
export const desasignarHorario = async (token, cursoId, materiaId, slots) => {
  try {
    const response = await fetch(`${API_URL}/horarios/cursos/${cursoId}/materias/${materiaId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(slots),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.mensaje || "Error al desasignar horarios");
    }

    return await response.json();
  } catch (error) {
    console.error("Error en desasignarHorario:", error);
    throw error;
  }
};
