const API_URL = "http://localhost:8080"; // Cambiá si usás otro host/puerto

// 🔹 Módulos del curso con estado (ocupado/libre) para un día
export const getModulosConEstadoPorDia = async (token, cursoId, dia) => {
  try {
    const response = await fetch(`${API_URL}/modulos/curso/${cursoId}/estado?dia=${dia}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.mensaje || "Error al obtener módulos con estado");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en getModulosConEstadoPorDia:", error);
    throw error;
  }
};

// 🔹 Módulos del curso con estado (ocupado/libre) para toda la semana
export const getModulosConEstadoSemana = async (token, cursoId) => {
  try {
    const response = await fetch(`${API_URL}/modulos/curso/${cursoId}/estado/semana`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.mensaje || "Error al obtener módulos de la semana");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en getModulosConEstadoSemana:", error);
    throw error;
  }
};

// 🔹 Módulos libres del curso en un día
export const getModulosLibresPorDia = async (token, cursoId, dia) => {
  try {
    const response = await fetch(`${API_URL}/modulos/curso/${cursoId}/libres?dia=${dia}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.mensaje || "Error al obtener módulos libres");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en getModulosLibresPorDia:", error);
    throw error;
  }
};

// 🔹 Módulos libres del curso en toda la semana
export const getModulosLibresSemana = async (token, cursoId) => {
  try {
    const response = await fetch(`${API_URL}/modulos/curso/${cursoId}/libres/semana`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.mensaje || "Error al obtener módulos libres de la semana");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en getModulosLibresSemana:", error);
    throw error;
  }
};

// 🔹 Módulos con estado de reserva para un espacio áulico y fecha específica
export const getModulosReservaEstado = async (token, espacioAulicoId, fecha) => {
  try {
    const params = new URLSearchParams({ espacioAulicoId, fecha });
    const response = await fetch(`${API_URL}/modulos/reservas/estado?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.mensaje || "Error al obtener estados de reserva de módulos");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en getModulosReservaEstado:", error);
    throw error;
  }
};
