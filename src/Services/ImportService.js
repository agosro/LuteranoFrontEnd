import { httpClient } from './httpClient'
const BASE = '/api/import'
/**
 * Importa alumnos vía CSV.
 * @param {File} file Archivo CSV
 * @param {boolean} dryRun Si true, no persiste (prueba)
 * @param {string} token JWT
 */
export async function importarAlumnos(file, dryRun, token) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("dryRun", dryRun ? "true" : "false");
  formData.append("charset", "utf-8"); // forzado
  void token
  return httpClient.post(`${BASE}/alumnos`, formData)
}

export async function importarNotas(file, dryRun, token) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("dryRun", String(dryRun));
  void token
  return httpClient.post(`${BASE}/notas`, fd)
}

// Compat: versión con firma anterior (token primero)
export async function importarNotasCidi(token, file, { dryRun = true /*, charset*/ } = {}) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("dryRun", String(dryRun));
  // Siempre UTF-8: no enviamos charset
  void token
  return httpClient.post(`${BASE}/notas`, fd)
}