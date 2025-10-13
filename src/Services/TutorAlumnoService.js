const API_URL = 'http://localhost:8080';

// Asignar tutor a alumno
export const asignarTutorAAlumno = async (token, tutorId, alumnoId) => {
  try {
    const response = await fetch(`${API_URL}/tutorAlumno/asignarTutor/${tutorId}/${alumnoId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const msg = data?.mensaje || `Error ${response.status}`;
      throw new Error(`Error al asignar tutor: ${msg}`);
    }
    return data;
  } catch (error) {
    console.error("Error al asignar tutor:", error);
    throw error;
  }
};

// Desasignar tutor de alumno
export const desasignarTutorDeAlumno = async (token, tutorId, alumnoId) => {
  try {
    const response = await fetch(`${API_URL}/tutorAlumno/desasignarTutor/${tutorId}/${alumnoId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const msg = data?.mensaje || `Error ${response.status}`;
      throw new Error(`Error al desasignar tutor: ${msg}`);
    }
    return data;
  } catch (error) {
    console.error("Error al desasignar tutor:", error);
    throw error;
  }
};

// 📌 Listar alumnos a cargo de un tutor
export const listarAlumnosACargo = async (token, tutorId) => {
  try {
    const response = await fetch(`${API_URL}/tutorAlumno/${tutorId}/alumnos`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok) {
      const mensaje = data?.mensaje || "Error al listar alumnos a cargo";
      throw new Error(mensaje);
    }

    // El backend devuelve AlumnoResponseList con el campo alumnoDtos
    return data?.alumnoDtos ?? [];
  } catch (error) {
    console.error("Error al listar alumnos a cargo:", error);
    throw error;
  }
};