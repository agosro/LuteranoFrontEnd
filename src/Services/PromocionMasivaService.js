// src/Services/PromocionMasivaService.js
import { httpClient } from './httpClient'

// auth helpers ya no son necesarios: httpClient añade Authorization y maneja errores

// Ejecuta la promoción real (requiere ADMIN o DIRECTOR)
export const ejecutarPromocionMasiva = async (token, payload) => {
  void token
  const data = await httpClient.post('/api/promocion/masiva', payload)
  const code = data?.code
  if (typeof code === 'number' && code < 0) throw new Error(data?.mensaje || 'Error en la operación de promoción')
  return data
};

// Simula la promoción (accesible para PRECEPTOR también)
export const simularPromocionMasiva = async (token, payload) => {
  void token
  const data = await httpClient.post('/api/promocion/masiva/simulacion', payload)
  const code = data?.code
  if (typeof code === 'number' && code < 0) throw new Error(data?.mensaje || 'Error en la simulación de promoción')
  return data
};

export default {
  ejecutarPromocionMasiva,
  simularPromocionMasiva,
};
