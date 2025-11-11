import { httpClient } from './httpClient'

// 🔹 Módulos del curso con estado (ocupado/libre) para un día
export const getModulosConEstadoPorDia = async (token, cursoId, dia) => {
  try {
    void token
    const data = await httpClient.get(`/modulos/curso/${cursoId}/estado?dia=${dia}`)
    return data
  } catch (error) {
    console.error("Error en getModulosConEstadoPorDia:", error);
    throw error;
  }
};

// 🔹 Módulos del curso con estado (ocupado/libre) para toda la semana
export const getModulosConEstadoSemana = async (token, cursoId) => {
  try {
    void token
    const data = await httpClient.get(`/modulos/curso/${cursoId}/estado/semana`)
    return data
  } catch (error) {
    console.error("Error en getModulosConEstadoSemana:", error);
    throw error;
  }
};

// 🔹 Módulos libres del curso en un día
export const getModulosLibresPorDia = async (token, cursoId, dia) => {
  try {
    void token
    const data = await httpClient.get(`/modulos/curso/${cursoId}/libres?dia=${dia}`)
    return data
  } catch (error) {
    console.error("Error en getModulosLibresPorDia:", error);
    throw error;
  }
};

// 🔹 Módulos libres del curso en toda la semana
export const getModulosLibresSemana = async (token, cursoId) => {
  try {
    void token
    const data = await httpClient.get(`/modulos/curso/${cursoId}/libres/semana`)
    return data
  } catch (error) {
    console.error("Error en getModulosLibresSemana:", error);
    throw error;
  }
};

// 🔹 Módulos con estado de reserva para un espacio áulico y fecha específica
export const getModulosReservaEstado = async (token, espacioAulicoId, fecha) => {
  try {
    void token
    const params = new URLSearchParams({ espacioAulicoId, fecha });
    const data = await httpClient.get(`/modulos/reservas/estado?${params.toString()}`)
    return data
  } catch (error) {
    console.error("Error en getModulosReservaEstado:", error);
    throw error;
  }
};
