// src/Services/PromocionMasivaService.js
const API_URL = 'http://localhost:8080';

const auth = (token) => ({ 'Authorization': `Bearer ${token}` });
const authJson = (token) => ({ 'Content-Type': 'application/json', ...auth(token) });

const okOrThrow = async (res) => {
  let data = null;
  try { data = await res.json(); } catch { /* ignore parse error */ }
  const code = data?.code;
  if (!res.ok || (typeof code === 'number' && code < 0)) {
    const msg = data?.mensaje || 'Error en la operación de promoción';
    throw new Error(msg);
  }
  return data ?? {};
};

// Ejecuta la promoción real (requiere ADMIN o DIRECTOR)
export const ejecutarPromocionMasiva = async (token, payload) => {
  const res = await fetch(`${API_URL}/promocion/masiva`, {
    method: 'POST',
    headers: authJson(token),
    body: JSON.stringify(payload)
  });
  return okOrThrow(res);
};

// Simula la promoción (accesible para PRECEPTOR también)
export const simularPromocionMasiva = async (token, payload) => {
  const res = await fetch(`${API_URL}/promocion/masiva/simulacion`, {
    method: 'POST',
    headers: authJson(token),
    body: JSON.stringify(payload)
  });
  return okOrThrow(res);
};

export default {
  ejecutarPromocionMasiva,
  simularPromocionMasiva,
};
