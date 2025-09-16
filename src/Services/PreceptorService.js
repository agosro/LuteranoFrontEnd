const API_URL = 'http://localhost:8080';

// 📌 Listar todos los preceptores
export const listarPreceptores = async (token) => {
  try {
    const response = await fetch(`${API_URL}/preceptor/list`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Error al listar preceptores");
    return await response.json();
  } catch (error) {
    console.error("Error al listar preceptores:", error);
    throw error;
  }
};

// 📌 Crear preceptor
export const crearPreceptor = async (preceptor, token) => {
  try {
    const response = await fetch(`${API_URL}/preceptor/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preceptor),
    });

    if (!response.ok) throw new Error("Error al crear preceptor");
    return await response.json();
  } catch (error) {
    console.error("Error al crear preceptor:", error);
    throw error;
  }
};

// 📌 Actualizar preceptor
export const editarPreceptor = async (preceptor, token) => {
  try {
    const response = await fetch(`${API_URL}/preceptor/update`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preceptor),
    });

    if (!response.ok) throw new Error("Error al actualizar preceptor");
    return await response.json();
  } catch (error) {
    console.error("Error al actualizar preceptor:", error);
    throw error;
  }
};

// 📌 Eliminar preceptor por ID
export const eliminarPreceptor = async (id, token) => {
  try {
    const response = await fetch(`${API_URL}/preceptor/delete/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Error al eliminar preceptor");
    return await response.json();
  } catch (error) {
    console.error("Error al eliminar preceptor:", error);
    throw error;
  }
};