// src/Services/TutorService.js
const API_URL = 'http://localhost:8080';

// 📌 Listar todos los tutores
export const listarTutores = async (token) => {
  try {
    const response = await fetch(`${API_URL}/tutor/list`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Error al listar tutores");

    const data = await response.json();
    return data.tutores || []; // 👈 devolvemos siempre un array
  } catch (error) {
    console.error("Error al listar tutores:", error);
    throw error;
  }
};

// 📌 Crear tutor
export const crearTutor = async (tutor, token) => {
  try {
    const response = await fetch(`${API_URL}/tutor/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tutor),
    });

    if (!response.ok) throw new Error("Error al crear tutor");
    return await response.json();
  } catch (error) {
    console.error("Error al crear tutor:", error);
    throw error;
  }
};

// 📌 Actualizar tutor
export const editarTutor = async (tutor, token) => {
  try {
    const response = await fetch(`${API_URL}/tutor/update`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tutor),
    });

    if (!response.ok) throw new Error("Error al actualizar tutor");
    return await response.json();
  } catch (error) {
    console.error("Error al actualizar tutor:", error);
    throw error;
  }
};

// 📌 Eliminar tutor por ID
export const eliminarTutor = async (id, token) => {
  try {
    const response = await fetch(`${API_URL}/tutor/delete/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Error al eliminar tutor");
    return await response.json();
  } catch (error) {
    console.error("Error al eliminar tutor:", error);
    throw error;
  }
};